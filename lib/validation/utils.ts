import { z } from "zod";

import { ApiError } from "@/lib/http";

export function parseOrThrow<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  value: unknown,
  message = "Validation failed"
): z.infer<TSchema> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join('.') || "root"}: ${issue.message}`).join('; ');
    throw new ApiError(400, `${message}: ${details}`);
  }

  return parsed.data;
}
