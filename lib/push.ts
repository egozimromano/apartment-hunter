"use client";

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export async function subscribeToPush(vapidPublicKey: string, userQuery: string): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });
    }
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub, userQuery }),
    });
    return res.ok;
  } catch (err) {
    console.error("Push subscription error:", err);
    return false;
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
    }
    return true;
  } catch { return false; }
}

export async function getSubscriptionStatus(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch { return false; }
}
