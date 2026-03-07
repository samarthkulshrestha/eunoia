import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const interests = await db.interest.findMany({
    include: {
      children: true,
      resources: { where: { dismissed: false } },
      edgesFrom: { include: { to: true } },
      edgesTo: { include: { from: true } },
    },
  });
  return NextResponse.json(interests);
}
