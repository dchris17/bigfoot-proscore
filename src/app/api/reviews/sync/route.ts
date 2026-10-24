import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

// GBP API returns star ratings as strings
const GBP_STAR_MAP: Record<string, number> = {
  ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5,
};

interface IncomingReview {
  id: string;
  locationId: string;
  locationName?: string;
  authorName: string;
  rating: number | string; // integer OR GBP string ("FIVE")
  text?: string;
  reviewDate: string; // ISO string
  rawJson?: unknown;
}

async function getActiveTechs() {
  return db.tech.findMany({
    where: { active: true, included: true },
    select: { id: true, firstName: true, nicknames: true },
  }) as Promise<{ id: string; firstName: string; nicknames: string[] }[]>;
}

function matchTech(
  text: string,
  techs: { id: string; firstName: string; nicknames: string[] }[]
): { techId: string; method: string } | null {
  const lower = text.toLowerCase();
  const matches = techs.filter(t => {
    const names = [t.firstName, ...t.nicknames].filter(Boolean);
    return names.some(n => lower.includes(n.toLowerCase()));
  });
  if (matches.length === 1) return { techId: matches[0].id, method: "auto_name" };
  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { reviews: IncomingReview[] };
  if (!Array.isArray(body.reviews)) {
    return NextResponse.json({ error: "Expected { reviews: [...] }" }, { status: 400 });
  }

  const techs = await getActiveTechs();
  let upserted = 0;
  let matched = 0;

  for (const r of body.reviews) {
    const rating = typeof r.rating === "string"
      ? (GBP_STAR_MAP[r.rating.toUpperCase()] ?? 0)
      : r.rating;
    const reviewText = r.text ?? "";
    const hit = reviewText ? matchTech(reviewText, techs) : null;

    await db.$executeRawUnsafe(
      `INSERT INTO "Review" (id, source, "locationId", "locationName", "authorName", rating, text, "reviewDate", "attributedTechId", "matchMethod", "rawJson", "createdAt")
       VALUES ($1, 'google', $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET
         rating = EXCLUDED.rating,
         text = EXCLUDED.text,
         "locationName" = EXCLUDED."locationName",
         "rawJson" = EXCLUDED."rawJson"`,
      r.id,
      r.locationId,
      r.locationName ?? "",
      r.authorName,
      rating,
      reviewText || null,
      new Date(r.reviewDate).toISOString(),
      hit?.techId ?? null,
      hit ? hit.method : "unmatched",
      r.rawJson ? JSON.stringify(r.rawJson) : null,
    );
    upserted++;
    if (hit) matched++;
  }

  return NextResponse.json({ ok: true, upserted, matched });
}
