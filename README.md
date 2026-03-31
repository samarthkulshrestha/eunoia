# Eunoia

*See your beautiful thinking.*

Eunoia is an AI-powered knowledge visualization tool that transforms your
intellectual interests into an interactive 3D space. Input books, videos,
articles, or raw ideas -- Claude AI extracts the core domains, maps connections
between them, and renders everything as explorable constellation-like particle
clouds.

## Features

- **Input anything** -- books, YouTube videos, music, articles, PDFs, or
  freeform text. The AI parses your input and extracts intellectual domains.
- **3D knowledge space** -- interests are rendered as particle clouds positioned
  by a force-directed layout algorithm, with constellation lines showing
  connections.
- **Deep exploration** -- click any interest to generate a six-dimensional
  knowledge tree: foundations, taxonomy, key thinkers, cultural impact, adjacent
  surprises, and controversies.
- **Intellectual bridges** -- select two interests to discover substantive
  stepping-stone connections between seemingly unrelated domains.
- **Opinionated recommendations** -- curated resources (books, papers, videos,
  essays) with specific reasons to engage with each one.

## Tech Stack

- **Frontend**: Next.js, React, Three.js (via @react-three/fiber + drei),
  Tailwind CSS
- **State**: Zustand
- **Backend**: Next.js API routes, Prisma ORM, PostgreSQL
- **AI**: Anthropic Claude (via @anthropic-ai/sdk)

## Getting Started

### Prerequisites

- Node.js
- PostgreSQL
- An [Anthropic API key](https://console.anthropic.com/)

### Setup

```bash
git clone https://github.com/samarthkulshrestha/be.git
cd be
npm install
```

Create a `.env` file:

```
DATABASE_URL="postgresql://user:password@localhost:5432/eunoia"
ANTHROPIC_API_KEY="sk-ant-..."
```

Set up the database and start the dev server:

```bash
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
  app/
    api/
      interests/    # interest retrieval + knowledge tree generation
      input/        # user input parsing
      bridge/       # intellectual bridge finding
    page.tsx        # main page (3D scene + UI overlay)
  components/       # Scene, InterestCloud, SidePanel, InputPanel, etc.
  lib/
    ai.ts           # Claude API integration
    prompts.ts      # system prompts for AI tasks
    store.ts        # Zustand state management
    forceLayout.ts  # force-directed graph layout
    db.ts           # Prisma client
    types.ts        # TypeScript interfaces
prisma/
  schema.prisma     # database schema (Interest, Edge, Resource, InputItem)
```

## License

All rights reserved.
