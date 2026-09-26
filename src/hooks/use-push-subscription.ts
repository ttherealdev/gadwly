"use client";

import { useCallback, useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { urlBase64ToUint8Array } from "@/lib/push-client";

export type PushSupport =
  | "checking"
  | "unsupported" // no Push API in this browser at all
  | "unsubscribed"
  | "subscribed"
  | "denied" // the user (or OS) explicitly blocked the notification permission
  | "unavailable"; // permission was granted, but the browser's push service itself rejected registration

export function usePushSubscription() {
  const [support, setSupport] = useState<PushSupport>("checking");
  const subscribe_ = trpc.notifications.subscribe.useMutation();
  const unsubscribe_ = trpc.notifications.unsubscribe.useMutation();

  const refresh = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setSupport("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setSupport("denied");
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    setSupport(existing ? "subscribed" : "unsubscribed");
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const subscribe = useCallback(async () => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      console.error("[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set.");
      setSupport("unavailable");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setSupport(permission === "denied" ? "denied" : "unsubscribed");
      return;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
      const json = sub.toJSON();
      await subscribe_.mutateAsync({
        endpoint: sub.endpoint,
        keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth },
        userAgent: navigator.userAgent,
      });
      setSupport("subscribed");
    } catch (err) {
   
      console.error("[push] subscribe failed:", err);
      setSupport("unavailable");
    }
  }, [subscribe_]);

  const unsubscribe = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribe_.mutateAsync({ endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
    } finally {
      setSupport("unsubscribed");
    }
  }, [unsubscribe_]);

  return { support, subscribe, unsubscribe };
}
