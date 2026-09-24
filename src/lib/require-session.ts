import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/** Server-side guard for protected pages: redirects to /login if signed out. */
export async function requireSession(locale: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect(`/${locale === "ar" ? "" : "en/"}login`);
  return session;
}
