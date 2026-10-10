import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

// Where emailed sign-up links land. The default Supabase email sends a PKCE `code`, which only
// works in the browser that started sign-up. With a custom SMTP provider the email template can
// link here with `token_hash` instead, which works on any device.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeNext(params.get("next"));
  const supabase = await createClient();

  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("missing token") };

  if (!error) return NextResponse.redirect(new URL(next, request.url));

  const login = new URL("/login", request.url);
  login.searchParams.set("next", next);
  login.searchParams.set("error", "link");
  return NextResponse.redirect(login);
}
