import { NextResponse } from "next/server";
import { getDataRepository } from "../../../../lib/data/repository";

export function validateArticleId(id: string) {
  const value = id.trim();
  if (!value) {
    throw new Error("article id is required");
  }
  return value;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const id = validateArticleId(params.id || "");
    const repo = getDataRepository();
    const article = await repo.getArticleById(id);
    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }
    return NextResponse.json(article);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
