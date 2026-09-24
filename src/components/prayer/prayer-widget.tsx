"use client";

import { useTranslations } from "next-intl";
import { MapPin, MoonStar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePrayerTimes } from "@/hooks/use-prayer-times";
import { cn } from "@/lib/utils";

const ORDER = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;

export function PrayerWidget() {
  const t = useTranslations("dashboard");
  const tp = useTranslations("prayers");
  const { times, status, enable, next } = usePrayerTimes();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MoonStar className="h-4 w-4 text-accent-green" />
          {t("prayerTimes")}
        </CardTitle>
        {status !== "ready" && (
          <Button size="sm" variant="green" onClick={enable} disabled={status === "locating"}>
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
                <p className={cn("mt-1 text-sm font-bold tabular-nums", next === key && "text-accent-green")}>
                  {times[key]}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {status === "denied" ? "—" : t("enableLocation")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
