import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/AdminShell";
import { signOut } from "../actions";

export const metadata = {
  title: "Panel · Psico.Gestión",
  robots: { index: false, follow: false },
};

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: isAdmin } = await supabase.rpc("es_admin");

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-sand px-6">
        <div className="max-w-[420px] rounded-[18px] border border-line bg-white p-8 text-center shadow-card">
          <h1 className="mb-2 font-serif text-[24px] text-ink">Sin permisos</h1>
          <p className="mb-6 text-[14px] text-body">
            La cuenta <strong>{user.email}</strong> no está autorizada como
            administradora.
          </p>
          <form action={signOut}>
            <button className="rounded-full border border-line-2 px-6 py-3 text-[14px] text-body transition hover:bg-cream">
              Cerrar sesión
            </button>
          </form>
        </div>
      </main>
    );
  }

  return <AdminShell email={user.email ?? ""}>{children}</AdminShell>;
}
