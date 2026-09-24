import { BookA, KeyRound, ShieldCheck, Zap } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { preconnect } from "react-dom";
import { auth } from "@/lib/auth";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { GoogleLoginButton } from "./google-login-button";

const FEATURES = [
  { icon: Zap, key: "featureFast" },
  { icon: ShieldCheck, key: "featureSecure" },
  { icon: KeyRound, key: "featurePasswordless" },
] as const;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ params, searchParams }: Props) {
  const [{ locale }, { next, error }] = await Promise.all([
    params,
    searchParams,
  ]);
  setRequestLocale(locale);

  // Opens DNS + TLS to Google while the user is still reading the page,
  // so the redirect after the click is not paying for the handshake.
  preconnect("https://accounts.google.com");

  const requestHeaders = await headers();
  const [session, t, tApp] = await Promise.all([
    auth.api.getSession({ headers: requestHeaders }),
    getTranslations("auth"),
    getTranslations("app"),
  ]);

  // NOTE: kept from the original. Verify it matches your next-intl routing
  // (localePrefix / defaultLocale), it looks inverted for some configs.
  const home = locale === "ar" ? "/" : "/ar";
  const target = safeRedirectPath(next, home);

  if (session) redirect(target);

  const appName = tApp("name");

  return (
    <main className="grid min-h-dvh lg:grid-cols-[5fr_4fr]">
      {/* Brand panel */}
      <section className="relative isolate flex flex-col justify-between overflow-hidden bg-primary p-6 pb-14 text-primary-foreground lg:p-14">
        {/* The one bold move: an oversized outline mark bleeding off the corner */}
        <BookA
          aria-hidden
          strokeWidth={0.6}
          className="pointer-events-none absolute -bottom-10 -end-10 -z-10 size-56 text-primary-foreground/15 lg:-bottom-24 lg:-end-24 lg:size-[32rem]"
        />

        <header className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-primary-foreground text-primary">
            <BookA className="size-5" aria-hidden />
          </span>
          <span className="text-lg font-bold">{appName}</span>
        </header>

        <div className="hidden max-w-lg lg:block">
          <p className="text-5xl font-extrabold leading-[1.3]">
            {t("heroTitle")}
          </p>
          <p className="mt-5 text-lg leading-8 text-primary-foreground/80">
            {t("heroDescription")}
          </p>

          <ul className="mt-12 space-y-5">
            {FEATURES.map(({ icon: Icon, key }) => (
              <li key={key} className="flex items-center gap-4">
                <Icon className="size-5 shrink-0 opacity-90" aria-hidden />
                <span className="text-base">{t(key)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Form panel */}
      <section className="relative z-10 -mt-6 flex items-center justify-center rounded-t-3xl bg-background px-6 py-12 lg:mt-0 lg:rounded-none lg:px-14">
        <div className="w-full max-w-sm text-start">
          <h1 className="text-3xl font-extrabold leading-tight">
            {t("welcomeBack")}
          </h1>
          <p className="mt-3 text-muted-foreground">{t("loginSubtitle")}</p>

          <div className="mt-10">
            <GoogleLoginButton
              callbackURL={target}
              initialError={Boolean(error)}
              labels={{
                idle: t("continueWithGoogle"),
                pending: t("redirectingToGoogle"),
                error: t("signInFailed"),
              }}
            />
          </div>

          <p className="mt-8 text-sm leading-6 text-muted-foreground">
            {t("loginNotice")}
          </p>
        </div>
      </section>
    </main>
  );
}
