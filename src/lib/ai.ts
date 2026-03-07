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
