"use client";

import { useCallback, useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { urlBase64ToUint8Array } from "@/lib/push-client";

export type PushSupport =
  | "checking"
  | "insecure"
  | "unsupported"
  | "unsubscribed"
  | "subscribed"
  | "denied";

export function usePushSubscription() {
  const [support, setSupport] = useState<PushSupport>("checking");
  const [error, setError] = useState<string | null>(null);
  const subscribe_ = trpc.notifications.subscribe.useMutation();
  const unsubscribe_ = trpc.notifications.unsubscribe.useMutation();
  const sendTest_ = trpc.notifications.sendTest.useMutation();

  const refresh = useCallback(async () => {

    if (!window.isSecureContext) {
      setSupport("insecure");
      return;
    }
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
    setError(null);
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      setError("missing-vapid-key");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setSupport(permission === "denied" ? "denied" : "unsubscribed");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
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
      setError(err instanceof Error ? err.message : "unknown");
    }
  }, [subscribe_]);

  const unsubscribe = useCallback(async () => {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await unsubscribe_.mutateAsync({ endpoint: sub.endpoint });
      await sub.unsubscribe();
    }
    setSupport("unsubscribed");
  }, [unsubscribe_]);

  const sendTest = useCallback(async () => {
    setError(null);
    try {
      const res = await sendTest_.mutateAsync();
      if (!res.ok) setError(res.reason ?? "unknown");
      return res;
    } catch (err) {
      console.error("[push] sendTest failed:", err);
      setError(err instanceof Error ? err.message : "unknown");
      return { ok: false as const, reason: "unknown" as const };
    }
  }, [sendTest_]);

  return { support, error, subscribe, unsubscribe, sendTest, isSendingTest: sendTest_.isPending };
}
