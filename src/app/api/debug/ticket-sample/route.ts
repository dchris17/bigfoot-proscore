import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BASE_URL = `https://${process.env.FIELDROUTES_SUBDOMAIN ?? "aversepest"}.pestroutes.com/api`;

async function frGet(entity: string, action: string, params: Record<string, string>) {
  const url = new URL(`${BASE_URL}/${entity}/${action}`);
  url.searchParams.set("authenticationKey", process.env.FIELDROUTES_AUTH_KEY ?? "");
  url.searchParams.set("authenticationToken", process.env.FIELDROUTES_AUTH_TOKEN ?? "");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  return res.json();
}

export async function GET() {
  // Get a sample appointment with a ticketID
  const appt = await prisma.appointment.findFirst({
    where: { status: 1, date: { gte: new Date("2026-10-01") } },
    select: { id: true, rawJson: true },
  });
  if (!appt) return NextResponse.json({ error: "no appt" });

  const raw = appt.rawJson as Record<string, unknown>;
  const ticketId = raw.ticketID as string;
  if (!ticketId || ticketId === "0") return NextResponse.json({ error: "no ticketID", raw });

  const ticketRes = await frGet("ticket", "get", { ticketIDs: ticketId });
  return NextResponse.json({ apptId: appt.id, ticketId, ticketRes });
}
