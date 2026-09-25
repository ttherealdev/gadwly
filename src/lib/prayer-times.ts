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

/** One clip per prayer, played when that prayer's time is reached. */
export const PRAYER_SOUND_FILES: Record<PrayerKey, string> = {
  Fajr: "/sounds/abdul_basset_all.mp3",
  Dhuhr: "/sounds/abdul_basset_all.mp3",
  Asr: "/sounds/abdul_basset_all.mp3",
  Maghrib: "/sounds/abdul_basset_all.mp3",
  Isha: "/sounds/abdul_basset_all.mp3",
};

/** Distinguishes *why* location/prayer-times fetching failed, so the UI can say something useful. */
export type LocationErrorKind =
  | "insecure" // no HTTPS (and not localhost) — the Geolocation API is unavailable
  | "unsupported" // no navigator.geolocation at all (very old / unusual browser)
  | "denied" // the user (or the OS) refused the permission prompt
  | "timeout" // no fix within the allotted time
  | "unavailable" // the OS/browser couldn't produce a position
  | "fetch-failed"; // reached the browser location fine, but the prayer-times API call failed

export class LocationError extends Error {
  kind: LocationErrorKind;
  constructor(kind: LocationErrorKind, message?: string) {
    super(message ?? kind);
    this.name = "LocationError";
    this.kind = kind;
  }
}

function todayPath(d = new Date()) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
}

export async function fetchPrayerTimesByCoords(
  lat: number,
  lon: number,
  method = Number(process.env.NEXT_PUBLIC_PRAYER_CALC_METHOD ?? 5)
): Promise<PrayerTimes> {
  // The API requires the date as a path segment — /v1/timings alone (no date)
  // returns 400.
  const url = `https://api.aladhan.com/v1/timings/${todayPath()}?latitude=${lat}&longitude=${lon}&method=${method}`;
  const res = await fetch(url);
  if (!res.ok) throw new LocationError("fetch-failed", `prayer-times-fetch-failed:${res.status}`);
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
    // The Geolocation API is only available on HTTPS (or localhost). Surfacing
    // this distinctly matters for local dev over a LAN IP, where it fails
    // silently with no permission prompt at all.
    if (typeof window !== "undefined" && !window.isSecureContext) {
      reject(new LocationError("insecure"));
      return;
    }
    if (!("geolocation" in navigator)) {
      reject(new LocationError("unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      resolve,
      (err) => {
        if (err.code === err.PERMISSION_DENIED) reject(new LocationError("denied"));
        else if (err.code === err.TIMEOUT) reject(new LocationError("timeout"));
        else reject(new LocationError("unavailable"));
      },
      {
        enableHighAccuracy: false,
        timeout: 10_000,
        maximumAge: 1000 * 60 * 60, // reuse a fix for up to an hour
      }
    );
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
