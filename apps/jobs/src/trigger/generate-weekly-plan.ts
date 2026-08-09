import { logger, schemaTask } from "@trigger.dev/sdk";
import { generateWeeklyPlan } from "@tweetbrainam/core";
import { z } from "zod";
import { createPlanDeps } from "../deps";

export const generateWeeklyPlanTask = schemaTask({
  id: "generate-weekly-plan",
  schema: z.object({
    userId: z.string().uuid(),
    weekStart: z.string().optional(),
  }),
  maxDuration: 300,
  run: async (payload) => {
    const result = await generateWeeklyPlan(createPlanDeps(), {
      userId: payload.userId,
      ...(payload.weekStart ? { weekStart: payload.weekStart } : {}),
    });

    if (!result.ok) {
      logger.error("weekly plan failed", { userId: payload.userId, code: result.error.code });
      throw new Error(result.error.message);
    }

    logger.info("weekly plan ready", {
      userId: payload.userId,
      weekStart: result.value.plan.weekStart,
      slots: result.value.plan.slots.length,
      provider: result.value.usage?.provider ?? "cached",
    });

    return { weekStart: result.value.plan.weekStart, slots: result.value.plan.slots.length };
  },
});
