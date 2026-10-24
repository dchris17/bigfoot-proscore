import { NextResponse } from "next/server";
import { isAdmin } from "@/app/pin/actions";
import { syncServiceTypes } from "@/lib/sync/serviceTypes";

export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Manager PIN required" }, { status: 401 });
  }
  try {
    const { typeCounts: rows, serviceTypes, upserted } = await syncServiceTypes();

    const reserviceTypes = serviceTypes.filter(s => s.reservice === "1");

    return NextResponse.json({
      ok: true,
      idsQueried: rows.length,
      total: serviceTypes.length,
      upserted,
      reserviceTypes: reserviceTypes.map(s => ({ id: s.typeID, description: s.description, category: s.category })),
      allTypes: serviceTypes.map(s => ({
        id: s.typeID,
        description: s.description,
        category: s.category,
        isReservice: s.reservice === "1",
        count: rows.find(r => r.type === s.typeID) ? Number(rows.find(r => r.type === s.typeID)!.cnt) : 0,
      })),
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
