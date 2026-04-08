import { NextResponse } from "next/server";
import { checkAndEscalateOverdueSubmissions } from "@/service/approvalRequest/escalation";

export async function GET(request: Request) {
  // Verify cron secret in production
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await checkAndEscalateOverdueSubmissions();

  if (result.error) {
    return NextResponse.json(
      { error: result.error, escalated: 0 },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    escalated: result.escalated,
  });
}
