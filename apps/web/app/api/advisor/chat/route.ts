import { analyzeDemand } from "../../../../lib/agents/demand-agent";
import { buildSolution } from "../../../../lib/agents/solution-agent";
import { NextResponse } from "next/server";
import { getDataRepository } from "../../../../lib/data/repository";

export async function handleAdvisorMessage(input: {
  message: string;
  conversation_id?: string;
  conversation_title?: string;
}) {
  const repo = getDataRepository();
  const conversation =
    input.conversation_id && input.conversation_id.length > 0
      ? { id: input.conversation_id }
      : await repo.appendConversation(input.conversation_title || "AI顾问会话");

  await repo.persistMessage({
    conversation_id: conversation.id,
    role: "user",
    content: input.message,
    agent_type: "demand",
  });

  const demand = await analyzeDemand({ user_input: input.message });
  if (demand.need_follow_up) {
    await repo.persistMessage({
      conversation_id: conversation.id,
      role: "assistant",
      content: demand.follow_up_question,
      agent_type: "demand",
    });
    return {
      type: "follow_up",
      content: demand.follow_up_question,
      conversation_id: conversation.id,
    };
  }

  const solutions = await buildSolution({
    industry: demand.demand?.industry ?? "其他",
    pain_points: demand.demand?.pain_points ?? [],
    goals: demand.demand?.goals ?? [],
  });

  const summary = "基于你的业务场景，我为你生成了可落地方案。";
  await repo.persistMessage({
    conversation_id: conversation.id,
    role: "assistant",
    content: summary,
    agent_type: "solution",
  });
  if (solutions[0]) {
    await repo.persistSolution({
      conversation_id: conversation.id,
      title: solutions[0].title,
      content: solutions,
    });
  }

  return { type: "solution", content: solutions, conversation_id: conversation.id };
}

export async function POST(req: Request) {
  const payload = (await req.json()) as {
    message?: string;
    conversation_id?: string;
    conversation_title?: string;
  };
  const result = await handleAdvisorMessage({
    message: payload.message ?? "",
    conversation_id: payload.conversation_id,
    conversation_title: payload.conversation_title,
  });
  return NextResponse.json(result);
}
