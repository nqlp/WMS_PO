import { requireShopifySession } from "@/lib/auth/require-auth";
import { parseOrThrow } from "@/lib/validation/utils";
import { NextResponse } from "next/server";
import { listLogs } from "@/lib/logs/service";
import { listLogsFilterSchema } from "@/lib/validation/logs";
import { handleRouteError } from "@/lib/http";

export async function GET(request: Request) {
    try {
        await requireShopifySession(request, { csrf: false });
        const url = new URL(request.url);
        const filters = parseOrThrow(
            listLogsFilterSchema,
            Object.fromEntries(url.searchParams.entries()),
            "Invalid log filters"
        )

        const logs = await listLogs(filters);
        return NextResponse.json({ logs });
    } catch (error) {
        console.error("Error fetching logs:", error);
        return handleRouteError(error);
    }
}