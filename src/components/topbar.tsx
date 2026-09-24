"use client";

import { useTranslations, useLocale } from "next-intl";
import { Bell, ChevronDown, Home, LogOut, Menu, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useSidebar } from "@/components/sidebar-context";
import { signOut, useSession } from "@/lib/auth-client";
import { AvatarImage, Avatar, AvatarFallback } from "./ui/avatar";

const rowClass = "h-11 gap-3 rounded-none px-5 text-sm font-medium";

export function Topbar({ title }: { title: string }) {
  const t = useTranslations("topbar");
  const tNav = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { setMobileOpen } = useSidebar();

  function toggleLocale() {
    router.replace(pathname, { locale: locale === "ar" ? "en" : "ar" });
  }
  const signOutLogic = () => {
    signOut();
    router.refresh()
  }
  return (
    <header
      className="sticky top-0 z-30 flex h-[76px] items-center gap-2 px-3 text-background sm:gap-4 sm:px-6"
      style={{ backgroundColor: "var(--accent-green)" }}
    >
      <button
        onClick={() => setMobileOpen(true)}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-background/10 md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <h1 className="min-w-0 flex-1 truncate text-base font-extrabold sm:text-lg">
        {title}
      </h1>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <button
          onClick={toggleLocale}
          className="flex gap-1 rounded-lg px-2 py-1.5 text-xs font-bold hover:bg-background/10 sm:px-2.5"
          title="Switch language"
        >
          {locale === "ar" ? "EN" : "العربية"}
          <ChevronDown className="h-3.5 w-3.5" />
        </button>

        {/* <button className="grid h-9 w-9 place-items-center rounded-full hover:bg-background/10">
          <Bell className="h-4.5 w-4.5" />
        </button> */}

        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-[8px]  bg-white/20 outline-none"
              />
            }
          >
            {session?.user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <Avatar>
                <AvatarImage
                  src={session.user.image}
                  alt="User Avatar"
                  className="h-full w-full object-cover rounded-[8px]"
                  // className="grayscale"
                />
                 <AvatarFallback>{session.user.name?.split(" ").map(n => n[0]).join("")}</AvatarFallback>
              </Avatar>
            ) : (
              <User className="h-4 w-4" />
            )}
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="min-w-80 rounded-[4px] p-0 py-2"
          >
            <DropdownMenuItem render={<Link href="/" />} className={rowClass}>
              <Home className="size-4 text-sky-500" />
              {tNav("home")}
            </DropdownMenuItem>

            <DropdownMenuSeparator className="mx-5 my-2 h-1 rounded-full bg-muted" />

            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-5 py-2 text-sm font-semibold text-foreground">
                {t("greeting", { name: session?.user?.name ?? "" })}
              </DropdownMenuLabel>
            </DropdownMenuGroup>

            <DropdownMenuItem onClick={signOutLogic} className={rowClass}>
              <LogOut className="size-4 text-sky-500" />
              {tNav("logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
