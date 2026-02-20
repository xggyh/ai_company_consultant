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
  try {
    const repo = getDataRepository();
    return NextResponse.json(await repo.getFavorites());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load favorites";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as { model_id?: string; article_id?: string };
    validateFavoritePayload(payload);
    const repo = getDataRepository();
    return NextResponse.json({ ok: true, favorites: await repo.addFavorite(payload) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add favorite";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const payload = (await req.json()) as { model_id?: string; article_id?: string };
    validateFavoritePayload(payload);
    const repo = getDataRepository();
    return NextResponse.json({ ok: true, favorites: await repo.removeFavorite(payload) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remove favorite";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
