import { NextResponse } from "next/server";
import { getDataRepository } from "../../../lib/data/repository";
import type { UserProfile } from "../../../lib/data/repository";

export function validateProfilePayload(payload: Record<string, string>) {
  if (!payload.company_industry) {
    throw new Error("company_industry is required");
  }
  if (!payload.company_scale) {
    throw new Error("company_scale is required");
  }
}

export async function GET() {
  try {
    const repo = getDataRepository();
    return NextResponse.json(await repo.getProfile());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as UserProfile;
    validateProfilePayload(payload);
    const repo = getDataRepository();
    const profile = await repo.upsertProfile(payload);
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
