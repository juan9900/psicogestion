// Lógica de agregación pura para la página de análisis. Sin React ni
// Supabase, para poder testearla con filas de ejemplo (ver
// analisis-datos.test.ts). La página server component solo trae filas
// crudas y llama a estas funciones.

import { CANALES } from "@/lib/site";

export type CitaAnalisis = {
  fecha: string; // YYYY-MM-DD
  estado: string; // 'pendiente' | 'confirmada' | 'cancelada'
  modalidad: string; // 'online' | 'presencial'
  monto: number | null;
  pagado: boolean;
  veces_reagendada: number;
  canal: string | null; // valor de CANALES, o null si no se indicó
};

export type OrdenAnalisis = {
  monto: number;
  estado: string; // 'pendiente' | 'pagada' | 'entregada' | 'rechazada'
  metodo_pago: string;
  recurso_id: string;
  created_at: string;
  confirmado_at: string | null;
  recursos: { titulo: string; categoria: string | null } | null;
};

export type RecursoAnalisis = {
  id: string;
  titulo: string;
  categoria: string | null;
  activo: boolean;
};

// Estados de orden que representan una venta confirmada (ver architecture.md).
const ESTADOS_VENTA = new Set(["pagada", "entregada"]);

export type ResumenCitas = {
  total: number;
  pendientes: number;
  confirmadas: number;
  canceladas: number;
  reagendadas: number;
  online: number;
  presencial: number;
  ingresos: number;
};

export function resumenCitas(citas: CitaAnalisis[]): ResumenCitas {
  const r: ResumenCitas = {
    total: citas.length,
    pendientes: 0,
    confirmadas: 0,
    canceladas: 0,
    reagendadas: 0,
    online: 0,
    presencial: 0,
    ingresos: 0,
  };
  for (const c of citas) {
    if (c.estado === "pendiente") r.pendientes++;
    else if (c.estado === "confirmada") r.confirmadas++;
    else if (c.estado === "cancelada") r.canceladas++;
    if (c.veces_reagendada > 0) r.reagendadas++;
    if (c.modalidad === "online") r.online++;
    else if (c.modalidad === "presencial") r.presencial++;
    if (c.pagado && c.monto) r.ingresos += c.monto;
  }
  return r;
}

export type ResumenTienda = {
  ventas: number;
  ingresos: number;
  porMetodo: { metodo: string; ingresos: number; ventas: number }[];
  porCategoria: { categoria: string; ingresos: number; ventas: number }[];
};

export function resumenTienda(ordenes: OrdenAnalisis[]): ResumenTienda {
  const vendidas = ordenes.filter((o) => ESTADOS_VENTA.has(o.estado));

  const porMetodoMap = new Map<string, { ingresos: number; ventas: number }>();
  const porCategoriaMap = new Map<string, { ingresos: number; ventas: number }>();

  let ingresos = 0;
  for (const o of vendidas) {
    ingresos += o.monto;

    const metodo = porMetodoMap.get(o.metodo_pago) ?? { ingresos: 0, ventas: 0 };
    metodo.ingresos += o.monto;
    metodo.ventas += 1;
    porMetodoMap.set(o.metodo_pago, metodo);

    const categoria = o.recursos?.categoria ?? "Sin categoría";
    const cat = porCategoriaMap.get(categoria) ?? { ingresos: 0, ventas: 0 };
    cat.ingresos += o.monto;
    cat.ventas += 1;
    porCategoriaMap.set(categoria, cat);
  }

  return {
    ventas: vendidas.length,
    ingresos,
    porMetodo: Array.from(porMetodoMap, ([metodo, v]) => ({ metodo, ...v })).sort(
      (a, b) => b.ingresos - a.ingresos
    ),
    porCategoria: Array.from(porCategoriaMap, ([categoria, v]) => ({ categoria, ...v })).sort(
      (a, b) => b.ingresos - a.ingresos
    ),
  };
}

// Citas y ventas de recursos se muestran en gráficas separadas: son negocios
// distintos y mezclarlos en una sola serie confundía la lectura.
export type PuntoMensual = {
  mes: string; // YYYY-MM
  citas: number;
  ingresosCitas: number;
  ventas: number;
  ingresosTienda: number;
};

export function serieMensual(citas: CitaAnalisis[], ordenes: OrdenAnalisis[]): PuntoMensual[] {
  const meses = new Map<string, PuntoMensual>();

  const get = (mes: string) => {
    let p = meses.get(mes);
    if (!p) {
      p = { mes, citas: 0, ingresosCitas: 0, ventas: 0, ingresosTienda: 0 };
      meses.set(mes, p);
    }
    return p;
  };

  for (const c of citas) {
    const mes = c.fecha.slice(0, 7);
    const p = get(mes);
    p.citas += 1;
    if (c.pagado && c.monto) p.ingresosCitas += c.monto;
  }

  for (const o of ordenes) {
    if (!ESTADOS_VENTA.has(o.estado)) continue;
    const mes = (o.confirmado_at ?? o.created_at).slice(0, 7);
    const p = get(mes);
    p.ventas += 1;
    p.ingresosTienda += o.monto;
  }

  return Array.from(meses.values()).sort((a, b) => a.mes.localeCompare(b.mes));
}

export type TopRecurso = {
  titulo: string;
  ventas: number;
  ingresos: number;
};

export function topRecursos(ordenes: OrdenAnalisis[], recursos: RecursoAnalisis[]): TopRecurso[] {
  const titulos = new Map(recursos.map((r) => [r.id, r.titulo]));
  const porRecurso = new Map<string, TopRecurso>();

  for (const o of ordenes) {
    if (!ESTADOS_VENTA.has(o.estado)) continue;
    const titulo = o.recursos?.titulo ?? titulos.get(o.recurso_id) ?? "Recurso eliminado";
    const t = porRecurso.get(titulo) ?? { titulo, ventas: 0, ingresos: 0 };
    t.ventas += 1;
    t.ingresos += o.monto;
    porRecurso.set(titulo, t);
  }

  return Array.from(porRecurso.values()).sort((a, b) => b.ingresos - a.ingresos);
}

// ¿De dónde vienen las consultas? Agrupa las citas por canal de adquisición.
// Los valores sin canal (null o vacío) se muestran como "Sin especificar".
const CANAL_LABEL: Record<string, string> = Object.fromEntries(
  CANALES.map((c) => [c.valor, c.label])
);
const SIN_CANAL = "Sin especificar";

export type PuntoCanal = {
  canal: string; // etiqueta legible
  valor: number; // número de citas
};

export function porCanal(citas: CitaAnalisis[]): PuntoCanal[] {
  const conteo = new Map<string, number>();
  for (const c of citas) {
    const key = c.canal?.trim() ? c.canal.trim() : "";
    conteo.set(key, (conteo.get(key) ?? 0) + 1);
  }
  return Array.from(conteo, ([valor, n]) => ({
    canal: valor === "" ? SIN_CANAL : CANAL_LABEL[valor] ?? valor,
    valor: n,
  })).sort((a, b) => b.valor - a.valor);
}
