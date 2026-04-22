import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function POST(req: NextRequest) {
  try {
    const { subscription, userQuery } = await req.json();
    if (!subscription?.endpoint) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }
    const key = `sub:${Buffer.from(subscription.endpoint).toString("base64").slice(0, 40)}`;
    await redis.set(key, JSON.stringify({
      subscription,
      userQuery: userQuery || "",
      createdAt: new Date().toISOString(),
    }));
    await redis.sadd("all_subs", key);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
