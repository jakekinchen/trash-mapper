import { NextResponse } from "next/server";
import { fetchAustin311PollutionReports } from "@/lib/austin311";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await fetchAustin311PollutionReports();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch Austin 311 pollution reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch Austin 311 pollution reports" },
      { status: 502 },
    );
  }
}
