import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const interest = await db.interest.findUnique({
    where: { id },
    include: {
      children: true,
      resources: { where: { dismissed: false } },
      edgesFrom: { include: { to: true } },
      edgesTo: { include: { from: true } },
    },
  });
  if (!interest) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(interest);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.interest.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
