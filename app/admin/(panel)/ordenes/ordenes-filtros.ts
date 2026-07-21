export type Orden = {
  id: string;
  comprador_nombre: string;
  comprador_email: string;
  monto: number;
  moneda: string;
  metodo_pago: string;
  referencia_pago: string | null;
  comprobante_path: string | null;
  estado: string;
  created_at: string;
  recursos: { titulo: string } | null;
};

export type FiltrosOrdenes = {
  estado: string; // "" = todos
  metodo: string; // "" = todos
  q: string;
};

// Orden semántico de estados para el sort por columna "estado": lo que
// requiere acción del admin (pendiente) primero.
const RANK_ESTADO: Record<string, number> = {
  pendiente: 0,
  pagada: 1,
  entregada: 2,
  rechazada: 3,
};

export function rankEstadoOrden(estado: string): number {
  return RANK_ESTADO[estado] ?? 99;
}

export function filtrarOrdenes(ordenes: Orden[], filtros: FiltrosOrdenes): Orden[] {
  const q = filtros.q.trim().toLowerCase();
  return ordenes.filter((o) => {
    if (filtros.estado && o.estado !== filtros.estado) return false;
    if (filtros.metodo && o.metodo_pago !== filtros.metodo) return false;
    if (q) {
      const haystack = `${o.comprador_nombre} ${o.comprador_email}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}
