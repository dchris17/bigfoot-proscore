export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import AttendanceForm from "./AttendanceForm";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export default async function AttendancePage() {
  const now = new Date();
  const year = now.getFullYear();
  const mon = now.getMonth() + 1;

  const techs = await db.tech.findMany({
    where: { included: true, active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  }) as { id: string; name: string }[];

  const existing = await db.attendance.findMany({
    where: { year, month: mon },
    select: { techId: true, callouts: true, workingDays: true, notes: true },
  }) as { techId: string; callouts: number; workingDays: number; notes: string | null }[];

  const existingMap = Object.fromEntries(existing.map(e => [e.techId, e]));

  const rows = techs.map(t => ({
    techId: t.id,
    name: t.name,
    callouts: existingMap[t.id]?.callouts ?? 0,
    workingDays: existingMap[t.id]?.workingDays ?? 22,
    notes: existingMap[t.id]?.notes ?? "",
  }));

  return (
    <div className="min-h-screen" style={{ background: "#0b0b10", color: "#e2e8f0" }}>
      <div className="border-b" style={{ background: "#111118", borderColor: "#1e1e2e" }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-sm" style={{ color: "#4b5563" }}>← The Footprint</a>
            <span style={{ color: "#1e1e2e" }}>/</span>
            <h1 className="text-sm font-semibold text-white">Attendance</h1>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#1e1e2e", color: "#64748b" }}>
            {now.toLocaleString("default", { month: "long" })} {year}
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <p className="text-sm mb-6" style={{ color: "#64748b" }}>
          Enter call-outs (unexcused absences) for each tech this month. Attendance score = (working days − call-outs) ÷ working days.
        </p>
        <AttendanceForm rows={rows} year={year} month={mon} />
      </div>
    </div>
  );
}
