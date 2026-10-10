import { getCurrentUser } from "@/lib/auth";
import { ButtonLink } from "./button";

/** "My plans" when signed in, "Sign in" otherwise. Reads the session, so render it inside Suspense. */
export async function AccountLink() {
  const user = await getCurrentUser();
  return user ? (
    <ButtonLink href="/plans" variant="quiet" className="no-print">
      My plans
    </ButtonLink>
  ) : (
    <ButtonLink href="/login" variant="quiet" className="no-print">
      Sign in
    </ButtonLink>
  );
}
