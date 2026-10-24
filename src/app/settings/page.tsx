export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { FootprintShell } from "@/components/footprint";
import { TechManager } from "./TechManager";
import { GoalsEditor } from "./GoalsEditor";
import AttendanceForm from "../admin/attendance/AttendanceForm";
import { getGoals } from "@/lib/goals";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export default async function SettingsPage() {
  const now = new Date();
  const year = now.getFullYear();
  const mon = now.getMonth() + 1;

  const [techs, branches, goals, attendanceRows] = await Promise.all([
    db.tech.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, firstName: true, fieldroutesEmployeeId: true, active: true, included: true, branch: { select: { id: true, name: true } } },
    }),
    db.branch.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    getGoals(),
    db.attendance.findMany({
      where: { year, month: mon },
      select: { techId: true, callouts: true, workingDays: true, notes: true },
    }).catch(() => []) as Promise<{ techId: string; callouts: number; workingDays: number; notes: string | null }[]>,
  ]);

  const allTechs = await db.tech.findMany({
    where: { included: true, active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  }) as { id: string; name: string }[];

  const existingMap = Object.fromEntries(
    attendanceRows.map((e: { techId: string; callouts: number; workingDays: number; notes: string | null }) => [e.techId, e])
  );

  const attendanceData = allTechs.map((t: { id: string; name: string }) => ({
    techId: t.id,
    name: t.name,
    callouts: existingMap[t.id]?.callouts ?? 0,
    workingDays: existingMap[t.id]?.workingDays ?? 22,
    notes: existingMap[t.id]?.notes ?? "",
  }));

  const monthLabel = now.toLocaleString("default", { month: "long" }) + " " + year;

  return (
    <FootprintShell activeTab="settings" isManager periodLabel="Settings">
      <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem", paddingBottom: "3rem" }}>

        {/* Attendance */}
        <section>
          <h2 className="fp-h2">Attendance — {monthLabel}</h2>
          <p className="fp-lede">Enter call-outs for each tech. Score = (working days − call-outs) ÷ working days.</p>
          <AttendanceForm rows={attendanceData} year={year} month={mon} />
        </section>

        {/* KPI Goals */}
        <GoalsEditor initialGoals={goals} />

        {/* Tech roster */}
        <TechManager techs={techs} branches={branches} />

      </div>
    </FootprintShell>
  );
}
