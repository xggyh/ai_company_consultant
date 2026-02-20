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
  id: string;
  role: "user" | "assistant";
  content: string;
  solutions?: ChatSolution[];
};

type ChatMode = "standard" | "deep";

const STARTER_PROMPTS = [
  "我们是 200 人 SaaS 团队，目标提升销售线索转化率，预算每月 20 万。",
  "客服团队想把重复咨询自动化，目标 3 个月内降低 30% 人工成本。",
  "我们要做企业知识库问答，担心准确率和合规，怎么分阶段上线？",
];

const DEEP_MODE_SUFFIX =
  "请输出结构化建议：问题拆解、方案路径、实施里程碑、KPI 指标、主要风险与应对。";

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

function buildAssistantGreeting(): ChatMessage {
  return {
    id: "greeting",
    role: "assistant",
    content: "直接说你的业务目标即可，我会先给一版可执行方案，再补充必要澄清。",
  };
}

export function AdvisorChat() {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<ChatMode>("standard");
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([buildAssistantGreeting()]);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  async function sendMessage(rawMessage?: string) {
    const sourceMessage = (rawMessage ?? input).trim();
    if (sourceMessage.length === 0 || loading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: sourceMessage,
    };

    setInput("");
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    const payloadMessage =
      mode === "deep" ? `${sourceMessage}\n${DEEP_MODE_SUFFIX}` : sourceMessage;

    try {
      const res = await fetch("/api/advisor/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: payloadMessage,
          conversation_id: conversationId ?? undefined,
          conversation_title: conversationId ? undefined : sourceMessage.slice(0, 24),
        }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "请求失败");
      }

      const data = (await res.json()) as
        | { type: "follow_up"; content: string; conversation_id: string }
        | { type: "solution"; content: ChatSolution[]; conversation_id: string };

      setConversationId(data.conversation_id);

      if (data.type === "follow_up") {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: data.content,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: "已完成方案草案，你可以导出并用于内部评审。",
            solutions: data.content,
          },
        ]);
      }
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "请求失败，请稍后重试。";
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: message,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function resetConversation() {
    setConversationId(null);
    setMessages([buildAssistantGreeting()]);
    setInput("");
    inputRef.current?.focus();
  }

  return (
    <section className="chat-wrap panel">
      <div className="feed-header chat-header">
        <h2>AI 顾问对话区</h2>
        <div className="chat-toolbar">
          <div className="mode-switch" role="group" aria-label="咨询模式">
            <button
              type="button"
              className={`mode-btn ${mode === "standard" ? "mode-btn-active" : ""}`}
              onClick={() => setMode("standard")}
            >
              标准
            </button>
            <button
              type="button"
              className={`mode-btn ${mode === "deep" ? "mode-btn-active" : ""}`}
              onClick={() => setMode("deep")}
            >
              深度
            </button>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => inputRef.current?.focus()}
            aria-label="开始咨询"
          >
            开始咨询
          </button>
          <button type="button" className="btn btn-ghost" onClick={resetConversation}>
            新建会话
          </button>
        </div>
      </div>

      <div className="prompt-grid">
        {STARTER_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="prompt-pill"
            disabled={loading}
            onClick={() => void sendMessage(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="chat-log">
        {messages.map((message) => (
          <div
            key={message.id}
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
                      onClick={() => void exportSolution(solution)}
                    >
                      导出 PDF
                    </button>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        ))}

        {loading ? (
          <div className="bubble bubble-ai bubble-thinking">
            <p>正在结合你的业务约束生成方案...</p>
          </div>
        ) : null}
      </div>

      <div className="chat-input-row">
        <textarea
          ref={inputRef}
          placeholder="请输入你的业务问题"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
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
