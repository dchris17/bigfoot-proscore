import { prisma } from "@/lib/prisma";
import { frGet } from "./fieldroutes";

export interface FRServiceType {
  typeID: string;
  description: string;
  category: string;
  reservice: string;
  [key: string]: unknown;
}

export interface ServiceTypeSyncResult {
  /** Distinct appointment type IDs found in our data, with their appointment counts. */
  typeCounts: { type: string; cnt: bigint }[];
  serviceTypes: FRServiceType[];
  upserted: number;
}

/**
 * Upsert ServiceType rows (description, category, reservice flag) from FieldRoutes for
 * every appointment type that appears in our Appointment data. Throws on FR failure.
 */
export async function syncServiceTypes(): Promise<ServiceTypeSyncResult> {
  // Get the distinct type values from our appointment rawJson (these are serviceTypeIDs)
  const typeCounts = await prisma.$queryRaw<{ type: string; cnt: bigint }[]>`
    SELECT "rawJson"->>'type' as type, COUNT(*) as cnt
    FROM "Appointment"
    WHERE "rawJson"->>'type' IS NOT NULL
      AND ("rawJson"->>'type') <> '0'
      AND ("rawJson"->>'type') <> ''
    GROUP BY "rawJson"->>'type'
    ORDER BY cnt DESC
  `;

  const ids = typeCounts.map(r => r.type).filter(Boolean);
  if (ids.length === 0) throw new Error("No type values found in appointment rawJson");

  // Fetch service type details from FR. The filter param is typeIDs: FR silently
  // ignores serviceTypeIDs and returns a single type, which left ServiceType empty.
  const getRes = await frGet("serviceType", "get", { typeIDs: ids.join(",") }) as {
    success: boolean;
    propertyName?: string;
    errorMessage?: string;
  };
  if (!getRes.success) throw new Error(getRes.errorMessage ?? "FR serviceType get failed");

  const prop = getRes.propertyName ?? "serviceType";
  const raw = (getRes as Record<string, unknown>)[prop];
  if (!raw) throw new Error(`No property '${prop}' in FR serviceType response`);

  const serviceTypes: FRServiceType[] = Array.isArray(raw)
    ? raw as FRServiceType[]
    : Object.values(raw as Record<string, unknown>) as FRServiceType[];

  let upserted = 0;
  for (const st of serviceTypes) {
    const id = parseInt(st.typeID);
    if (!id) continue;
    const fields = {
      description: st.description ?? "",
      category: st.category ?? "",
      isReservice: st.reservice === "1",
    };
    await prisma.serviceType.upsert({
      where: { id },
      update: fields,
      create: { id, ...fields },
    });
    upserted++;
  }

  return { typeCounts, serviceTypes, upserted };
}
