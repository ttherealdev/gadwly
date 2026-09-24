import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const paths = ["", "/schedule", "/login"];

  return routing.locales.flatMap((locale) =>
    paths.map((p) => ({
      url: `${base}${locale === routing.defaultLocale ? "" : `/${locale}`}${p}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: p === "" ? 1 : 0.7,
    }))
  );
}
