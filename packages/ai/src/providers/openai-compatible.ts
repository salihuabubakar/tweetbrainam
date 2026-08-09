import type { AIFailure, AIProvider, GenerateObjectOutput } from "@tweetbrainam/core";
import { err, ok } from "@tweetbrainam/core";
import { z } from "zod";

const chatResponseSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }) })).min(1),
  usage: z.object({ prompt_tokens: z.number(), completion_tokens: z.number() }).optional(),
});

export type OpenAICompatibleConfig = {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
};

const classify = (status: number): AIFailure["kind"] => {
  if (status === 429) return "rate_limited";
  if (status >= 500 || status === 402 || status === 401) return "unavailable";
  return "unknown";
};

export function createOpenAICompatibleProvider(config: OpenAICompatibleConfig): AIProvider {
  return {
    name: config.name,

    async generateObject({ system, prompt, schema }) {
      const startedAt = Date.now();

      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!response.ok) {
        return err({
          kind: classify(response.status),
          detail: `${config.name} ${response.status}: ${await response.text()}`,
        });
      }

      const body = chatResponseSchema.safeParse(await response.json());
      if (!body.success) {
        return err({ kind: "invalid_output", detail: `${config.name} returned an unknown shape` });
      }

      const content = body.data.choices[0]?.message.content;
      if (!content) {
        return err({ kind: "invalid_output", detail: `${config.name} returned empty content` });
      }

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(content);
      } catch {
        return err({ kind: "invalid_output", detail: `${config.name} returned invalid JSON` });
      }

      const parsed = schema.safeParse(parsedJson);
      if (!parsed.success) {
        return err({
          kind: "invalid_output",
          detail: `${config.name} output failed validation: ${parsed.error.issues
            .map((issue) => `${issue.path.join(".")} ${issue.message}`)
            .join("; ")}`,
        });
      }

      const output: GenerateObjectOutput<typeof parsed.data> = {
        value: parsed.data,
        usage: {
          provider: config.name,
          model: config.model,
          inputTokens: body.data.usage?.prompt_tokens ?? 0,
          outputTokens: body.data.usage?.completion_tokens ?? 0,
          latencyMs: Date.now() - startedAt,
        },
      };

      return ok(output);
    },
  };
}
