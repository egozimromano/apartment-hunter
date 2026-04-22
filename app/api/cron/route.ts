import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { redis } from "@/lib/redis";
import { parseQuery } from "@/lib/queryParser";
import { searchAndExtract } from "@/lib/searchExtract";
import { scoreApartments } from "@/lib/scorer";

export const maxDuration = 60;

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || "noreply@example.com"}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const subKeys = (await redis.smembers("all_subs")) as string[];
    let notificationsSent = 0;

    for (const key of subKeys) {
      const raw = await redis.get(key);
      if (!raw) continue;
      const record = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (!record?.subscription || !record?.userQuery) continue;

      const seenKey = `seen:${key}`;
      const seenIds = ((await redis.smembers(seenKey)) as string[]) || [];

      try {
        const parsed = await parseQuery(record.userQuery);
        const { apartments } = await searchAndExtract(parsed);
        const { scored } = await scoreApartments(apartments, parsed, "", "");

        const newApts = scored.filter((a) => !seenIds.includes(a.id) && a.match_score >= 60);

        if (newApts.length > 0) {
          const best = newApts.sort((a, b) => b.match_score - a.match_score)[0];
          const payload = JSON.stringify({
            title: `🏠 ${newApts.length} דירות חדשות!`,
            body: `${best.title} · ${best.price ? best.price.toLocaleString("he-IL") + " ₪" : ""} · ${best.neighborhood || best.city || ""}`,
            url: best.url || "/",
            tag: "apt-alert",
          });

          try {
            await webpush.sendNotification(record.subscription, payload);
            notificationsSent++;
            const newIds = newApts.map((a) => a.id);
            if (newIds.length > 0) await redis.sadd(seenKey, ...newIds);
            await redis.expire(seenKey, 60 * 60 * 24 * 14);
          } catch (err: any) {
            if (err.statusCode === 410 || err.statusCode === 404) {
              await redis.del(key);
              await redis.srem("all_subs", key);
            }
          }
        }
      } catch (userErr: any) {
        console.error(`User ${key} error:`, userErr.message);
      }
    }

    return NextResponse.json({ checked: subKeys.length, sent: notificationsSent });
  } catch (err: any) {
    console.error("Cron error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
