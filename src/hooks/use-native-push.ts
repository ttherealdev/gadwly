"use client";

import { useEffect } from "react";
import { trpc } from "@/lib/trpc";

export function useNativePush() {
  const register = trpc.notifications.registerFcmToken.useMutation();

  useEffect(() => {
    let listeners: { remove: () => void }[] = [];

    (async () => {
      // Dynamically imported so this whole module is a no-op (and adds
      // nothing to the bundle) when running as a regular website.
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;

      const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");

      const perm = await FirebaseMessaging.requestPermissions();
      if (perm.receive !== "granted") return;

   
      await FirebaseMessaging.createChannel({
        id: "adhan",
        name: "مواقيت الصلاة",
        description: "تنبيه أذان لمواقيت الصلاة",
        importance: 5,
        sound: "adhan",
        vibration: true,
        visibility: 1,
      });

      const { token } = await FirebaseMessaging.getToken();
      if (token) register.mutate({ token });

      const sub = await FirebaseMessaging.addListener("tokenReceived", (event) => {
        if (event.token) register.mutate({ token: event.token });
      });
      listeners.push(sub);
    })();

    return () => {
      listeners.forEach((l) => l.remove());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
