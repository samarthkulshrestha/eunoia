import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateKnowledgeTree } from "@/lib/ai";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const interest = await db.interest.findUnique({ where: { id } });

  if (!interest) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Return cached if available
  if (interest.foundations) {
    return NextResponse.json({
      foundations: interest.foundations,
      taxonomy: interest.taxonomy,
      thinkers: interest.thinkers,
      culturalImpact: interest.culturalImpact,
      adjacentSurprises: interest.adjacentSurprises,
      controversies: interest.controversies,
    });
  }

  // Generate with AI and cache
  const tree = await generateKnowledgeTree(interest.name);

  const updated = await db.interest.update({
    where: { id },
    data: {
      foundations: tree.foundations,
      taxonomy: tree.taxonomy,
      thinkers: tree.thinkers,
      culturalImpact: tree.culturalImpact,
      adjacentSurprises: tree.adjacentSurprises,
      controversies: tree.controversies,
    },
  });

  // Also create resources from thinkers' works
  if (tree.thinkers?.items) {
    for (const thinker of tree.thinkers.items) {
      if (thinker.works) {
        for (const work of thinker.works) {
          await db.resource.create({
            data: {
              type: "book",
              title: work,
              author: thinker.name,
              why: thinker.description,
              interestId: id,
            },
          });
        }
      }
    }
  }

  return NextResponse.json({
    foundations: updated.foundations,
    taxonomy: updated.taxonomy,
    thinkers: updated.thinkers,
    culturalImpact: updated.culturalImpact,
    adjacentSurprises: updated.adjacentSurprises,
    controversies: updated.controversies,
  });
}
