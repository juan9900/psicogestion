import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1000px] flex-wrap items-center gap-x-6 gap-y-2 px-6 py-4">
          <span className="font-serif text-[18px] text-ink">Psico.Gestión</span>
          <nav className="flex gap-4 text-[14px]">
            <Link href="/admin" className="text-body hover:text-brand">
              Citas y órdenes
            </Link>
            <Link href="/admin/recursos" className="text-body hover:text-brand">
              Recursos
            </Link>
          </nav>
          <form action={signOut} className="ml-auto">
            <button className="text-[13px] text-muted hover:text-brand">
              Salir ({user.email})
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-[1000px] px-6 py-8">{children}</main>
    </div>
  );
}
