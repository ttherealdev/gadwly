"use client";

import { BellRing, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { usePushSubscription } from "@/hooks/use-push-subscription";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

const PRAYER_FIELDS = {
  Fajr: "notifyFajr",
  Dhuhr: "notifyDhuhr",
  Asr: "notifyAsr",
  Maghrib: "notifyMaghrib",
  Isha: "notifyIsha",
} as const;
type PrayerKey = keyof typeof PRAYER_FIELDS;
const PRAYER_KEYS = Object.keys(PRAYER_FIELDS) as PrayerKey[];

export function NotificationsSettings() {
  const t = useTranslations("settings");
  const tp = useTranslations("prayers");
  const utils = trpc.useUtils();
  const { data: prefs, isLoading } = trpc.preferences.get.useQuery();
  const push = usePushSubscription();

  const update = trpc.preferences.updateNotificationPrefs.useMutation({
    onMutate: async (patch) => {
      await utils.preferences.get.cancel();
      const prev = utils.preferences.get.getData();
      utils.preferences.get.setData(undefined, (old) => (old ? { ...old, ...patch } : old));
      return { prev };
    },
    onError: (_err, _patch, ctx) => {
      if (ctx?.prev) utils.preferences.get.setData(undefined, ctx.prev);
    },
    onSettled: () => utils.preferences.get.invalidate(),
  });

  if (isLoading || !prefs) {
    return <p className="text-sm text-muted-foreground">{t("loading")}</p>;
  }

  const statusText =
    push.support === "subscribed"
      ? t("pushOnThisDevice")
      : push.support === "denied"
        ? t("pushDenied")
        : push.support === "unsupported"
          ? t("pushUnsupported")
          : push.support === "unavailable"
            ? t("pushUnavailable")
            : t("pushOffThisDevice");

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border p-3">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <BellRing className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{t("pushTitle")}</p>
            <p className="text-xs text-muted-foreground">{statusText}</p>
          </div>
          {push.support === "unsubscribed" && (
            <Button size="sm" variant="green" onClick={() => push.subscribe()}>
              {t("pushEnable")}
            </Button>
          )}
          {push.support === "subscribed" && (
            <Button size="sm" variant="outline" onClick={() => push.unsubscribe()}>
              {t("pushDisable")}
            </Button>
          )}
          {push.support === "unavailable" && (
            <Button size="sm" variant="outline" onClick={() => push.subscribe()}>
              <RotateCcw className="size-3.5" />
              {t("pushRetry")}
            </Button>
          )}
        </div>

        {/* This still works with push off: reminders show up while the app tab is open either way,
            so a blocked browser push service is a "you'll get fewer reminders", not a dead end. */}
        {push.support === "unavailable" && (
          <p className="mt-2.5 rounded-lg bg-muted p-2.5 text-xs leading-relaxed text-muted-foreground">
            {t("pushUnavailableHint")}
          </p>
        )}
      </section>

      <section>
        <Row
          label={t("prayerNotifications")}
          checked={prefs.prayerNotifyEnabled}
          onCheckedChange={(v) => update.mutate({ prayerNotifyEnabled: v })}
        />
        {prefs.prayerNotifyEnabled && (
          <div className="mt-3 ms-1 space-y-1.5 border-s border-border ps-4">
            {PRAYER_KEYS.map((key) => {
              const field = PRAYER_FIELDS[key];
              return (
                <Row
                  key={key}
                  small
                  label={tp(key)}
                  checked={prefs[field]}
                  onCheckedChange={(v) => update.mutate({ [field]: v })}
                />
              );
            })}
          </div>
        )}
      </section>

      <section>
        <Row
          label={t("pomodoroNotifications")}
          checked={prefs.pomodoroNotifyEnabled}
          onCheckedChange={(v) => update.mutate({ pomodoroNotifyEnabled: v })}
        />
      </section>

      <section>
        <Row
          label={t("notificationSound")}
          checked={prefs.notificationSoundOn}
          onCheckedChange={(v) => update.mutate({ notificationSoundOn: v })}
        />
      </section>
    </div>
  );
}

function Row({
  label,
  checked,
  onCheckedChange,
  small,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  small?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <Label className={cn("font-bold", small ? "text-sm font-medium text-muted-foreground" : "text-sm")}>
        {label}
      </Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
