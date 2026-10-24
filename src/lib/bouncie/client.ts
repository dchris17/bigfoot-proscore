import { prisma } from "@/lib/prisma";

const AUTH_URL = "https://auth.bouncie.com";
const API_URL = "https://api.bouncie.dev/v1";
const CLIENT_ID = process.env.BOUNCIE_CLIENT_ID!;
const CLIENT_SECRET = process.env.BOUNCIE_CLIENT_SECRET!;

// ── Token storage ────────────────────────────────────────────────────────────

interface TokenSet {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

async function saveTokens(t: TokenSet) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any;
  await db.setting.upsert({
    where: { key: "bouncie_access_token" },
    update: { value: t.accessToken },
    create: { key: "bouncie_access_token", value: t.accessToken },
  });
  await db.setting.upsert({
    where: { key: "bouncie_refresh_token" },
    update: { value: t.refreshToken },
    create: { key: "bouncie_refresh_token", value: t.refreshToken },
  });
  await db.setting.upsert({
    where: { key: "bouncie_token_expires_at" },
    update: { value: t.expiresAt.toISOString() },
    create: { key: "bouncie_token_expires_at", value: t.expiresAt.toISOString() },
  });
}

async function loadTokens(): Promise<TokenSet | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any;
  const rows = await db.setting.findMany({
    where: { key: { in: ["bouncie_access_token", "bouncie_refresh_token", "bouncie_token_expires_at"] } },
  });
  const map = Object.fromEntries(rows.map((r: { key: string; value: string }) => [r.key, r.value]));
  if (!map.bouncie_access_token) return null;
  return {
    accessToken: map.bouncie_access_token,
    refreshToken: map.bouncie_refresh_token,
    expiresAt: new Date(map.bouncie_token_expires_at),
  };
}

// ── OAuth ────────────────────────────────────────────────────────────────────

export function buildAuthUrl(redirectUri: string): string {
  const url = new URL(`${AUTH_URL}/dialog/authorize`);
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  return url.toString();
}

export async function exchangeCode(code: string, redirectUri: string): Promise<TokenSet> {
  const res = await fetch(`${AUTH_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });
  const data = await res.json() as { access_token: string; refresh_token: string; expires_in: number };
  const tokens: TokenSet = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
  await saveTokens(tokens);
  return tokens;
}

async function refreshAccessToken(refreshToken: string): Promise<TokenSet> {
  const res = await fetch(`${AUTH_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  const data = await res.json() as { access_token: string; refresh_token: string; expires_in: number };
  const tokens: TokenSet = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
  await saveTokens(tokens);
  return tokens;
}

async function getValidToken(): Promise<string> {
  let tokens = await loadTokens();
  if (!tokens) throw new Error("Bouncie not connected — run /api/bouncie/connect first");
  // Refresh if expiring within 5 minutes
  if (tokens.expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    tokens = await refreshAccessToken(tokens.refreshToken);
  }
  return tokens.accessToken;
}

// ── REST API calls ───────────────────────────────────────────────────────────

async function bouncieGet(path: string, params?: Record<string, string>) {
  const token = await getValidToken();
  const url = new URL(`${API_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: token, "Content-Type": "application/json" },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Bouncie API ${path} returned ${res.status}`);
  return res.json();
}

export interface BouncieVehicle {
  imei: string;
  nickName: string;
}

export async function getVehicles(): Promise<BouncieVehicle[]> {
  const data = await bouncieGet("/vehicles");
  if (!Array.isArray(data)) return [];
  // Normalize non-breaking spaces in vehicle names to regular spaces
  return data.map((v: Record<string, unknown>) => ({
    imei: v.imei as string,
    nickName: ((v.nickName as string) ?? "").replace(/ /g, " ").trim(),
  }));
}

export interface BouncieTrip {
  transactionId: string;
  imei: string;
  startTime: string;
  endTime: string;
  distance: number;
  hardBrakingCount: number;
  hardAccelerationCount: number;
  maxSpeed?: number;
  totalIdleDuration?: number;
}

// Bouncie limits trip queries to 7 days per request — chunk the range into weekly windows
export async function getTrips(imei: string, startsAfter: Date, endsBefore: Date): Promise<BouncieTrip[]> {
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const all: BouncieTrip[] = [];
  let windowStart = new Date(startsAfter);

  while (windowStart < endsBefore) {
    const windowEnd = new Date(Math.min(windowStart.getTime() + WEEK_MS, endsBefore.getTime()));
    const data = await bouncieGet("/trips", {
      imei,
      "starts-after": windowStart.toISOString(),
      "ends-before": windowEnd.toISOString(),
      "gps-format": "polyline",
    });
    if (Array.isArray(data)) all.push(...data);
    windowStart = windowEnd;
  }

  return all;
}
