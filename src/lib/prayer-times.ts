"use client";

// Thin client for the Aladhan API (https://aladhan.com/prayer-times-api),
// used with the browser's geolocation so times are accurate to the
// user's actual city rather than a hardcoded one.

export type PrayerKey = "Fajr" | "Dhuhr" | "Asr" | "Maghrib" | "Isha";

export interface PrayerTimes {
  Fajr: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

export async function fetchPrayerTimesByCoords(
  lat: number,
  lon: number,
  method = Number(process.env.NEXT_PUBLIC_PRAYER_CALC_METHOD ?? 5)
): Promise<PrayerTimes> {
  const url = `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=${method}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("prayer-times-fetch-failed");
  const json = await res.json();
  const t = json.data.timings;
  return {
    Fajr: t.Fajr,
    Dhuhr: t.Dhuhr,
    Asr: t.Asr,
    Maghrib: t.Maghrib,
    Isha: t.Isha,
  };
}

export function getBrowserLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("geolocation-unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10_000,
      maximumAge: 1000 * 60 * 60, // reuse a fix for up to an hour
    });
  });
}

/** "HH:mm" -> minutes since midnight, for comparisons/sorting. */
export function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Which prayer is next (or currently "due"), given the current time. */
export function nextPrayer(times: PrayerTimes, now = new Date()) {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const order: PrayerKey[] = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
  for (const key of order) {
    if (toMinutes(times[key]) > nowMin) return key;
  }
  return order[0]; // after Isha -> tomorrow's Fajr
}
