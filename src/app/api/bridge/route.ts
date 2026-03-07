import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateBridgeInterests } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const { interestAId, interestBId } = await req.json();

  const [interestA, interestB] = await Promise.all([
    db.interest.findUnique({ where: { id: interestAId } }),
    db.interest.findUnique({ where: { id: interestBId } }),
  ]);

  if (!interestA || !interestB) {
    return NextResponse.json({ error: "Interest not found" }, { status: 404 });
  }

  // Check if bridge already computed
  const existingBridges = await db.edge.findMany({
    where: {
      type: "bridge",
      OR: [
        { fromId: interestAId, toId: interestBId },
        { fromId: interestBId, toId: interestAId },
      ],
    },
    include: { from: true, to: true },
  });

  if (existingBridges.length > 0) {
    const bridgeInterestIds = new Set<string>();
    for (const edge of existingBridges) {
      if (edge.fromId !== interestAId && edge.fromId !== interestBId)
        bridgeInterestIds.add(edge.fromId);
      if (edge.toId !== interestAId && edge.toId !== interestBId)
        bridgeInterestIds.add(edge.toId);
    }
    const bridgeInterests = await db.interest.findMany({
      where: { id: { in: Array.from(bridgeInterestIds) } },
      include: { resources: { where: { dismissed: false } } },
    });
    return NextResponse.json({ bridges: bridgeInterests, cached: true });
  }

  // Generate bridge with AI
  const result = await generateBridgeInterests(interestA.name, interestB.name);

  const bridgeInterests = [];
  for (const bridge of result.bridges) {
    const interest = await db.interest.create({
      data: {
        name: bridge.name,
        description: bridge.description,
        source: "ai-generated",
        depth: 1,
        posX: (interestA.posX + interestB.posX) / 2 + (Math.random() - 0.5) * 4,
        posY: (interestA.posY + interestB.posY) / 2 + (Math.random() - 0.5) * 4,
        posZ: (interestA.posZ + interestB.posZ) / 2 + (Math.random() - 0.5) * 4,
      },
    });

    if (bridge.resources) {
      for (const res of bridge.resources) {
        await db.resource.create({
          data: {
            type: res.type,
            title: res.title,
            author: res.author,
            why: res.why,
            interestId: interest.id,
          },
        });
      }
    }

    await db.edge.create({
      data: {
        fromId: interestAId,
        toId: interest.id,
        type: "bridge",
        strength: bridge.closerTo === "A" ? 0.8 : 0.3,
      },
    });
    await db.edge.create({
      data: {
        fromId: interestBId,
        toId: interest.id,
        type: "bridge",
        strength: bridge.closerTo === "B" ? 0.8 : 0.3,
      },
    });

    bridgeInterests.push(interest);
  }

  return NextResponse.json({
    bridgeThesis: result.bridgeThesis,
    bridges: bridgeInterests,
    cached: false,
  });
}
