import { NextResponse } from "next/server";
import { getDataRepository } from "../../../lib/data/repository";

export function listConversations() {
  return [];
}

export async function GET() {
  const repo = getDataRepository();
  return NextResponse.json({ conversations: await repo.getConversations() });
}

export async function POST(req: Request) {
  const payload = (await req.json()) as { title?: string };
  const title = payload.title?.trim() || "新对话";
  const repo = getDataRepository();
  const conversation = await repo.appendConversation(title);
  return NextResponse.json({ ok: true, conversation });
}
