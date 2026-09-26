"use client";

import { useEffect, useRef, useState } from "react";
import {
  fetchPrayerTimesByCoords,
  getBrowserLocation,
  nextPrayer,
  toMinutes,
  LocationError,
  PRAYER_SOUND_FILES,
  type PrayerKey,
  type PrayerTimes,
} from "@/lib/prayer-times";
import { trpc } from "@/lib/trpc";
import { showAppNotification } from "@/lib/notify";

export type PrayerStatus =
  | "idle"
  | "locating"
  | "ready"
  | "denied"
  | "insecure"
  | "timeout"
  | "fetch-failed"
  | "error";

const CACHE_KEY = "gadwly:lastCoords";
const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 12; // 12h

const PRAYER_PREF_FIELD = {
  Fajr: "notifyFajr",
  Dhuhr: "notifyDhuhr",
  Asr: "notifyAsr",
  Maghrib: "notifyMaghrib",
  Isha: "notifyIsha",
} as const;

export function usePrayerTimes() {
  const [times, setTimes] = useState<PrayerTimes | null>(null);
  const [status, setStatus] = useState<PrayerStatus>("idle");
  const notifiedRef = useRef<Set<string>>(new Set());
  const audioRefs = useRef<Partial<Record<PrayerKey, HTMLAudioElement>>>({});

  const { data: prefs } = trpc.preferences.get.useQuery();
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  async function enable() {
    if (status === "locating") return;

    setStatus("locating");
    try {
      const pos = await getBrowserLocation();
      const t = await fetchPrayerTimesByCoords(pos.coords.latitude, pos.coords.longitude);
      setTimes(t);
      setStatus("ready");
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ lat: pos.coords.latitude, lon: pos.coords.longitude, at: Date.now() })
      );
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    } catch (err) {
      if (err instanceof LocationError) {
        setStatus(
          err.kind === "unsupported" || err.kind === "unavailable" ? "error" : err.kind
        );
      } else {
        console.error("[usePrayerTimes] unclassified failure:", err);
        setStatus("error");
      }
    }
  }

  useEffect(() => {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return;
    try {
      const { lat, lon, at } = JSON.parse(raw);
      if (Date.now() - at < CACHE_MAX_AGE_MS) {
        fetchPrayerTimesByCoords(lat, lon)
          .then((t) => {
            setTimes(t);
            setStatus("ready");
          })
          .catch((err) => {
            console.error("[usePrayerTimes] cache rehydrate failed:", err);
          });
      }
    } catch {
      /* ignore malformed cache */
    }
  }, []);

  useEffect(() => {
    (Object.keys(PRAYER_SOUND_FILES) as PrayerKey[]).forEach((key) => {
      audioRefs.current[key] = new Audio(PRAYER_SOUND_FILES[key]);
    });
  }, []);

  useEffect(() => {
    if (!times) return;
    const id = setInterval(() => {
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const dayKey = now.toDateString();

      (Object.keys(times) as PrayerKey[]).forEach((key) => {
        const flag = `${dayKey}:${key}`;
        if (toMinutes(times[key]) !== nowMin || notifiedRef.current.has(flag)) return;
        notifiedRef.current.add(flag);

        const p = prefsRef.current;
        const enabled = p?.prayerNotifyEnabled !== false && p?.[PRAYER_PREF_FIELD[key]] !== false;
        if (!enabled) return;

        const soundOn = p?.notificationSoundOn !== false;
        if (soundOn) audioRefs.current[key]?.play().catch(() => {});

        showAppNotification("حان موعد الأذان", {
          body: key,
          silent: !soundOn,
          tag: `prayer-${key}`,
          icon: "/icons/icon-192.png",
        });
      });
    }, 30_000);
    return () => clearInterval(id);
  }, [times]);

  return {
    times,
    status,
    enable,
    next: times ? nextPrayer(times) : null,
  };
}
