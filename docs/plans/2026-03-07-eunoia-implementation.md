# Eunoia Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a personal knowledge visualization tool that maps interests as 3D particle clouds, enables deep multidimensional exploration with taste, and discovers bridging paths between domains.

**Architecture:** Next.js full-stack app. Frontend uses React Three Fiber for 3D particle cloud visualization with custom shaders. Backend uses Next.js API routes that call Claude API for intelligent content generation, caching results into a PostgreSQL database (using Prisma) with a graph-like schema. No auth for v1 — single-user local-first.

**Tech Stack:** Next.js 14 (App Router), React Three Fiber, Three.js, GLSL shaders, Prisma, PostgreSQL, Claude API (@anthropic-ai/sdk), TypeScript, Tailwind CSS

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`, `postcss.config.js`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Create: `.gitignore`, `.env.example`

**Step 1: Initialize Next.js project**

Run:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
```

**Step 2: Install 3D and AI dependencies**

Run:
```bash
npm install three @react-three/fiber @react-three/drei @anthropic-ai/sdk prisma @prisma/client
npm install -D @types/three
```

**Step 3: Set up environment variables**

Create `.env.example`:
```
DATABASE_URL="postgresql://user:password@localhost:5432/eunoia"
ANTHROPIC_API_KEY="sk-ant-..."
```

Create `.env` (gitignored) with real values.

**Step 4: Create minimal page to verify setup**

Replace `src/app/page.tsx`:
```tsx
export default function Home() {
  return (
    <main className="h-screen w-screen bg-[#0a0a0f] text-white flex items-center justify-center">
      <p className="text-lg font-light tracking-wide opacity-60">eunoia</p>
    </main>
  );
}
```

Update `src/app/globals.css` to only contain Tailwind directives:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  overflow: hidden;
}
```

**Step 5: Verify it runs**

Run: `npm run dev`
Expected: Dark page with "eunoia" centered at http://localhost:3000

**Step 6: Commit**

```bash
git add -A
git commit -m "scaffold next.js project with 3d and ai dependencies"
```

---

### Task 2: Database Schema & Prisma Setup

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/db.ts`

**Step 1: Initialize Prisma**

Run: `npx prisma init`

**Step 2: Define the graph-like schema**

Write `prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Interest {
  id          String   @id @default(cuid())
  name        String
  description String?
  depth       Int      @default(0)    // 0 = root domain, 1+ = sub-interests
  source      String   @default("manual") // manual, ai-generated
  color       String?  // hex color for cloud
  parentId    String?
  parent      Interest?  @relation("InterestTree", fields: [parentId], references: [id])
  children    Interest[] @relation("InterestTree")

  // Knowledge tree dimensions (cached AI output)
  foundations      Json?
  taxonomy         Json?
  thinkers         Json?
  culturalImpact   Json?
  adjacentSurprises Json?
  controversies    Json?

  resources  Resource[]
  inputItems InputItem[]

  // Graph edges
  edgesFrom  Edge[] @relation("EdgeFrom")
  edgesTo    Edge[] @relation("EdgeTo")

  // Spatial positioning
  posX       Float @default(0)
  posY       Float @default(0)
  posZ       Float @default(0)

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model Edge {
  id       String @id @default(cuid())
  fromId   String
  toId     String
  from     Interest @relation("EdgeFrom", fields: [fromId], references: [id], onDelete: Cascade)
  to       Interest @relation("EdgeTo", fields: [toId], references: [id], onDelete: Cascade)
  type     String   @default("related") // related, bridge
  strength Float    @default(0.5)

  createdAt DateTime @default(now())

  @@unique([fromId, toId])
}

model Resource {
  id         String   @id @default(cuid())
  type       String   // book, paper, video, person, essay
  title      String
  author     String?
  url        String?
  why        String?  // why this is worth your time
  detail     String?  // specific chapter/section rec
  interestId String
  interest   Interest @relation(fields: [interestId], references: [id], onDelete: Cascade)
  dismissed  Boolean  @default(false)
  upvoted    Boolean  @default(false)

  createdAt  DateTime @default(now())
}

model InputItem {
  id         String   @id @default(cuid())
  type       String   // book, youtube, music, article, pdf, raw
  content    String   // the raw input text/url
  parsed     Boolean  @default(false)
  interestId String?
  interest   Interest? @relation(fields: [interestId], references: [id], onDelete: SetNull)

  createdAt  DateTime @default(now())
}
```

**Step 3: Create Prisma client singleton**

Write `src/lib/db.ts`:
```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

**Step 4: Run migration**

Run:
```bash
npx prisma migrate dev --name init
```
Expected: Migration applied, Prisma Client generated.

**Step 5: Verify with Prisma Studio**

Run: `npx prisma studio`
Expected: Opens browser with empty tables visible.

**Step 6: Commit**

```bash
git add prisma/ src/lib/db.ts
git commit -m "add database schema with graph-like interest model"
```

---

### Task 3: AI Service — Interest Parsing & Knowledge Generation

**Files:**
- Create: `src/lib/ai.ts`
- Create: `src/lib/prompts.ts`

**Step 1: Create the taste system prompt**

Write `src/lib/prompts.ts`:
```typescript
export const TASTE_SYSTEM_PROMPT = `You are a deeply knowledgeable, opinionated polymath — the kind of person who has read widely across disciplines, has strong taste, and gives recommendations like a brilliant friend over drinks.

Your core principles:
- Be SPECIFIC and OPINIONATED. Never give generic lists. "Read chapter 7 of Judea Pearl's Causality" not "here are 20 ML books."
- Surface UNEXPECTED connections. A curious polymath would know these, a textbook wouldn't mention them.
- Every description must tell the reader something they DIDN'T already know. No obvious statements.
- Prioritize PRIMARY SOURCES and SEMINAL WORKS over summaries and listicles.
- Always explain WHY something is worth their time, not just WHAT it is.
- Be multidimensional: cover the technical, mathematical, philosophical, cultural, creative, and controversial angles.
- Have personality. Be the friend who says "you NEED to read this" not the algorithm that says "you might also like."
- Quality over quantity. 3 perfect recommendations beat 15 mediocre ones.`;

export const PARSE_INPUT_PROMPT = `Given user input, extract the core intellectual interests and topics.

Return a JSON object:
{
  "interests": [
    {
      "name": "Short name for the interest/domain",
      "description": "One compelling sentence about why this matters",
      "relatedTo": ["names of other interests this connects to, if any"]
    }
  ]
}

Be thoughtful about granularity. "Machine Learning" is a domain. "Supervised Learning" is a sub-interest. Don't over-split — identify the core domains the input belongs to.

If the input is a book, extract the KEY intellectual themes, not just "this is a book about X."
If the input is a YouTube link or video title, infer the intellectual domain.
If the input is music, consider the genre, cultural movement, artistic philosophy.
If the input is raw text, identify the core arguments and fields.`;

export const KNOWLEDGE_TREE_PROMPT = `For the interest "{interest}", generate a deep, multidimensional knowledge tree.

Return a JSON object with these six dimensions:

{
  "foundations": {
    "summary": "Why these foundations matter for this interest",
    "items": [
      { "name": "Topic", "description": "Why this is essential — be specific and surprising", "depth": "beginner|intermediate|advanced" }
    ]
  },
  "taxonomy": {
    "summary": "How this field is actually structured (not the Wikipedia version)",
    "items": [
      { "name": "Sub-field", "description": "What makes this sub-field interesting or important", "children": ["further breakdowns if useful"] }
    ]
  },
  "thinkers": {
    "summary": "The voices that matter and why",
    "items": [
      { "name": "Person", "description": "Why they matter — their unique angle, not their Wikipedia bio", "works": ["specific works worth reading"] }
    ]
  },
  "culturalImpact": {
    "summary": "How this field is reshaping the world",
    "items": [
      { "name": "Domain of impact", "description": "Specific, surprising ways this interest affects art, society, politics, economics" }
    ]
  },
  "adjacentSurprises": {
    "summary": "Connections a curious polymath would know",
    "items": [
      { "name": "Surprising connection", "description": "Why this unexpected link is genuinely illuminating" }
    ]
  },
  "controversies": {
    "summary": "Where the field is contested or evolving",
    "items": [
      { "name": "Open question or controversy", "description": "What's at stake and why smart people disagree" }
    ]
  }
}

Be opinionated. Have taste. This is NOT an encyclopedia entry — it's what a brilliant mentor would tell you over coffee.`;

export const BRIDGE_INTERESTS_PROMPT = `Find the intellectual bridge between "{interestA}" and "{interestB}".

These are two seemingly disparate domains. Your job is to find the genuine, substantive topics that connect them — NOT superficial analogies, but real fields of study, thinkers, or ideas that someone could explore to intellectually travel from one domain to the other.

Return a JSON object:
{
  "bridgeThesis": "One sentence explaining the deep connection between these two domains",
  "bridges": [
    {
      "name": "Bridge topic name",
      "description": "Why this genuinely connects the two domains — be specific",
      "closerTo": "A or B — which domain this bridge is closer to",
      "resources": [
        { "type": "book|paper|video|person|essay", "title": "Specific title", "author": "Author", "why": "Why this is the right entry point for this bridge" }
      ]
    }
  ]
}

Find 5-8 bridge topics. Order them as a path from {interestA} to {interestB} — the first bridge should be close to A, the last close to B, with genuine intellectual stepping stones in between.`;
```

**Step 2: Create the AI service**

Write `src/lib/ai.ts`:
```typescript
import Anthropic from "@anthropic-ai/sdk";
import {
  TASTE_SYSTEM_PROMPT,
  PARSE_INPUT_PROMPT,
  KNOWLEDGE_TREE_PROMPT,
  BRIDGE_INTERESTS_PROMPT,
} from "./prompts";

const client = new Anthropic();

async function queryAI(systemPrompt: string, userPrompt: string) {
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: TASTE_SYSTEM_PROMPT + "\n\n" + systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();

  return JSON.parse(jsonStr);
}

export async function parseInput(input: string, inputType: string) {
  return queryAI(
    PARSE_INPUT_PROMPT,
    `Input type: ${inputType}\nContent: ${input}`
  );
}

export async function generateKnowledgeTree(interest: string) {
  return queryAI(
    KNOWLEDGE_TREE_PROMPT.replace("{interest}", interest),
    `Generate the knowledge tree for: ${interest}`
  );
}

export async function generateBridgeInterests(
  interestA: string,
  interestB: string
) {
  const prompt = BRIDGE_INTERESTS_PROMPT
    .replaceAll("{interestA}", interestA)
    .replaceAll("{interestB}", interestB);
  return queryAI(
    prompt,
    `Find bridges between: ${interestA} and ${interestB}`
  );
}
```

**Step 3: Commit**

```bash
git add src/lib/ai.ts src/lib/prompts.ts
git commit -m "add ai service with taste prompts for parsing, exploration, and bridging"
```

---

### Task 4: API Routes

**Files:**
- Create: `src/app/api/interests/route.ts`
- Create: `src/app/api/interests/[id]/route.ts`
- Create: `src/app/api/interests/[id]/explore/route.ts`
- Create: `src/app/api/bridge/route.ts`
- Create: `src/app/api/input/route.ts`

**Step 1: Create the input parsing endpoint**

Write `src/app/api/input/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseInput } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const { content, type } = await req.json();

  // Save the raw input
  const inputItem = await db.inputItem.create({
    data: { content, type },
  });

  // Parse with AI
  const parsed = await parseInput(content, type);

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
      const color = `hsl(${hue}, 70%, 60%)`;

      const interest = await db.interest.create({
        data: {
          name: item.name,
          description: item.description,
          color,
          source: "manual",
          posX: (Math.random() - 0.5) * 20,
          posY: (Math.random() - 0.5) * 20,
          posZ: (Math.random() - 0.5) * 20,
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
}
```

**Step 2: Create interests CRUD endpoints**

Write `src/app/api/interests/route.ts`:
```typescript
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
```

Write `src/app/api/interests/[id]/route.ts`:
```typescript
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
```

**Step 3: Create the explore (knowledge tree) endpoint**

Write `src/app/api/interests/[id]/explore/route.ts`:
```typescript
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
```

**Step 4: Create the bridge endpoint**

Write `src/app/api/bridge/route.ts`:
```typescript
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
    // Fetch the bridge interest nodes
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

  // Create bridge interest nodes
  const bridgeInterests = [];
  for (const bridge of result.bridges) {
    // Blend colors from both parents
    const interest = await db.interest.create({
      data: {
        name: bridge.name,
        description: bridge.description,
        source: "ai-generated",
        depth: 1,
        // Position between the two clouds
        posX: (interestA.posX + interestB.posX) / 2 + (Math.random() - 0.5) * 4,
        posY: (interestA.posY + interestB.posY) / 2 + (Math.random() - 0.5) * 4,
        posZ: (interestA.posZ + interestB.posZ) / 2 + (Math.random() - 0.5) * 4,
      },
    });

    // Create resources for this bridge
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

    // Create edges from both parent interests to bridge
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
```

**Step 5: Verify API routes compile**

Run: `npm run build`
Expected: Build succeeds with no type errors.

**Step 6: Commit**

```bash
git add src/app/api/
git commit -m "add api routes for input parsing, interest exploration, and bridging"
```

---

### Task 5: State Management & Data Fetching

**Files:**
- Create: `src/lib/store.ts`
- Create: `src/lib/types.ts`

**Step 1: Define TypeScript types**

Write `src/lib/types.ts`:
```typescript
export interface Interest {
  id: string;
  name: string;
  description: string | null;
  depth: number;
  source: string;
  color: string | null;
  parentId: string | null;
  posX: number;
  posY: number;
  posZ: number;
  children: Interest[];
  resources: Resource[];
  edgesFrom: (Edge & { to: Interest })[];
  edgesTo: (Edge & { from: Interest })[];
  // Knowledge tree (cached)
  foundations: KnowledgeDimension | null;
  taxonomy: KnowledgeDimension | null;
  thinkers: KnowledgeDimension | null;
  culturalImpact: KnowledgeDimension | null;
  adjacentSurprises: KnowledgeDimension | null;
  controversies: KnowledgeDimension | null;
}

export interface Edge {
  id: string;
  fromId: string;
  toId: string;
  type: string;
  strength: number;
}

export interface Resource {
  id: string;
  type: string;
  title: string;
  author: string | null;
  url: string | null;
  why: string | null;
  detail: string | null;
  dismissed: boolean;
  upvoted: boolean;
}

export interface KnowledgeDimension {
  summary: string;
  items: KnowledgeItem[];
}

export interface KnowledgeItem {
  name: string;
  description: string;
  depth?: string;
  children?: string[];
  works?: string[];
}

export interface BridgeResult {
  bridgeThesis?: string;
  bridges: Interest[];
  cached: boolean;
}
```

**Step 2: Create Zustand store**

Run: `npm install zustand`

Write `src/lib/store.ts`:
```typescript
import { create } from "zustand";
import type { Interest, BridgeResult } from "./types";

interface EunoiaState {
  // Data
  interests: Interest[];
  selectedInterest: Interest | null;
  knowledgeTree: Record<string, any> | null;

  // UI state
  bridgeMode: boolean;
  bridgeSelections: [string | null, string | null];
  bridgeResult: BridgeResult | null;
  inputPanelOpen: boolean;
  sidePanelOpen: boolean;
  loading: boolean;
  loadingMessage: string;

  // Actions
  setInterests: (interests: Interest[]) => void;
  selectInterest: (interest: Interest | null) => void;
  setKnowledgeTree: (tree: Record<string, any> | null) => void;
  toggleBridgeMode: () => void;
  setBridgeSelection: (id: string) => void;
  setBridgeResult: (result: BridgeResult | null) => void;
  toggleInputPanel: () => void;
  setSidePanelOpen: (open: boolean) => void;
  setLoading: (loading: boolean, message?: string) => void;

  // API actions
  fetchInterests: () => Promise<void>;
  addInput: (content: string, type: string) => Promise<void>;
  exploreInterest: (id: string) => Promise<void>;
  bridgeInterests: (idA: string, idB: string) => Promise<void>;
}

export const useStore = create<EunoiaState>((set, get) => ({
  interests: [],
  selectedInterest: null,
  knowledgeTree: null,
  bridgeMode: false,
  bridgeSelections: [null, null],
  bridgeResult: null,
  inputPanelOpen: false,
  sidePanelOpen: false,
  loading: false,
  loadingMessage: "",

  setInterests: (interests) => set({ interests }),
  selectInterest: (interest) =>
    set({ selectedInterest: interest, sidePanelOpen: !!interest, knowledgeTree: null }),
  setKnowledgeTree: (tree) => set({ knowledgeTree: tree }),
  toggleBridgeMode: () =>
    set((s) => ({
      bridgeMode: !s.bridgeMode,
      bridgeSelections: [null, null],
      bridgeResult: null,
    })),
  setBridgeSelection: (id) =>
    set((s) => {
      if (s.bridgeSelections[0] === null) {
        return { bridgeSelections: [id, null] };
      }
      if (s.bridgeSelections[0] === id) return {};
      return { bridgeSelections: [s.bridgeSelections[0], id] };
    }),
  setBridgeResult: (result) => set({ bridgeResult: result }),
  toggleInputPanel: () => set((s) => ({ inputPanelOpen: !s.inputPanelOpen })),
  setSidePanelOpen: (open) =>
    set({ sidePanelOpen: open, ...(!open ? { selectedInterest: null } : {}) }),
  setLoading: (loading, message) =>
    set({ loading, loadingMessage: message || "" }),

  fetchInterests: async () => {
    const res = await fetch("/api/interests");
    const data = await res.json();
    set({ interests: data });
  },

  addInput: async (content, type) => {
    set({ loading: true, loadingMessage: "Parsing your input..." });
    const res = await fetch("/api/input", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, type }),
    });
    const data = await res.json();
    set({ loading: false });
    await get().fetchInterests();
  },

  exploreInterest: async (id) => {
    set({ loading: true, loadingMessage: "Exploring with taste..." });
    const res = await fetch(`/api/interests/${id}/explore`, {
      method: "POST",
    });
    const tree = await res.json();
    set({ knowledgeTree: tree, loading: false });
  },

  bridgeInterests: async (idA, idB) => {
    set({ loading: true, loadingMessage: "Finding intellectual bridges..." });
    const res = await fetch("/api/bridge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interestAId: idA, interestBId: idB }),
    });
    const result = await res.json();
    set({ bridgeResult: result, loading: false });
    await get().fetchInterests();
  },
}));
```

**Step 3: Commit**

```bash
git add src/lib/types.ts src/lib/store.ts package.json package-lock.json
git commit -m "add types and zustand state management"
```

---

### Task 6: 3D Scene — Basic Particle Cloud Rendering

**Files:**
- Create: `src/components/Scene.tsx`
- Create: `src/components/InterestCloud.tsx`
- Create: `src/components/CloudParticles.tsx`
- Modify: `src/app/page.tsx`

**Step 1: Create the particle cloud component**

Write `src/components/CloudParticles.tsx`:
```tsx
"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface CloudParticlesProps {
  position: [number, number, number];
  color: string;
  count?: number;
  radius?: number;
  opacity?: number;
}

export function CloudParticles({
  position,
  color,
  count = 200,
  radius = 2,
  opacity = 0.8,
}: CloudParticlesProps) {
  const meshRef = useRef<THREE.Points>(null);
  const timeRef = useRef(0);

  const { positions, sizes, opacities } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const opacities = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Gaussian-like distribution: dense core, sparse periphery
      const r = radius * Math.pow(Math.random(), 0.5);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Larger particles at core, smaller at edges
      const distFromCenter = r / radius;
      sizes[i] = (1 - distFromCenter * 0.7) * 0.15;
      opacities[i] = (1 - distFromCenter) * opacity;
    }

    return { positions, sizes, opacities };
  }, [count, radius, opacity]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    timeRef.current += delta;

    // Subtle ambient drift
    const posAttr = meshRef.current.geometry.attributes.position;
    const arr = posAttr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      arr[idx] += Math.sin(timeRef.current + i * 0.1) * 0.001;
      arr[idx + 1] += Math.cos(timeRef.current + i * 0.15) * 0.001;
      arr[idx + 2] += Math.sin(timeRef.current * 0.5 + i * 0.2) * 0.001;
    }
    posAttr.needsUpdate = true;
  });

  const threeColor = useMemo(() => new THREE.Color(color), [color]);

  return (
    <points ref={meshRef} position={position}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        color={threeColor}
        size={0.1}
        transparent
        opacity={opacity}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
```

**Step 2: Create the interest cloud wrapper**

Write `src/components/InterestCloud.tsx`:
```tsx
"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { CloudParticles } from "./CloudParticles";
import { useStore } from "@/lib/store";
import type { Interest } from "@/lib/types";

interface InterestCloudProps {
  interest: Interest;
}

export function InterestCloud({ interest }: InterestCloudProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { selectInterest, bridgeMode, setBridgeSelection, bridgeSelections } =
    useStore();

  const isSelected =
    bridgeSelections[0] === interest.id ||
    bridgeSelections[1] === interest.id;

  const position: [number, number, number] = [
    interest.posX,
    interest.posY,
    interest.posZ,
  ];

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (bridgeMode) {
      setBridgeSelection(interest.id);
    } else {
      selectInterest(interest);
    }
  };

  const color = interest.color || "#6688ff";
  const particleCount = interest.source === "ai-generated" ? 100 : 200;
  const cloudOpacity = interest.source === "ai-generated" ? 0.4 : 0.8;

  return (
    <group ref={groupRef} position={position}>
      <CloudParticles
        position={[0, 0, 0]}
        color={color}
        count={particleCount}
        radius={1.5}
        opacity={cloudOpacity}
      />
      {/* Clickable invisible sphere for interaction */}
      <mesh onClick={handleClick}>
        <sphereGeometry args={[1.8, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      {/* Label */}
      <Html
        center
        distanceFactor={15}
        style={{
          color: "white",
          fontSize: "12px",
          fontWeight: 300,
          letterSpacing: "0.05em",
          textTransform: "lowercase",
          opacity: isSelected ? 1 : 0.7,
          pointerEvents: "none",
          whiteSpace: "nowrap",
          textShadow: "0 0 10px rgba(0,0,0,0.8)",
        }}
      >
        {interest.name}
      </Html>
      {/* Selection glow */}
      {isSelected && (
        <mesh>
          <sphereGeometry args={[2, 32, 32]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.1}
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </group>
  );
}
```

**Step 3: Create the main scene**

Write `src/components/Scene.tsx`:
```tsx
"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { useEffect } from "react";
import { InterestCloud } from "./InterestCloud";
import { useStore } from "@/lib/store";

function SceneContent() {
  const { interests, fetchInterests } = useStore();

  useEffect(() => {
    fetchInterests();
  }, [fetchInterests]);

  return (
    <>
      <ambientLight intensity={0.3} />
      <Stars
        radius={100}
        depth={50}
        count={2000}
        factor={4}
        saturation={0}
        fade
        speed={0.5}
      />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={3}
        maxDistance={50}
        enablePan
      />
      {interests.map((interest) => (
        <InterestCloud key={interest.id} interest={interest} />
      ))}
    </>
  );
}

export function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 20], fov: 60 }}
      style={{ background: "#0a0a0f" }}
      gl={{ antialias: true, alpha: false }}
    >
      <SceneContent />
    </Canvas>
  );
}
```

**Step 4: Update the main page**

Replace `src/app/page.tsx`:
```tsx
import { Scene } from "@/components/Scene";

export default function Home() {
  return (
    <main className="h-screen w-screen">
      <Scene />
    </main>
  );
}
```

**Step 5: Verify rendering**

Run: `npm run dev`
Expected: Dark 3D scene with stars. No clouds yet (no interests in DB), but scene renders without errors.

**Step 6: Commit**

```bash
git add src/components/ src/app/page.tsx
git commit -m "add 3d scene with particle cloud rendering"
```

---

### Task 7: UI Overlay — Input Panel

**Files:**
- Create: `src/components/InputPanel.tsx`
- Create: `src/components/UIOverlay.tsx`
- Modify: `src/app/page.tsx`

**Step 1: Create the input panel**

Write `src/components/InputPanel.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";

const INPUT_TYPES = [
  { value: "raw", label: "Interest" },
  { value: "book", label: "Book" },
  { value: "youtube", label: "YouTube" },
  { value: "music", label: "Music" },
  { value: "article", label: "Article" },
  { value: "pdf", label: "PDF" },
] as const;

export function InputPanel() {
  const { inputPanelOpen, toggleInputPanel, addInput, loading } = useStore();
  const [content, setContent] = useState("");
  const [type, setType] = useState<string>("raw");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || loading) return;
    await addInput(content.trim(), type);
    setContent("");
  };

  if (!inputPanelOpen) {
    return (
      <button
        onClick={toggleInputPanel}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
      >
        <span className="text-xl font-light">+</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 text-white">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-light tracking-widest uppercase opacity-60">
          Add to your universe
        </h3>
        <button
          onClick={toggleInputPanel}
          className="opacity-40 hover:opacity-100 transition-opacity"
        >
          &times;
        </button>
      </div>

      <div className="flex gap-1.5 mb-4 flex-wrap">
        {INPUT_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setType(t.value)}
            className={`px-3 py-1 rounded-full text-xs transition-colors ${
              type === t.value
                ? "bg-white/20 text-white"
                : "bg-white/5 text-white/40 hover:text-white/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            type === "raw"
              ? "Type an interest... (e.g., 'category theory')"
              : type === "book"
                ? "Book title and author..."
                : type === "youtube"
                  ? "YouTube video URL..."
                  : type === "music"
                    ? "Album or track name..."
                    : type === "article"
                      ? "Paste article text..."
                      : "Describe the PDF content..."
          }
          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-white/20 resize-none focus:outline-none focus:border-white/30 transition-colors"
          rows={3}
        />
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="mt-3 w-full py-2 rounded-xl bg-white/10 text-sm font-light tracking-wide hover:bg-white/20 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Thinking..." : "Add"}
        </button>
      </form>
    </div>
  );
}
```

**Step 2: Create the UI overlay**

Write `src/components/UIOverlay.tsx`:
```tsx
"use client";

import { useStore } from "@/lib/store";
import { InputPanel } from "./InputPanel";

export function UIOverlay() {
  const { bridgeMode, toggleBridgeMode, loading, loadingMessage } = useStore();

  return (
    <>
      {/* Title */}
      <div className="fixed top-6 left-6 z-50">
        <h1 className="text-white/40 text-sm font-light tracking-[0.3em] uppercase">
          eunoia
        </h1>
      </div>

      {/* Bridge mode toggle */}
      <div className="fixed top-6 right-6 z-50">
        <button
          onClick={toggleBridgeMode}
          className={`px-4 py-2 rounded-full text-xs tracking-widest uppercase transition-all ${
            bridgeMode
              ? "bg-white/20 text-white border border-white/40"
              : "bg-white/5 text-white/40 border border-white/10 hover:text-white/60"
          }`}
        >
          {bridgeMode ? "Exit Bridge" : "Bridge"}
        </button>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-4 text-white/60 text-sm font-light">
          {loadingMessage}
        </div>
      )}

      {/* Input panel */}
      <InputPanel />
    </>
  );
}
```

**Step 3: Update the main page**

Replace `src/app/page.tsx`:
```tsx
import { Scene } from "@/components/Scene";
import { UIOverlay } from "@/components/UIOverlay";

export default function Home() {
  return (
    <main className="h-screen w-screen">
      <Scene />
      <UIOverlay />
    </main>
  );
}
```

**Step 4: Verify**

Run: `npm run dev`
Expected: 3D scene with "eunoia" title top-left, "Bridge" button top-right, "+" button bottom-right that opens the input panel.

**Step 5: Commit**

```bash
git add src/components/InputPanel.tsx src/components/UIOverlay.tsx src/app/page.tsx
git commit -m "add ui overlay with input panel and bridge mode toggle"
```

---

### Task 8: Side Panel — Knowledge Tree Display

**Files:**
- Create: `src/components/SidePanel.tsx`
- Create: `src/components/KnowledgeDimension.tsx`
- Modify: `src/components/UIOverlay.tsx`

**Step 1: Create the knowledge dimension component**

Write `src/components/KnowledgeDimension.tsx`:
```tsx
"use client";

import { useState } from "react";
import type { KnowledgeDimension as KDType } from "@/lib/types";

interface Props {
  title: string;
  dimension: KDType;
}

export function KnowledgeDimensionView({ title, dimension }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full py-3 flex justify-between items-center text-left group"
      >
        <span className="text-xs tracking-widest uppercase text-white/50 group-hover:text-white/80 transition-colors">
          {title}
        </span>
        <span className="text-white/20 text-xs">{expanded ? "−" : "+"}</span>
      </button>
      {expanded && (
        <div className="pb-4">
          <p className="text-sm text-white/40 mb-3 leading-relaxed">
            {dimension.summary}
          </p>
          <div className="space-y-3">
            {dimension.items.map((item, i) => (
              <div key={i} className="pl-3 border-l border-white/10">
                <p className="text-sm text-white/80 font-medium">
                  {item.name}
                </p>
                <p className="text-xs text-white/40 mt-1 leading-relaxed">
                  {item.description}
                </p>
                {item.works && item.works.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.works.map((work, j) => (
                      <span
                        key={j}
                        className="text-xs bg-white/5 px-2 py-0.5 rounded-full text-white/30"
                      >
                        {work}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Create the side panel**

Write `src/components/SidePanel.tsx`:
```tsx
"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { KnowledgeDimensionView } from "./KnowledgeDimension";
import type { KnowledgeDimension } from "@/lib/types";

const DIMENSIONS: { key: string; label: string }[] = [
  { key: "foundations", label: "Foundations" },
  { key: "taxonomy", label: "Taxonomy" },
  { key: "thinkers", label: "Thinkers & Voices" },
  { key: "culturalImpact", label: "Cultural Impact" },
  { key: "adjacentSurprises", label: "Adjacent Surprises" },
  { key: "controversies", label: "Controversies & Open Questions" },
];

export function SidePanel() {
  const {
    selectedInterest,
    sidePanelOpen,
    setSidePanelOpen,
    knowledgeTree,
    exploreInterest,
    loading,
  } = useStore();

  useEffect(() => {
    if (selectedInterest && !knowledgeTree) {
      exploreInterest(selectedInterest.id);
    }
  }, [selectedInterest, knowledgeTree, exploreInterest]);

  if (!sidePanelOpen || !selectedInterest) return null;

  return (
    <div className="fixed top-0 right-0 h-screen w-[420px] z-40 bg-black/90 backdrop-blur-xl border-l border-white/10 overflow-y-auto">
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-lg text-white font-light tracking-wide">
              {selectedInterest.name}
            </h2>
            {selectedInterest.description && (
              <p className="text-sm text-white/40 mt-1 leading-relaxed">
                {selectedInterest.description}
              </p>
            )}
          </div>
          <button
            onClick={() => setSidePanelOpen(false)}
            className="text-white/30 hover:text-white/60 transition-colors text-lg"
          >
            &times;
          </button>
        </div>

        {/* Resources */}
        {selectedInterest.resources.length > 0 && (
          <div className="mb-6">
            <p className="text-xs tracking-widest uppercase text-white/30 mb-3">
              Resources
            </p>
            <div className="space-y-2">
              {selectedInterest.resources.map((r) => (
                <div
                  key={r.id}
                  className="bg-white/5 rounded-lg p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-white/20 bg-white/5 px-1.5 py-0.5 rounded">
                      {r.type}
                    </span>
                    <span className="text-sm text-white/70">{r.title}</span>
                  </div>
                  {r.author && (
                    <p className="text-xs text-white/30 mt-1">{r.author}</p>
                  )}
                  {r.why && (
                    <p className="text-xs text-white/40 mt-1 italic">
                      {r.why}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Knowledge Tree */}
        {loading && !knowledgeTree && (
          <p className="text-sm text-white/30 font-light">
            Exploring with taste...
          </p>
        )}
        {knowledgeTree && (
          <div>
            <p className="text-xs tracking-widest uppercase text-white/30 mb-3">
              Knowledge Tree
            </p>
            {DIMENSIONS.map(({ key, label }) => {
              const dim = knowledgeTree[key] as KnowledgeDimension | undefined;
              if (!dim) return null;
              return (
                <KnowledgeDimensionView
                  key={key}
                  title={label}
                  dimension={dim}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 3: Add side panel to UIOverlay**

Update `src/components/UIOverlay.tsx` — add import and render `<SidePanel />`:
```tsx
"use client";

import { useStore } from "@/lib/store";
import { InputPanel } from "./InputPanel";
import { SidePanel } from "./SidePanel";

export function UIOverlay() {
  const { bridgeMode, toggleBridgeMode, loading, loadingMessage } = useStore();

  return (
    <>
      {/* Title */}
      <div className="fixed top-6 left-6 z-50">
        <h1 className="text-white/40 text-sm font-light tracking-[0.3em] uppercase">
          eunoia
        </h1>
      </div>

      {/* Bridge mode toggle */}
      <div className="fixed top-6 right-6 z-50">
        <button
          onClick={toggleBridgeMode}
          className={`px-4 py-2 rounded-full text-xs tracking-widest uppercase transition-all ${
            bridgeMode
              ? "bg-white/20 text-white border border-white/40"
              : "bg-white/5 text-white/40 border border-white/10 hover:text-white/60"
          }`}
        >
          {bridgeMode ? "Exit Bridge" : "Bridge"}
        </button>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-4 text-white/60 text-sm font-light">
          {loadingMessage}
        </div>
      )}

      {/* Side panel */}
      <SidePanel />

      {/* Input panel */}
      <InputPanel />
    </>
  );
}
```

**Step 4: Verify**

Run: `npm run dev`
Expected: Scene with UI overlay. Add an interest via the input panel → cloud appears → click cloud → side panel opens with knowledge tree loading.

**Step 5: Commit**

```bash
git add src/components/SidePanel.tsx src/components/KnowledgeDimension.tsx src/components/UIOverlay.tsx
git commit -m "add side panel with knowledge tree display"
```

---

### Task 9: Bridge Mode — Cloud Drift Animation & Intersection

**Files:**
- Modify: `src/components/InterestCloud.tsx`
- Modify: `src/components/Scene.tsx`
- Create: `src/components/BridgeZone.tsx`

**Step 1: Create the bridge intersection zone component**

Write `src/components/BridgeZone.tsx`:
```tsx
"use client";

import { useMemo } from "react";
import { CloudParticles } from "./CloudParticles";
import { Html } from "@react-three/drei";
import { useStore } from "@/lib/store";
import type { Interest } from "@/lib/types";

interface BridgeZoneProps {
  interestA: Interest;
  interestB: Interest;
}

export function BridgeZone({ interestA, interestB }: BridgeZoneProps) {
  const { bridgeResult, selectInterest, bridgeMode } = useStore();

  const midpoint: [number, number, number] = useMemo(
    () => [
      (interestA.posX + interestB.posX) / 2,
      (interestA.posY + interestB.posY) / 2,
      (interestA.posZ + interestB.posZ) / 2,
    ],
    [interestA, interestB]
  );

  if (!bridgeResult || !bridgeResult.bridges.length) return null;

  return (
    <group>
      {/* Blended intersection cloud */}
      <CloudParticles
        position={midpoint}
        color="#ffffff"
        count={150}
        radius={2.5}
        opacity={0.3}
      />
      {/* Bridge topic nodes */}
      {bridgeResult.bridges.map((bridge, i) => {
        const angle = (i / bridgeResult.bridges.length) * Math.PI * 2;
        const r = 1.5;
        const pos: [number, number, number] = [
          midpoint[0] + Math.cos(angle) * r,
          midpoint[1] + Math.sin(angle) * r * 0.6,
          midpoint[2] + Math.sin(angle) * r * 0.4,
        ];

        return (
          <group key={bridge.id} position={pos}>
            <CloudParticles
              position={[0, 0, 0]}
              color={interestA.color || "#ffffff"}
              count={40}
              radius={0.5}
              opacity={0.5}
            />
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                selectInterest(bridge);
              }}
            >
              <sphereGeometry args={[0.6, 16, 16]} />
              <meshBasicMaterial transparent opacity={0} />
            </mesh>
            <Html
              center
              distanceFactor={12}
              style={{
                color: "white",
                fontSize: "10px",
                fontWeight: 300,
                opacity: 0.6,
                pointerEvents: "none",
                whiteSpace: "nowrap",
                textShadow: "0 0 10px rgba(0,0,0,0.8)",
              }}
            >
              {bridge.name}
            </Html>
          </group>
        );
      })}
    </group>
  );
}
```

**Step 2: Update Scene to handle bridge mode**

Replace `src/components/Scene.tsx`:
```tsx
"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { useEffect } from "react";
import { InterestCloud } from "./InterestCloud";
import { BridgeZone } from "./BridgeZone";
import { useStore } from "@/lib/store";

function SceneContent() {
  const {
    interests,
    fetchInterests,
    bridgeMode,
    bridgeSelections,
    bridgeInterests,
    bridgeResult,
  } = useStore();

  useEffect(() => {
    fetchInterests();
  }, [fetchInterests]);

  // Trigger bridge computation when two selections are made
  useEffect(() => {
    if (bridgeMode && bridgeSelections[0] && bridgeSelections[1]) {
      bridgeInterests(bridgeSelections[0], bridgeSelections[1]);
    }
  }, [bridgeMode, bridgeSelections, bridgeInterests]);

  const interestA = interests.find((i) => i.id === bridgeSelections[0]);
  const interestB = interests.find((i) => i.id === bridgeSelections[1]);

  return (
    <>
      <ambientLight intensity={0.3} />
      <Stars
        radius={100}
        depth={50}
        count={2000}
        factor={4}
        saturation={0}
        fade
        speed={0.5}
      />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={3}
        maxDistance={50}
        enablePan
      />
      {interests
        .filter((i) => i.depth === 0 || i.source === "manual")
        .map((interest) => (
          <InterestCloud key={interest.id} interest={interest} />
        ))}
      {/* Bridge zone */}
      {bridgeMode && interestA && interestB && bridgeResult && (
        <BridgeZone interestA={interestA} interestB={interestB} />
      )}
    </>
  );
}

export function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 20], fov: 60 }}
      style={{ background: "#0a0a0f" }}
      gl={{ antialias: true, alpha: false }}
    >
      <SceneContent />
    </Canvas>
  );
}
```

**Step 3: Update InterestCloud to animate drift in bridge mode**

Replace `src/components/InterestCloud.tsx`:
```tsx
"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { CloudParticles } from "./CloudParticles";
import { useStore } from "@/lib/store";
import type { Interest } from "@/lib/types";

interface InterestCloudProps {
  interest: Interest;
}

export function InterestCloud({ interest }: InterestCloudProps) {
  const groupRef = useRef<THREE.Group>(null);
  const {
    selectInterest,
    bridgeMode,
    setBridgeSelection,
    bridgeSelections,
    interests,
    bridgeResult,
  } = useStore();

  const isSelected =
    bridgeSelections[0] === interest.id ||
    bridgeSelections[1] === interest.id;

  const basePosition: [number, number, number] = [
    interest.posX,
    interest.posY,
    interest.posZ,
  ];

  // Animate drift toward partner in bridge mode
  useFrame(() => {
    if (!groupRef.current) return;

    if (bridgeMode && isSelected && bridgeSelections[0] && bridgeSelections[1] && bridgeResult) {
      const partnerId =
        bridgeSelections[0] === interest.id
          ? bridgeSelections[1]
          : bridgeSelections[0];
      const partner = interests.find((i) => i.id === partnerId);
      if (!partner) return;

      // Drift 30% toward the midpoint
      const midX = (interest.posX + partner.posX) / 2;
      const midY = (interest.posY + partner.posY) / 2;
      const midZ = (interest.posZ + partner.posZ) / 2;
      const targetX = interest.posX + (midX - interest.posX) * 0.3;
      const targetY = interest.posY + (midY - interest.posY) * 0.3;
      const targetZ = interest.posZ + (midZ - interest.posZ) * 0.3;

      groupRef.current.position.lerp(
        new THREE.Vector3(targetX, targetY, targetZ),
        0.02
      );
    } else {
      // Return to base position
      groupRef.current.position.lerp(
        new THREE.Vector3(...basePosition),
        0.05
      );
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (bridgeMode) {
      setBridgeSelection(interest.id);
    } else {
      selectInterest(interest);
    }
  };

  const color = interest.color || "#6688ff";
  const particleCount = interest.source === "ai-generated" ? 100 : 200;
  const cloudOpacity = interest.source === "ai-generated" ? 0.4 : 0.8;

  return (
    <group ref={groupRef} position={basePosition}>
      <CloudParticles
        position={[0, 0, 0]}
        color={color}
        count={particleCount}
        radius={1.5}
        opacity={cloudOpacity}
      />
      <mesh onClick={handleClick}>
        <sphereGeometry args={[1.8, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      <Html
        center
        distanceFactor={15}
        style={{
          color: "white",
          fontSize: "12px",
          fontWeight: 300,
          letterSpacing: "0.05em",
          textTransform: "lowercase",
          opacity: isSelected ? 1 : 0.7,
          pointerEvents: "none",
          whiteSpace: "nowrap",
          textShadow: "0 0 10px rgba(0,0,0,0.8)",
        }}
      >
        {interest.name}
      </Html>
      {isSelected && (
        <mesh>
          <sphereGeometry args={[2, 32, 32]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.1}
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </group>
  );
}
```

**Step 4: Verify**

Run: `npm run dev`
Expected: Add 2+ interests → toggle Bridge Mode → click two clouds → they drift toward each other → intersection zone appears with bridge topics.

**Step 5: Commit**

```bash
git add src/components/BridgeZone.tsx src/components/InterestCloud.tsx src/components/Scene.tsx
git commit -m "add bridge mode with cloud drift animation and intersection zone"
```

---

### Task 10: Search Bar

**Files:**
- Create: `src/components/SearchBar.tsx`
- Modify: `src/components/UIOverlay.tsx`

**Step 1: Create the search bar component**

Write `src/components/SearchBar.tsx`:
```tsx
"use client";

import { useState, useMemo } from "react";
import { useStore } from "@/lib/store";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const { interests, selectInterest } = useStore();

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return interests.filter((i) => i.name.toLowerCase().includes(q)).slice(0, 5);
  }, [query, interests]);

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-80">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 200)}
        placeholder="Search interests..."
        className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors"
      />
      {focused && results.length > 0 && (
        <div className="mt-2 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
          {results.map((interest) => (
            <button
              key={interest.id}
              onClick={() => {
                selectInterest(interest);
                setQuery("");
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-white/60 hover:bg-white/5 hover:text-white transition-colors"
            >
              {interest.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Add SearchBar to UIOverlay**

Add import and render `<SearchBar />` in `src/components/UIOverlay.tsx` above the title.

**Step 3: Commit**

```bash
git add src/components/SearchBar.tsx src/components/UIOverlay.tsx
git commit -m "add search bar for quick interest navigation"
```

---

### Task 11: Polish & Integration Testing

**Files:**
- Modify: `src/app/layout.tsx` (metadata, fonts)
- Modify: `src/app/globals.css` (scrollbar styling)

**Step 1: Update layout with proper metadata and fonts**

Replace `src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500"] });

export const metadata: Metadata = {
  title: "Eunoia",
  description: "See your beautiful thinking",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

**Step 2: Add scrollbar and selection styling**

Append to `src/app/globals.css`:
```css
::-webkit-scrollbar {
  width: 4px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}
::selection {
  background: rgba(255, 255, 255, 0.15);
}
```

**Step 3: End-to-end manual test**

Run: `npm run dev`

Test flow:
1. Open app → empty 3D scene with stars, "eunoia" title, Bridge button, "+" button
2. Click "+" → input panel opens
3. Type "machine learning" as a raw interest → submit → cloud appears
4. Type "philosophy" as a raw interest → submit → second cloud appears
5. Click ML cloud → side panel opens with knowledge tree loading → dimensions expand
6. Close side panel
7. Click "Bridge" → bridge mode active
8. Click ML cloud → highlighted
9. Click Philosophy cloud → clouds drift, intersection zone appears with bridge topics
10. Click a bridge topic → side panel shows it as a connection

**Step 4: Build check**

Run: `npm run build`
Expected: Build succeeds.

**Step 5: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "polish layout, fonts, and scrollbar styling"
```

---

Plan complete and saved to `docs/plans/2026-03-07-eunoia-implementation.md`. Two execution options:

**1. Subagent-Driven (this session)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** — Open a new session with executing-plans, batch execution with checkpoints

Which approach?