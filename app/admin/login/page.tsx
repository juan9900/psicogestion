import { signIn } from "../actions";

export const metadata = {
  title: "Acceso · Psico.Gestión",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-sand px-6">
      <div className="w-full max-w-[380px] rounded-[18px] border border-line bg-white p-8 shadow-card">
        <h1 className="mb-1 font-serif text-[28px] text-ink">Panel de gestión</h1>
        <p className="mb-6 text-[14px] text-body">Ingresa con tu cuenta.</p>

        {error && (
          <p className="mb-4 rounded-lg bg-[#fbeaea] px-3 py-2 text-[13px] text-[#a33]">
            {error}
          </p>
        )}

        <form action={signIn} className="grid gap-3">
          <input
            name="email"
            type="email"
            required
            placeholder="Correo"
            className="rounded-[10px] border border-line-2 px-[15px] py-[13px] text-[15px] text-ink outline-none focus:border-brand"
          />
          <input
            name="password"
            type="password"
            required
            placeholder="Contraseña"
            className="rounded-[10px] border border-line-2 px-[15px] py-[13px] text-[15px] text-ink outline-none focus:border-brand"
          />
          <button
            type="submit"
            className="mt-1 rounded-full bg-brand px-7 py-[13px] text-[15px] font-semibold text-white transition hover:brightness-110"
          >
            Entrar
          </button>
        </form>
      </div>
    </main>
  );
}
