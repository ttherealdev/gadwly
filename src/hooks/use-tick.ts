"use client";

import { useEffect, useState } from "react";

export function useTick(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (id !== null) return;
      setNow(new Date());
      id = setInterval(() => setNow(new Date()), intervalMs);
    };
    const stop = () => {
      if (id === null) return;
      clearInterval(id);
      id = null;
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs]);

  return now;
}
