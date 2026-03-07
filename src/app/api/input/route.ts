import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseInput } from "@/lib/ai";

async function fetchYouTubeTitle(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      redirect: "follow",
    });
    const html = await res.text();
    const match = html.match(/<title>(.*?)<\/title>/i);
    if (match) {
      return match[1].replace(" - YouTube", "").trim();
    }
  } catch {}
  return null;
}

async function enrichContent(content: string, type: string): Promise<string> {
  if (type === "youtube" && content.match(/youtube\.com|youtu\.be/i)) {
    const title = await fetchYouTubeTitle(content);
    if (title) {
      return `YouTube video: "${title}" (${content})`;
    }
  }
  return content;
}

export async function POST(req: NextRequest) {
  try {
    const { content, type } = await req.json();

    // Save the raw input
    const inputItem = await db.inputItem.create({
      data: { content, type },
    });

    // Enrich content with metadata (e.g. fetch YouTube title)
    const enrichedContent = await enrichContent(content, type);

    // Parse with AI
    const parsed = await parseInput(enrichedContent, type);

    // Create interests from parsed result
    const interests = [];
    for (const item of parsed.interests) {
    // Check if interest already exists
    const existing = await db.interest.findFirst({
      where: { name: { equals: item.name, mode: "insensitive" } },
    });

    if (existing) {
      interests.push(existing);
    } else {
      // Assign a random hue-based color
      const hue = Math.floor(Math.random() * 360);
      const color = `hsl(${hue}, 90%, 75%)`;

      const interest = await db.interest.create({
        data: {
          name: item.name,
          description: item.description,
          color,
          source: "manual",
          posX: (Math.random() - 0.5) * 12,
          posY: (Math.random() - 0.5) * 12,
          posZ: (Math.random() - 0.5) * 12,
        },
      });
      interests.push(interest);
    }

    // Update input item
    if (interests.length > 0) {
      await db.inputItem.update({
        where: { id: inputItem.id },
        data: { parsed: true, interestId: interests[0].id },
      });
    }
  }

  // Create edges for related interests
  for (const item of parsed.interests) {
    if (!item.relatedTo) continue;
    const fromInterest = interests.find(
      (i) => i.name.toLowerCase() === item.name.toLowerCase()
    );
    if (!fromInterest) continue;

    for (const relatedName of item.relatedTo) {
      const toInterest = await db.interest.findFirst({
        where: { name: { equals: relatedName, mode: "insensitive" } },
      });
      if (toInterest && toInterest.id !== fromInterest.id) {
        await db.edge.upsert({
          where: {
            fromId_toId: { fromId: fromInterest.id, toId: toInterest.id },
          },
          update: {},
          create: {
            fromId: fromInterest.id,
            toId: toInterest.id,
            type: "related",
          },
        });
      }
    }
  }

    return NextResponse.json({ interests });
  } catch (error) {
    console.error("Error parsing input:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to parse input" },
      { status: 500 }
    );
  }
}
