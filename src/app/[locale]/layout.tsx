import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Tajawal } from "next/font/google";
import { routing } from "@/i18n/routing";
import { TRPCProvider } from "@/components/providers/trpc-provider";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { NativePushRegister } from "@/components/pwa/native-push-register";
import { Toaster } from "sonner";
import "./globals.css";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-tajawal",
});

export async function generateMetadata({
  params,
}: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "app" });
  const isAr = locale === "ar";

  return {
    title: { default: t("name"), template: `%s · ${t("name")}` },
    description: isAr
      ? "جدولي — نظّم مذاكرتك وجدولك اليومي ومواقيت صلاتك في مكان واحد."
      : "Gadwly — organize your study schedule and prayer times in one place.",
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
    alternates: { languages: { ar: "/", en: "/en" } },
    openGraph: {
      title: t("name"),
      description: isAr ? "نظّم وقتك ومذاكرتك بسهولة." : "Organize your time and study, easily.",
      locale: isAr ? "ar_EG" : "en_US",
      type: "website",
    },
    manifest: "/manifest.json",
    icons: {
      icon: "/favicon.ico",
      apple: "/icons/apple-touch-icon.png",
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: t("name"),
    },
  };
}

export function generateViewport(): Viewport {
  return {
    themeColor: "#6ebf64",
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} className={tajawal.variable}>
      <body className="font-sans antialiased">
        <NextIntlClientProvider>
          <TRPCProvider>
            {children}
            <Toaster position={dir === "rtl" ? "top-left" : "top-right"} richColors />
          </TRPCProvider>
        </NextIntlClientProvider>
        <ServiceWorkerRegister />
        <NativePushRegister />
      </body>
    </html>
  );
}
