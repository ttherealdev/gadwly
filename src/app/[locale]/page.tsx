import { auth, Session } from "@/lib/auth";
import { requireSession } from "@/lib/require-session";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";

export default async function GadwlyHomePage() {
  const locale = await getLocale();
  const session = await requireSession(locale);
  if (!session) {
    redirect("/login");
  } else {
    redirect("/gadwly");
  }
}
