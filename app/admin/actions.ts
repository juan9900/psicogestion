"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
  await supabase.from("citas").update({ estado }).eq("id", id);
  revalidatePath("/admin/citas");
  revalidatePath("/admin");
}

export async function actualizarEstadoOrden(formData: FormData) {
  const id = String(formData.get("id"));
  const estado = String(formData.get("estado")); // 'pagada' | 'entregada' | 'rechazada'
  const supabase = await requireAdmin();
  const patch: Record<string, unknown> = { estado };
  if (estado === "pagada") patch.confirmado_at = new Date().toISOString();
  await supabase.from("ordenes").update(patch).eq("id", id);
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
  };

  // Solo sobreescribimos las rutas de archivo si se subió algo nuevo,
  // para no borrar el PDF/portada existentes al editar solo los datos.
  const archivo = String(formData.get("archivo_path") ?? "").trim();
  const imagen = String(formData.get("imagen_path") ?? "").trim();
  if (archivo) datos.archivo_path = archivo;
  if (imagen) datos.imagen_path = imagen;

  if (id) {
    await supabase.from("recursos").update(datos).eq("id", id);
  } else {
    await supabase.from("recursos").insert(datos);
  }
  revalidatePath("/admin/recursos");
}

export async function alternarActivoRecurso(formData: FormData) {
  const id = String(formData.get("id"));
  const activo = formData.get("activo") === "true";
  const supabase = await requireAdmin();
  await supabase.from("recursos").update({ activo: !activo }).eq("id", id);
  revalidatePath("/admin/recursos");
}
