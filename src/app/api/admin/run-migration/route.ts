import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    // Attendance table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Attendance" (
        "id" TEXT NOT NULL,
        "techId" TEXT NOT NULL,
        "year" INTEGER NOT NULL,
        "month" INTEGER NOT NULL,
        "callouts" INTEGER NOT NULL DEFAULT 0,
        "workingDays" INTEGER NOT NULL,
        "notes" TEXT,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
        "updatedBy" TEXT,
        CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Attendance_techId_year_month_key" ON "Attendance"("techId", "year", "month")
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Attendance_year_month_idx" ON "Attendance"("year", "month")
    `);
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'Attendance_techId_fkey'
        ) THEN
          ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_techId_fkey"
            FOREIGN KEY ("techId") REFERENCES "Tech"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      END $$
    `);

    // Review table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Review" (
        "id" TEXT PRIMARY KEY,
        "source" TEXT NOT NULL DEFAULT 'google',
        "locationId" TEXT NOT NULL,
        "locationName" TEXT NOT NULL DEFAULT '',
        "authorName" TEXT NOT NULL,
        "rating" INTEGER NOT NULL,
        "text" TEXT,
        "reviewDate" TIMESTAMP NOT NULL,
        "attributedTechId" TEXT,
        "matchMethod" TEXT NOT NULL DEFAULT 'unmatched',
        "rawJson" JSONB,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Review_reviewDate_attributedTechId_idx"
        ON "Review"("reviewDate", "attributedTechId")
    `);
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'Review_attributedTechId_fkey'
        ) THEN
          ALTER TABLE "Review" ADD CONSTRAINT "Review_attributedTechId_fkey"
            FOREIGN KEY ("attributedTechId") REFERENCES "Tech"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$
    `);

    // Setting table (for goals)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Setting" (
        "key" TEXT PRIMARY KEY,
        "value" TEXT NOT NULL
      )
    `);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
