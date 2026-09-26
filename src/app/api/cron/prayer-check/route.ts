import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendPushToUser } from "@/lib/push";

export const dynamic = "force-dynamic";

type PrayerKey = "Fajr" | "Dhuhr" | "Asr" | "Maghrib" | "Isha";
const PRAYER_KEYS: PrayerKey[] = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
const PREF_FIELD = {
  Fajr: "notifyFajr",
  Dhuhr: "notifyDhuhr",
  Asr: "notifyAsr",
  Maghrib: "notifyMaghrib",
  Isha: "notifyIsha",
} as const;

async function fetchTodayTimings(lat: number, lon: number, method: number) {
  const now = new Date();
  const path = `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;
  const url = `https://api.aladhan.com/v1/timings/${path}?latitude=${lat}&longitude=${lon}&method=${method}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  return {
    timings: json.data.timings as Record<PrayerKey, string>,
    timezone: json.data.meta.timezone as string,
  };
}

function currentHHmmIn(timezone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided =
    req.nextUrl.searchParams.get("secret") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const prefs = await db.userPreference.findMany({
    where: {
      prayerNotifyEnabled: true,
      latitude: { not: null },
      longitude: { not: null },
      user: { pushSubscriptions: { some: {} } },
    },
  });

  const cache = new Map<string, ReturnType<typeof fetchTodayTimings>>();
  let sent = 0;

  await Promise.all(
    prefs.map(async (pref) => {
      const key = `${pref.latitude!.toFixed(2)},${pref.longitude!.toFixed(2)},${pref.prayerCalcMethod}`;
      if (!cache.has(key)) {
        cache.set(key, fetchTodayTimings(pref.latitude!, pref.longitude!, pref.prayerCalcMethod));
      }
      const data = await cache.get(key)!;
      if (!data) return;

      const nowHHmm = currentHHmmIn(data.timezone);

      for (const prayer of PRAYER_KEYS) {
        const raw = data.timings[prayer];
        const hhmm = raw?.slice(0, 5);
        if (hhmm !== nowHHmm) continue;
        if (!pref[PREF_FIELD[prayer]]) continue;

              await sendPushToUser(pref.userId, {
          title: "حان موعد الأذان",
          body: prayer,
          tag: `prayer-${prayer}-${nowHHmm}`,
          url: "/gadwly",
          silent: !pref.notificationSoundOn,
          channelId: "adhan",
        });
        sent += 1;
      }
    })
  );

  return NextResponse.json({ checked: prefs.length, sent });
}
