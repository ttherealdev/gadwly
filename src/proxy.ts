import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Next.js 16 renamed the middleware.ts convention to proxy.ts (named
// `proxy` export, Node.js runtime by default) — this is next-intl's
// locale-detection/redirect logic, unchanged apart from the rename.
export const proxy = createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
