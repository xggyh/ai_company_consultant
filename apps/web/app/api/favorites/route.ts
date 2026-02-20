import { NextResponse } from "next/server";
import { getDataRepository } from "../../../lib/data/repository";

export function validateFavoritePayload(payload: { model_id?: string; article_id?: string }) {
  const hasModel = Boolean(payload.model_id);
  const hasArticle = Boolean(payload.article_id);

  if (!hasModel && !hasArticle) {
    throw new Error("one target is required");
  }
  if (hasModel && hasArticle) {
    throw new Error("only one target is allowed");
  }
}

export async function GET() {
  const repo = getDataRepository();
  return NextResponse.json(await repo.getFavorites());
}

export async function POST(req: Request) {
  const payload = (await req.json()) as { model_id?: string; article_id?: string };
  validateFavoritePayload(payload);
  const repo = getDataRepository();
  return NextResponse.json({ ok: true, favorites: await repo.addFavorite(payload) });
}
