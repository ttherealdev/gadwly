"use client";

import { BellRing, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
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
  const [testResult, setTestResult] = useState<"idle" | "sent" | "no-subscription">("idle");

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

  async function handleSendTest() {
    setTestResult("idle");
    const res = await push.sendTest();
    setTestResult(res.ok ? "sent" : res.reason === "no-subscription" ? "no-subscription" : "idle");
  }

  if (isLoading || !prefs) {
    return <p className="text-sm text-muted-foreground">{t("loading")}</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <BellRing className="size-4" />
            </span>
            <div>
              <p className="text-sm font-bold">{t("pushTitle")}</p>
              <p className="text-xs text-muted-foreground">
                {push.support === "subscribed"
                  ? t("pushOnThisDevice")
                  : push.support === "denied"
                    ? t("pushDenied")
                    : push.support === "unsupported"
                      ? t("pushUnsupported")
                      : push.support === "insecure"
                        ? t("pushInsecure")
                        : t("pushOffThisDevice")}
              </p>
            </div>
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
        </div>

        {push.error && (
          <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {push.error === "missing-vapid-key" ? t("pushErrorMissingKey") : t("pushErrorGeneric")}
          </p>
        )}

        {push.support === "subscribed" && (
          <div className="mt-3 border-t border-border pt-3">
            <Button size="sm" variant="outline" onClick={handleSendTest} disabled={push.isSendingTest}>
              {push.isSendingTest ? t("pushTesting") : t("pushSendTest")}
            </Button>
            {testResult === "sent" && (
              <p className="mt-2 text-xs text-muted-foreground">{t("pushTestSent")}</p>
            )}
            {testResult === "no-subscription" && (
              <p className="mt-2 text-xs text-destructive">{t("pushTestNoSubscription")}</p>
            )}
          </div>
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
