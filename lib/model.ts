/**
 * GLM 5.2 via its OpenAI-compatible endpoint, wired through the Vercel AI SDK.
 * Swap model/endpoint with GLM_MODEL / GLM_BASE_URL if needed.
 */
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const GLM_MODEL = process.env.GLM_MODEL ?? "glm-5.2";

const provider = createOpenAICompatible({
  name: "zai",
  baseURL: process.env.GLM_BASE_URL ?? "https://api.z.ai/api/paas/v4",
  apiKey: process.env.GLM_API_KEY ?? "",
});

export const gafferModel = provider(GLM_MODEL);

export function hasModelKey() {
  return Boolean(process.env.GLM_API_KEY);
}
