import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// En Next.js 16 el antiguo "middleware" se llama "proxy". Aquí solo:
//  1) refrescamos la sesión de Supabase (mantiene el token vigente), y
//  2) protegemos /admin: sin sesión -> a /admin/login.
// El chequeo de "es administrador" se hace además en el layout del panel.
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let response = NextResponse.next({ request });

  // Sin credenciales configuradas, no hacemos nada (no rompe el sitio).
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const enLogin = path.startsWith("/admin/login");
  if (path.startsWith("/admin") && !enLogin && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
