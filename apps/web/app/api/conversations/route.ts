import { NextResponse } from "next/server";
import { getDataRepository } from "../../../lib/data/repository";

export function listConversations() {
  return [];
}

export async function GET() {
  try {
    const repo = getDataRepository();
    return NextResponse.json({ conversations: await repo.getConversations() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load conversations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as { title?: string };
    const title = payload.title?.trim() || "新对话";
    const repo = getDataRepository();
    const conversation = await repo.appendConversation(title);
    return NextResponse.json({ ok: true, conversation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create conversation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
