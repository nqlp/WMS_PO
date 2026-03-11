import { z } from "zod";
import { ACTIVITY_TYPES } from "@/lib/logs/types";

export const listLogsFilterSchema = z.object({
    activity: z.enum([...ACTIVITY_TYPES]).optional(),
    dateStart: z.string().optional(),
    dateEnd: z.string().optional(),
    user: z.string().trim().optional(),
    barcode: z.string().trim().optional(),
    sortBy: z.enum(["createdAt"]).optional().default("createdAt"),
    sortDirection: z.enum(["asc", "desc"]).optional().default("desc"),
    referenceDoc: z.string().trim().optional(),
});
export type LogListFilters = z.infer<typeof listLogsFilterSchema>;
