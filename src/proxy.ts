import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // refreshing the auth token
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    const isActive = profile?.is_active === true;
    const isAdmin = ["admin", "platform_admin"].includes(profile?.role ?? "");

    // 0. Block inactive/pending users from all routes except allowed paths
    const allowedForInactive = ["/inactive", "/login", "/auth"];
    const isAllowedPath = allowedForInactive.some((path) =>
      request.nextUrl.pathname.startsWith(path)
    );

    if (!isActive && !isAllowedPath) {
      return NextResponse.redirect(new URL("/inactive", request.url));
    }

    // 1. Restrict /admin routes to admin and platform_admin only
    if (request.nextUrl.pathname.startsWith("/admin") && !isAdmin) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // 2. Redirect admins to their dashboard if they hit root or login
    if (
      (request.nextUrl.pathname === "/" ||
        request.nextUrl.pathname === "/login") &&
      isAdmin
    ) {
      return NextResponse.redirect(new URL("/admin/users", request.url));
    }
  } else {
    // If not authenticated, restrict protected routes
    if (request.nextUrl.pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
