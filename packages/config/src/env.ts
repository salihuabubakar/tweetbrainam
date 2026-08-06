import { z } from "zod";

export const nodeEnvSchema = z.enum(["development", "test", "production"]).default("development");

export const commonEnvShape = {
  NODE_ENV: nodeEnvSchema,
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
} satisfies z.ZodRawShape;

export function parseEnv<Shape extends z.ZodRawShape>(
  shape: Shape,
  source: Record<string, string | undefined> = process.env,
): z.infer<z.ZodObject<Shape>> {
  const result = z.object(shape).safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment:\n${issues}`);
  }
  return result.data;
}
