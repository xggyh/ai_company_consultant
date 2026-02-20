import { NextResponse } from "next/server";
import { getDataRepository } from "../../../lib/data/repository";
import type { UserProfile } from "../../../lib/mock-data";

export function validateProfilePayload(payload: Record<string, string>) {
  if (!payload.company_industry) {
    throw new Error("company_industry is required");
  }
  if (!payload.company_scale) {
    throw new Error("company_scale is required");
  }
}

export async function GET() {
  const repo = getDataRepository();
  return NextResponse.json(await repo.getProfile());
}

export async function POST(req: Request) {
  const payload = (await req.json()) as UserProfile;
  validateProfilePayload(payload);
  const repo = getDataRepository();
  const profile = await repo.upsertProfile(payload);
  return NextResponse.json({ ok: true, profile });
}
