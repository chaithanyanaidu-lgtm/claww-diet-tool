import { NextResponse, type NextRequest } from "next/server";
import { isPrivatePath } from "@/lib/private-paths";
import { updateSession } from "@/lib/supabase/proxy";

// Each private page checks the user again on the server; this just sends signed-out
// visitors to sign in first instead of showing them an error.

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (!user && isPrivatePath(pathname)) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + search);
    const redirect = NextResponse.redirect(login);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }
  return response;
}

export const config = {
  matcher: [
    // Everything except static files, images and the icon.
    "/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
