"use client";

import { useTranslations } from "next-intl";
import { usePathname, Link } from "@/i18n/navigation";
import {
  LayoutGrid,
  CalendarClock,
  Timer,
  ChevronLeft,
  X,
  BookA,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/sidebar-context";

export function AppSidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar();

  const homeActive = pathname === "/gadwly";
  const scheduleActive = pathname.startsWith("/schedule");
  const counterActive = pathname.startsWith("/counter");

  const renderContent = (compact: boolean) => {
    const itemClass = (active: boolean) =>
      cn(
        "flex h-12 items-center rounded-[4px] text-base font-bold transition-colors",
        compact ? "justify-center" : "gap-4 px-4",
        active
          ? "bg-white/95 text-[#0b2a5c]"
          : "text-white/60 hover:bg-white/60 hover:text-[#0b2a5c]",
      );

    const iconClass = (active: boolean) =>
      cn("h-6 w-6 shrink-0", active && "text-blue-600");

    const subLinkClass =
      "flex h-[30px] items-center text-[13px] font-medium text-white/60 transition-colors hover:text-white";

    return (
      <>
        <div
          className={cn(
            "flex h-[76px] shrink-0 items-center gap-3",
            compact ? "justify-center" : "px-8",
          )}
        >
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/15">
            <BookA className="h-6 w-6" />
          </div>
          {!compact && (
            <span className="text-2xl font-extrabold tracking-tight">
              {"جدولي"}
            </span>
          )}
          <button
            onClick={() => setMobileOpen(false)}
            className="ms-auto grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className={cn(
            "mb-3 mt-10 hidden shrink-0 md:block",
            compact ? "px-3" : "px-8",
          )}
        >
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={t("collapse")}
            className={cn(
              "group flex h-14 w-full items-center rounded-[4px] transition-colors",
              "hover:bg-white/95 hover:text-[#0b1b3a]",
              compact ? "justify-center" : "justify-between ps-2.5 pe-3.5",
            )}
          >
            {!compact && (
              <span className="text-[13px] font-extrabold">
                {t("collapse")}
              </span>
            )}

            <span className="grid size-7 shrink-0 place-items-center rounded-[4px] bg-white text-primary transition-all group-hover:scale-105 group-hover:bg-[#0b1220] group-hover:text-white">
              <span
                className={cn(
                  "grid transition-transform",
                  compact && "rotate-180",
                )}
              >
                <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
              </span>
            </span>
          </button>
        </div>

        {/* Nav */}
        <nav
          className={cn(
            "flex flex-1 flex-col gap-3 overflow-y-auto max-md:mt-6",
            compact ? "px-3" : "px-8",
          )}
        >
          <Link
            href="/gadwly"
            onClick={() => setMobileOpen(false)}
            className={itemClass(homeActive)}
          >
            <LayoutGrid className={iconClass(homeActive)} fill="currentColor" />
            {!compact && <span>{t("home")}</span>}
          </Link>

          <div>
            <Link
              href="/gadwly/schedule"
              onClick={() => setMobileOpen(false)}
              className={itemClass(scheduleActive)}
            >
              <CalendarClock className={iconClass(scheduleActive)} />
              {!compact && <span>{t("schedule")}</span>}
            </Link>

            {!compact && (
              <div className="mt-2 flex flex-col ps-14">
                <Link
                  href={{
                    pathname: "/gadwly/schedule",
                    query: { view: "list" },
                  }}
                  onClick={() => setMobileOpen(false)}
                  className={subLinkClass}
                >
                  {t("scheduleList")}
                </Link>
                <Link
                  href={{
                    pathname: "/gadwly/schedule",
                    query: { view: "grid" },
                  }}
                  onClick={() => setMobileOpen(false)}
                  className={subLinkClass}
                >
                  {t("scheduleGrid")}
                </Link>
              </div>
            )}
          </div>

          <Link
            href="/gadwly/counter"
            onClick={() => setMobileOpen(false)}
            className={itemClass(counterActive)}
          >
            <Timer className={iconClass(counterActive)} />
            {!compact && <span>{t("counter")}</span>}
          </Link>
        </nav>
      </>
    );
  };

  return (
    <>
      {/* Desktop */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col bg-primary text-primary-foreground transition-[width] duration-200 md:flex",
          collapsed ? "w-[76px]" : "w-[272px]",
        )}
      >
        {renderContent(collapsed)}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="sidebar-backdrop absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 start-0 flex w-[272px] max-w-[85vw] flex-col bg-primary text-primary-foreground shadow-2xl">
            {renderContent(false)}
          </aside>
        </div>
      )}
    </>
  );
}
