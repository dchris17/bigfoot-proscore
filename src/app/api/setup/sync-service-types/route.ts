import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/app/pin/actions";

const BASE_URL = `https://${process.env.FIELDROUTES_SUBDOMAIN ?? "aversepest"}.pestroutes.com/api`;

async function frGet(entity: string, action: string, params: Record<string, string> = {}) {
  const url = new URL(`${BASE_URL}/${entity}/${action}`);
  url.searchParams.set("authenticationKey", process.env.FIELDROUTES_AUTH_KEY ?? "");
  url.searchParams.set("authenticationToken", process.env.FIELDROUTES_AUTH_TOKEN ?? "");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  return res.json();
}

interface FRServiceType {
  serviceTypeID: string;
  description: string;
  category: string;
  reservice: string;
  [key: string]: unknown;
}

export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Manager PIN required" }, { status: 401 });
  }
  try {
    // Get the distinct type values from our appointment rawJson (these are serviceTypeIDs)
    const rows = await prisma.$queryRaw<{ type: string; cnt: bigint }[]>`
      SELECT "rawJson"->>'type' as type, COUNT(*) as cnt
      FROM "Appointment"
      WHERE "rawJson"->>'type' IS NOT NULL
        AND ("rawJson"->>'type') <> '0'
        AND ("rawJson"->>'type') <> ''
      GROUP BY "rawJson"->>'type'
      ORDER BY cnt DESC
    `;

    const ids = rows.map(r => r.type).filter(Boolean);
    if (ids.length === 0) {
      return NextResponse.json({ ok: false, error: "No type values found in appointment rawJson" }, { status: 400 });
    }

    // Fetch service type details from FR
    const getRes = await frGet("serviceType", "get", { serviceTypeIDs: ids.join(",") }) as {
      success: boolean;
      propertyName?: string;
      errorMessage?: string;
    };

    if (!getRes.success) {
      return NextResponse.json({
        ok: false,
        error: (getRes as { errorMessage?: string }).errorMessage ?? "FR get failed",
        responseKeys: Object.keys(getRes as object),
        idsQueried: ids,
      }, { status: 500 });
    }

    const prop = getRes.propertyName ?? "serviceType";
    const raw = (getRes as Record<string, unknown>)[prop];

    if (!raw) {
      return NextResponse.json({
        ok: false,
        error: `No property '${prop}' in FR response`,
        responseKeys: Object.keys(getRes as object),
        idsQueried: ids,
      }, { status: 500 });
    }

    const serviceTypes: FRServiceType[] = Array.isArray(raw)
      ? raw as FRServiceType[]
      : Object.values(raw as Record<string, unknown>) as FRServiceType[];

    let upserted = 0;
    for (const st of serviceTypes) {
      const id = parseInt(st.serviceTypeID);
      if (!id) continue;
      await prisma.serviceType.upsert({
        where: { id },
        update: {
          description: st.description ?? "",
          category: st.category ?? "",
          isReservice: st.reservice === "1",
        },
        create: {
          id,
          description: st.description ?? "",
          category: st.category ?? "",
          isReservice: st.reservice === "1",
        },
      });
      upserted++;
    }

    const reserviceTypes = serviceTypes.filter(s => s.reservice === "1");

    return NextResponse.json({
      ok: true,
      idsQueried: ids.length,
      total: serviceTypes.length,
      upserted,
      reserviceTypes: reserviceTypes.map(s => ({ id: s.serviceTypeID, description: s.description, category: s.category })),
      allTypes: serviceTypes.map(s => ({
        id: s.serviceTypeID,
        description: s.description,
        category: s.category,
        isReservice: s.reservice === "1",
        count: rows.find(r => r.type === s.serviceTypeID) ? Number(rows.find(r => r.type === s.serviceTypeID)!.cnt) : 0,
      })),
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
