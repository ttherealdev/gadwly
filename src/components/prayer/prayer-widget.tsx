"use client";

import { AlertTriangle, MapPin, MoonStar } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePrayerTimes } from "@/hooks/use-prayer-times";
import { cn } from "@/lib/utils";

const ORDER = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;

export function PrayerWidget() {
  const t = useTranslations("dashboard");
  const tp = useTranslations("prayers");
  const { times, status, enable, next } = usePrayerTimes();

  const errorMessage: string | null =
    status === "denied"
      ? t("locationDenied")
      : status === "insecure"
        ? t("locationInsecure")
        : status === "timeout"
          ? t("locationTimeout")
          : status === "fetch-failed"
            ? t("fetchFailed")
            : status === "error"
              ? t("genericError")
              : null;

  return (
    <Card >
      <CardHeader className="flex-row items-center gap-2">
        <CardTitle className="flex items-center gap-2">
          <MoonStar className="h-4 w-4 text-accent-green" />
          {t("prayerTimes")}
        </CardTitle>
        {status !== "ready" && (
          <Button
            size="sm"
            variant="green"
            className="ms-auto"
            onClick={enable}
            disabled={status === "locating"}
          >
            <MapPin className="h-3.5 w-3.5" />
            {status === "locating" ? t("locating") : t("enableLocation")}
          </Button>
        )}
      </CardHeader>

      <CardContent>
        {times ? (
          <div className="grid grid-cols-5 gap-2">
            {ORDER.map((key) => (
              <div
                key={key}
                className={cn(
                  "rounded-xl px-2 py-3 text-center",
                  next === key ? "bg-accent-green/10 ring-1 ring-accent-green/40" : "bg-muted"
                )}
              >
                <p className="text-xs text-muted-foreground">{tp(key)}</p>
                <p
                  className={cn(
                    "mt-1 text-sm font-bold tabular-nums",
                    next === key && "text-accent-green"
                  )}
                >
                  {times[key]}
                </p>
              </div>
            ))}
          </div>
        ) : errorMessage ? (
          <p className="flex items-center gap-1.5 text-sm text-destructive">
            <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
            {errorMessage}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">{t("enableLocation")}</p>
        )}
      </CardContent>
    </Card>
  );
}
