"use client";

import { ChevronDown, Home, LogOut, Menu, Settings } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { useSidebar } from "@/components/sidebar-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSettingsHash } from "@/hooks/use-settings-hash";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import { UserAvatar } from "./user-avatar";

const rowClass = "h-11 gap-3 rounded-none px-5 text-sm font-medium";

export function Topbar({ title }: { title: string }) {
  const t = useTranslations("topbar");
  const tNav = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { setMobileOpen } = useSidebar();
  const { openSettings } = useSettingsHash();
  const [isSigningOut, startSignOut] = useTransition();

  const user = session?.user;
  const otherLocale = locale === "ar" ? "en" : "ar";

  function toggleLocale() {
    router.replace(pathname, { locale: otherLocale });
  }

  function handleSignOut() {
    startSignOut(async () => {
      await signOut();
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <header className="sticky top-0 z-30 flex h-[76px] items-center gap-2 bg-[var(--accent-green)] px-3 text-background sm:gap-4 sm:px-6">
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label={t("openMenu")}
        className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-background/10 md:hidden"
      >
        <Menu className="size-5" aria-hidden />
      </button>

      <h1 className="min-w-0 flex-1 truncate text-base font-extrabold sm:text-lg">
        {title}
      </h1>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={toggleLocale}
          aria-label={t("switchLanguage")}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold hover:bg-background/10 sm:px-2.5"
        >
          <span lang={otherLocale}>{locale === "ar" ? "EN" : "العربية"}</span>
          <ChevronDown className="size-3.5" aria-hidden />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label={t("account")}
                className="size-9 shrink-0 overflow-hidden rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-background/70"
              />
            }
          >
            <UserAvatar name={user?.name} image={user?.image} />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="min-w-80 rounded-[4px] p-0 py-2"
          >
            <DropdownMenuItem render={<Link href="/gadwly" />} className={rowClass}>
              <Home className="size-4 text-sky-500" />
              {tNav("home")}
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => openSettings()} className={rowClass}>
              <Settings className="size-4 text-sky-500" />
              {t("settings")}
            </DropdownMenuItem>

            <DropdownMenuSeparator className="mx-5 my-2 h-1 rounded-full bg-muted" />

            {user?.name && (
              <DropdownMenuGroup>
                <DropdownMenuLabel className="px-5 py-2 text-sm font-semibold text-foreground">
                  {t("greeting", { name: user.name })}
                </DropdownMenuLabel>
              </DropdownMenuGroup>
            )}

            <DropdownMenuItem
              onClick={handleSignOut}
              disabled={isSigningOut}
              className={rowClass}
            >
              <LogOut className="size-4 text-sky-500" />
              {tNav("logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
