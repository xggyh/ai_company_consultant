import { NextResponse } from "next/server";
import { getDataRepository } from "../../../../lib/data/repository";

export function validateModelId(id: string) {
  const value = id.trim();
  if (!value) {
    throw new Error("model id is required");
  }
  return value;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const id = validateModelId(params.id || "");
    const repo = getDataRepository();
    const model = await repo.getModelById(id);
    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }
    return NextResponse.json(model);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
