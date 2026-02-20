"use client";

import { useMemo, useRef, useState } from "react";

type ChatSolution = {
  title: string;
  architecture: string;
  estimated_monthly_cost: number;
  roi_hypothesis: string;
  risks: string[];
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  solutions?: ChatSolution[];
};

async function exportSolution(solution: ChatSolution) {
  const res = await fetch("/api/solutions/export", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(solution),
  });

  const text = await res.text();
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${solution.title}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function AdvisorChat() {
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "请描述你的行业、团队规模、核心痛点和业务目标，我会给出可执行方案。",
    },
  ]);

  const inputRef = useRef<HTMLInputElement>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  async function sendMessage() {
    if (!canSend) {
      return;
    }

    const message = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setLoading(true);

    try {
      const res = await fetch("/api/advisor/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message,
          conversation_id: conversationId ?? undefined,
          conversation_title: conversationId ? undefined : message.slice(0, 24),
        }),
      });
      const data = (await res.json()) as
        | { type: "follow_up"; content: string; conversation_id: string }
        | { type: "solution"; content: ChatSolution[]; conversation_id: string };

      setConversationId(data.conversation_id);

      if (data.type === "follow_up") {
        setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "基于你的业务场景，我为你生成了以下方案：",
            solutions: data.content,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "请求失败，请稍后重试。" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="chat-wrap">
      <div className="feed-header chat-header">
        <h2>AI 顾问对话区</h2>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => inputRef.current?.focus()}
          aria-label="开始咨询"
        >
          开始咨询
        </button>
      </div>

      <div className="chat-log">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={message.role === "assistant" ? "bubble bubble-ai" : "bubble bubble-user"}
          >
            <p>{message.content}</p>
            {message.solutions && message.solutions.length > 0 ? (
              <div className="solution-list">
                <h3>方案概述</h3>
                {message.solutions.map((solution) => (
                  <article key={solution.title} className="solution-card">
                    <strong>{solution.title}</strong>
                    <p>{solution.architecture}</p>
                    <p>月度成本估算：¥{solution.estimated_monthly_cost}</p>
                    <p>ROI 假设：{solution.roi_hypothesis}</p>
                    <ul>
                      {solution.risks.map((risk) => (
                        <li key={risk}>{risk}</li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      className="btn btn-main"
                      onClick={() => exportSolution(solution)}
                    >
                      导出PDF
                    </button>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="chat-input-row">
        <input
          ref={inputRef}
          placeholder="请输入你的业务问题"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              void sendMessage();
            }
          }}
        />
        <button
          type="button"
          className="btn btn-main"
          disabled={!canSend}
          onClick={() => void sendMessage()}
          aria-label="发送"
        >
          {loading ? "发送中" : "发送"}
        </button>
      </div>
    </section>
  );
}
