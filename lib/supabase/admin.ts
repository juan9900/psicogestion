import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente de Supabase con la service_role key: salta RLS por completo.
// SOLO se usa dentro de Route Handlers server-side que ya validaron lo que
// hacen (ej. confirmar una captura de PayPal, generar una descarga firmada).
// Nunca importar esto en un componente de cliente ni exponerlo al navegador.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
