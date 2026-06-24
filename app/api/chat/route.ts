import { streamText, type ModelMessage } from "ai";
import { gafferModel, hasModelKey } from "@/lib/model";
import { getMemWal } from "@/lib/memwal";
import {
  namespaceFor,
  buildSystemPrompt,
  parseTake,
  classifyKind,
  isCapturable,
  formatTake,
  type ParsedTake,
} from "@/lib/gaffer";

// MemWal pulls in @mysten/seal + @mysten/sui — needs the Node runtime.
export const runtime = "nodejs";
export const maxDuration = 60;

interface ChatBody {
  handle: string;
  messages: { role: "user" | "assistant"; content: string }[];
}

export async function POST(req: Request) {
  const { handle, messages }: ChatBody = await req.json();

  if (!hasModelKey()) {
    return new Response(
      "GAFFER needs a model key. Add GLM_API_KEY to .env.local and restart `pnpm dev`.",
      { status: 200 },
    );
  }

  const ns = namespaceFor(handle || "guest");
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const query = lastUser?.content ?? "";

  // Recall relevant past takes, and capture this message on the record.
  let recalled: ParsedTake[] = [];
  try {
    const memwal = getMemWal(ns);
    const r = await memwal.recall({
      query,
      limit: 6,
      maxDistance: 0.75,
      namespace: ns,
    });
    recalled = r.results.map(parseTake);

    if (query && isCapturable(query)) {
      // Fire-and-forget: put the chat take on Walrus in the tagged format.
      void memwal
        .remember(formatTake(classifyKind(query), query), ns)
        .catch(() => {});
    }
  } catch {
    // Memory unavailable — GAFFER still talks, just without receipts.
  }

  const system = buildSystemPrompt(handle || "guest", recalled);
  const modelMessages: ModelMessage[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const result = streamText({
    model: gafferModel,
    system,
    messages: modelMessages,
    temperature: 0.8,
  });

  return result.toTextStreamResponse();
}
