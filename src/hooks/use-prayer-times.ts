"use client";

import { useEffect, useRef, useState } from "react";
import {
  fetchPrayerTimesByCoords,
  getBrowserLocation,
  nextPrayer,
  toMinutes,
  type PrayerTimes,
} from "@/lib/prayer-times";

export function usePrayerTimes() {
  const [times, setTimes] = useState<PrayerTimes | null>(null);
  const [status, setStatus] = useState<"idle" | "locating" | "ready" | "denied" | "error">("idle");
  const notifiedRef = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function enable() {
    setStatus("locating");
    try {
      const pos = await getBrowserLocation();
      const t = await fetchPrayerTimesByCoords(pos.coords.latitude, pos.coords.longitude);
      setTimes(t);
      setStatus("ready");
      localStorage.setItem(
        "gadwly:lastCoords",
        JSON.stringify({ lat: pos.coords.latitude, lon: pos.coords.longitude, at: Date.now() })
      );
    } catch {
      setStatus("denied");
    }
  }

  // Re-hydrate silently from a recent cached fix so the widget doesn't
  // start empty on every visit.
  useEffect(() => {
    const raw = localStorage.getItem("gadwly:lastCoords");
    if (!raw) return;
    try {
      const { lat, lon, at } = JSON.parse(raw);
      if (Date.now() - at < 1000 * 60 * 60 * 12) {
        fetchPrayerTimesByCoords(lat, lon)
          .then((t) => {
            setTimes(t);
            setStatus("ready");
          })
          .catch(() => {});
      }
    } catch {
      /* ignore malformed cache */
    }
  }, []);

  // Every minute, check whether we just crossed a prayer time and, if so,
  // play the adhan alert once per prayer per day.
  useEffect(() => {
    if (!times) return;
    const id = setInterval(() => {
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const dayKey = now.toDateString();

      (Object.keys(times) as (keyof PrayerTimes)[]).forEach((key) => {
        const flag = `${dayKey}:${key}`;
        if (toMinutes(times[key]) === nowMin && !notifiedRef.current.has(flag)) {
          notifiedRef.current.add(flag);
          audioRef.current?.play().catch(() => {});
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("حان موعد الأذان", { body: key });
          }
        }
      });
    }, 30_000);
    return () => clearInterval(id);
  }, [times]);

  useEffect(() => {
    // Placeholder <audio> src — the user said they'll supply the actual
    // adhan clip; drop it at /public/sounds/adhan.mp3 and this just works.
    audioRef.current = new Audio("/sounds/adhan.mp3");
  }, []);

  return {
    times,
    status,
    enable,
    next: times ? nextPrayer(times) : null,
  };
}
