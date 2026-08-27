// BFF side of specs/001-solution-scaffold/contracts/health-api.md (governance repo):
// validates the upstream payload and maps every failure to a single safe query error —
// raw provider errors never reach the page (FR-004, security rulebook §7).
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { fetchHealthStatus } from "@/lib/api/health-client";

const healthStatusSchema = z.object({
  status: z.literal("ok"),
  service: z.string(),
  version: z.string(),
  timestampUtc: z.string(),
});

function unavailable(): TRPCError {
  return new TRPCError({
    code: "SERVICE_UNAVAILABLE",
    message: "The FlowBoard backend is unavailable.",
  });
}

export const healthRouter = createTRPCRouter({
  status: publicProcedure.query(async () => {
    const result = await fetchHealthStatus();
    if (!result.ok) {
      throw unavailable();
    }

    // Unexpected payload → error, never healthy (contract Error semantics).
    const parsed = healthStatusSchema.safeParse(result.payload);
    if (!parsed.success) {
      throw unavailable();
    }

    return parsed.data;
  }),
});
