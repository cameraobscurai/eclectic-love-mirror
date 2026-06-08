// Lovable AI Gateway provider. Server-only — reads LOVABLE_API_KEY at call time.
// Use inside a `createServerFn().handler()` or server route handler.
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}
