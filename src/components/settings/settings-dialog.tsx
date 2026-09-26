"use client";

import { Bell, Music2, User as UserIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useSettingsHash, type SettingsTab } from "@/hooks/use-settings-hash";
import { cn } from "@/lib/utils";
import { NotificationsSettings } from "./notifications-settings";

const TAB_ICONS: Record<SettingsTab, React.ComponentType<{ className?: string }>> = {
  notifications: Bell,
  sounds: Music2,
  account: UserIcon,
};

export function SettingsDialog() {
  const t = useTranslations("settings");
  const { open, tab, tabs, setTab, close } = useSettingsHash();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent
        className={cn(
          // Mobile: a near-full-screen sheet, laid out top-to-bottom (tab
          // strip, then content) — wide and short rather than a narrow,
          // very tall stack. Desktop (sm+): unchanged fixed-size two-column
          // layout with a vertical sidebar.
                   "flex h-full h-[90dvh] max-w-[90dvw] flex-col  rounded-[4px]",

          "sm:grid sm:h-[36rem] sm:max-h-[36rem] sm:max-w-3xl sm:grid-cols-[14rem_1fr] sm:rounded-2xl",
        )}
      >
        {/* Mobile / small tablet: horizontal, scrollable tab strip */}
        <nav
          role="tablist"
          aria-label={t("title")}
          className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-border bg-muted/40 px-3 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:hidden"
        >
          {tabs.map((key) => {
            const Icon = TAB_ICONS[key];
            const active = key === tab;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(key)}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-bold transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-secondary",
                )}
              >
                <Icon className="size-4" />
                {t(`tabs.${key}`)}
              </button>
            );
          })}
        </nav>

        {/* Desktop: vertical sidebar, unchanged from before */}
        <nav
          role="tablist"
          aria-label={t("title")}
          className="hidden flex-col gap-0.5 overflow-y-auto border-e border-border bg-muted/40 p-3 sm:flex"
        >
          <p className="px-3 py-2 text-xs font-bold text-muted-foreground">{t("title")}</p>
          {tabs.map((key) => {
            const Icon = TAB_ICONS[key];
            const active = key === tab;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(key)}
                className={cn(
                  "flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-bold transition-colors",
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
                )}
              >
                <Icon className="size-4" />
                {t(`tabs.${key}`)}
              </button>
            );
          })}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {tab === "notifications" && <NotificationsSettings />}
          {tab === "sounds" && <p className="text-sm text-muted-foreground">{t("comingSoon")}</p>}
          {tab === "account" && <p className="text-sm text-muted-foreground">{t("comingSoon")}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
