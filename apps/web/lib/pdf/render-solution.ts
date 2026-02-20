export function renderSolutionMarkdown(input: {
  title: string;
  estimated_monthly_cost: number;
  risks: string[];
}) {
  return [
    `# ${input.title}`,
    "",
    "## 月度成本估算",
    `${input.estimated_monthly_cost} CNY / 月`,
    "",
    "## 风险提示",
    ...input.risks.map((risk) => `- ${risk}`),
  ].join("\n");
}
