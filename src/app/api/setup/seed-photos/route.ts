import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/app/pin/actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

// Hardcoded map: exact tech name → public photo path
const PHOTO_MAP: Record<string, string> = {
  "Aldo Guerrero":    "/photos/Aldo Guerrero.jpg",
  "Arturo Lopez":     "/photos/Arturo Lopez.jpg",
  "Chris Bogardus":   "/photos/Chris Bogardus.jpg",
  "David Cox":        "/photos/David Cox.jpg",
  "Jake Rowe":        "/photos/Jake Rowe.png",
  "Justin Montgomery":"/photos/Justin Montgomery.jpg",
  "Larry Alexander":  "/photos/Larry Alexander.jpg",
  "Marc Rodriguez":   "/photos/Marc Rodriguez.jpg",
  "Noah Calvert":     "/photos/Noah Calvert.jpg",
  "Noah Walters":     "/photos/Noah Walters.jpg",
  "Troy Winter":      "/photos/Troy Winter.jpg",
};

export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Manager PIN required" }, { status: 401 });
  }
  const techs: { id: string; name: string }[] = await db.tech.findMany({
    select: { id: true, name: true },
  });

  const updated: { name: string; photoUrl: string }[] = [];
  const unmatched: string[] = [];

  for (const tech of techs) {
    const photoUrl = PHOTO_MAP[tech.name];
    if (photoUrl) {
      await db.tech.update({ where: { id: tech.id }, data: { photoUrl } });
      updated.push({ name: tech.name, photoUrl });
    } else {
      unmatched.push(tech.name);
    }
  }

  return NextResponse.json({ updated, unmatched });
}
