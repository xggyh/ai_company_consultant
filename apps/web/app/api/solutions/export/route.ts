import { NextResponse } from "next/server";
import { renderSolutionMarkdown } from "../../../../lib/pdf/render-solution";

export function exportSolutionAsMarkdown() {
  return renderSolutionMarkdown({
    title: "默认方案",
    estimated_monthly_cost: 0,
    risks: [],
  });
}

export async function POST(req: Request) {
  const payload = (await req.json()) as {
    title?: string;
    estimated_monthly_cost?: number;
    risks?: string[];
  };

  const markdown = renderSolutionMarkdown({
    title: payload.title || "未命名方案",
    estimated_monthly_cost: payload.estimated_monthly_cost ?? 0,
    risks: payload.risks ?? [],
  });

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": "attachment; filename=solution.md",
    },
  });
}
