CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "techId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "callouts" INTEGER NOT NULL DEFAULT 0,
    "workingDays" INTEGER NOT NULL,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Attendance_techId_year_month_key" ON "Attendance"("techId", "year", "month");
CREATE INDEX "Attendance_year_month_idx" ON "Attendance"("year", "month");

ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_techId_fkey" FOREIGN KEY ("techId") REFERENCES "Tech"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
