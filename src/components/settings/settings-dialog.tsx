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
      <DialogContent className="grid h-[32rem] max-w-3xl grid-cols-[14rem_1fr] gap-0 overflow-hidden p-0 sm:h-[36rem]">
        <nav className="flex flex-col gap-0.5 overflow-y-auto border-e border-border bg-muted/40 p-3">
          <p className="px-3 py-2 text-xs font-bold text-muted-foreground">{t("title")}</p>
          {tabs.map((key) => {
            const Icon = TAB_ICONS[key];
            const active = key === tab;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={cn(
                  "flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-bold transition-colors",
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon className="size-4" />
                {t(`tabs.${key}`)}
              </button>
            );
          })}
        </nav>

        <div className="overflow-y-auto p-6">
          {tab === "notifications" && <NotificationsSettings />}
          {tab === "sounds" && <p className="text-sm text-muted-foreground">{t("comingSoon")}</p>}
          {tab === "account" && <p className="text-sm text-muted-foreground">{t("comingSoon")}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
