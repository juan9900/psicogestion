import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/admin/SidebarNav";
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
    <div className="min-h-screen bg-cream sm:flex">
      {/* Sidebar */}
      <aside className="border-b border-line bg-white sm:w-[230px] sm:flex-none sm:border-b-0 sm:border-r">
        <div className="flex h-full flex-col gap-6 p-4 sm:sticky sm:top-0 sm:h-screen sm:p-5">
          <div className="px-1">
            <div className="font-serif text-[19px] text-ink">Psico.Gestión</div>
            <div className="text-[12px] text-muted">Panel de gestión</div>
          </div>
          <SidebarNav />
          <form action={signOut} className="mt-auto hidden sm:block">
            <div className="mb-2 truncate px-1 text-[12px] text-muted">
              {user.email}
            </div>
            <button className="w-full rounded-[10px] border border-line-2 px-3 py-2 text-left text-[13px] text-body transition hover:bg-cream">
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex-1">
        <main className="mx-auto max-w-[860px] px-5 py-7 sm:px-8 sm:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
