"use client";

export async function showAppNotification(
  title: string,
  options: NotificationOptions = {}
) {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

  try {
    // `.ready` never resolves if no service worker is active (e.g. an
    // insecure-context registration that silently failed) — without a
    // timeout this would hang forever with nothing shown and no error.
    const reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("service worker not ready")), 3000)
      ),
    ]);
    await reg.showNotification(title, options);
  } catch (err) {
    console.error("[notify] showNotification failed:", err);
  }
}
