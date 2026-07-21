"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { enviarLinkDescarga } from "@/lib/email";

// Verifica sesión + rol admin. Devuelve el cliente autenticado.
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: isAdmin } = await supabase.rpc("es_admin");
  if (!isAdmin) throw new Error("No autorizado");
  return supabase;
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect("/admin/login?error=" + encodeURIComponent("Correo o contraseña incorrectos"));
  }
  redirect("/admin");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function actualizarEstadoCita(formData: FormData) {
  const id = String(formData.get("id"));
  const estado = String(formData.get("estado")); // 'confirmada' | 'cancelada'
  const supabase = await requireAdmin();
  const { error } = await supabase.from("citas").update({ estado }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/citas");
  revalidatePath("/admin");
}

export async function reagendarCita(formData: FormData) {
  const id = String(formData.get("id"));
  const fecha = String(formData.get("fecha"));
  const hora = String(formData.get("hora"));
  const supabase = await requireAdmin();
  const { error } = await supabase.from("citas").update({ fecha, hora }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/citas");
  revalidatePath("/admin");
}

// Alta manual de una cita desde el panel admin. A diferencia del formulario
// público (RPC crear_cita), no valida contra los horarios configurados: el
// admin puede coordinar una cita a cualquier hora. El índice único de
// public.citas (fecha, hora) sigue evitando duplicar un slot activo.
export async function crearCitaManual(formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const fecha = String(formData.get("fecha") ?? "").trim();
  const hora = String(formData.get("hora") ?? "").trim();
  const modalidad = String(formData.get("modalidad") ?? "online");
  const email = String(formData.get("email") ?? "").trim() || null;
  const telefono = String(formData.get("telefono") ?? "").trim() || null;
  const motivo = String(formData.get("motivo") ?? "").trim() || null;

  if (!nombre) throw new Error("El nombre es obligatorio");
  if (!fecha || !hora) throw new Error("La fecha y la hora son obligatorias");

  const supabase = await requireAdmin();
  const { error } = await supabase.from("citas").insert({
    nombre,
    fecha,
    hora,
    modalidad,
    email,
    telefono,
    motivo,
    estado: "confirmada",
  });
  if (error) {
    if (error.code === "23505") throw new Error("Ya hay una cita activa en ese horario");
    throw new Error(error.message);
  }
  revalidatePath("/admin/citas");
  revalidatePath("/admin");
}

export async function guardarPagoCita(formData: FormData) {
  const id = String(formData.get("id"));
  const montoRaw = String(formData.get("monto") ?? "").trim();
  const metodoPago = String(formData.get("metodo_pago") ?? "").trim() || null;
  const pagado = ["on", "true"].includes(String(formData.get("pagado") ?? ""));

  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("citas")
    .update({ monto: montoRaw ? Number(montoRaw) : null, metodo_pago: metodoPago, pagado })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/citas");
  revalidatePath("/admin");
}

export async function actualizarEstadoOrden(formData: FormData) {
  const id = String(formData.get("id"));
  const estado = String(formData.get("estado")); // 'pagada' | 'entregada' | 'rechazada'
  const supabase = await requireAdmin();
  const patch: Record<string, unknown> = { estado };
  if (estado === "pagada") patch.confirmado_at = new Date().toISOString();
  const { error } = await supabase.from("ordenes").update(patch).eq("id", id);
  if (error) throw new Error(error.message);

  // Al confirmar el pago, avisamos al comprador con el enlace de descarga.
  // Best-effort: si el correo falla, la orden ya quedó confirmada igual.
  if (estado === "pagada") {
    const { data: orden } = await supabase
      .from("ordenes")
      .select("comprador_nombre, comprador_email, token_descarga, recursos(titulo)")
      .eq("id", id)
      .maybeSingle<{
        comprador_nombre: string;
        comprador_email: string;
        token_descarga: string;
        recursos: { titulo: string } | null;
      }>();
    if (orden) {
      await enviarLinkDescarga({
        email: orden.comprador_email,
        nombre: orden.comprador_nombre,
        titulo: orden.recursos?.titulo ?? "tu recurso",
        token: orden.token_descarga,
      });
    }
  }

  revalidatePath("/admin/ordenes");
  revalidatePath("/admin");
}

export async function guardarRecurso(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const supabase = await requireAdmin();

  const datos: Record<string, unknown> = {
    titulo: String(formData.get("titulo") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    descripcion: String(formData.get("descripcion") ?? "").trim() || null,
    precio_usd: Number(formData.get("precio_usd") ?? 0),
    activo: ["on", "true"].includes(String(formData.get("activo") ?? "")),
    categoria: String(formData.get("categoria") ?? "").trim() || null,
  };

  // Solo sobreescribimos las rutas de archivo si se subió algo nuevo,
  // para no borrar el archivo/portada existentes al editar solo los datos.
  const archivo = String(formData.get("archivo_path") ?? "").trim();
  const archivoTipo = String(formData.get("archivo_tipo") ?? "").trim();
  const imagen = String(formData.get("imagen_path") ?? "").trim();
  if (archivo) datos.archivo_path = archivo;
  if (archivoTipo) datos.archivo_tipo = archivoTipo;
  if (imagen) datos.imagen_path = imagen;

  const { error } = id
    ? await supabase.from("recursos").update(datos).eq("id", id)
    : await supabase.from("recursos").insert(datos);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/recursos");
}

export async function alternarActivoRecurso(formData: FormData) {
  const id = String(formData.get("id"));
  const activo = formData.get("activo") === "true";
  const supabase = await requireAdmin();
  const { error } = await supabase.from("recursos").update({ activo: !activo }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/recursos");
}

export async function guardarConfigPago(formData: FormData) {
  const supabase = await requireAdmin();
  const datos = {
    titular: String(formData.get("titular") ?? "").trim() || null,
    cedula: String(formData.get("cedula") ?? "").trim() || null,
    telefono: String(formData.get("telefono") ?? "").trim() || null,
    banco: String(formData.get("banco") ?? "").trim() || null,
    instrucciones: String(formData.get("instrucciones") ?? "").trim() || null,
  };
  const { error } = await supabase.from("config_pago").update(datos).eq("id", 1);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/pagos");
}
