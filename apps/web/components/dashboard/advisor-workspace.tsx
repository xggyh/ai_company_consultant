import type { DashboardData } from "../../lib/dashboard";
import { AdvisorChat } from "../chat/advisor-chat";
import { LeftSidebar } from "../layout/left-sidebar";
import { Topbar } from "../layout/topbar";

export function AdvisorWorkspace({ data }: { data: DashboardData }) {
  return (
    <main className="explore-shell">
      <Topbar profile={data.profile} activeTab="advisor" />

      <div className="explore-grid explore-grid-no-right">
        <LeftSidebar conversations={data.conversations} activeTab="advisor" showHistory={false} />

        <section className="center-stage advisor-stage">
          <header className="panel hero-panel hero-panel-advisor">
            <p className="hero-badge">智能顾问</p>
            <h1>面向业务决策的 AI 咨询台</h1>
            <p className="hero-copy">
              支持需求澄清、方案拆解、成本测算与风险识别，输出可直接评审与执行的结构化建议。
            </p>
            {data.crawl.warning ? (
              <p className="crawl-warning">{data.crawl.warning}</p>
            ) : (
              <p className="crawl-meta">
                最近一次成功同步：
                {data.crawl.last_success_at
                  ? new Date(data.crawl.last_success_at).toLocaleString("zh-CN")
                  : "暂无记录"}
              </p>
            )}
          </header>

          <div className="advisor-grid">
            <aside className="panel advisor-context">
              <section>
                <h3 className="section-title">历史对话</h3>
                <div className="history-list">
                  {data.conversations.length === 0 ? <p className="empty-tip">暂无历史对话</p> : null}
                  {data.conversations.slice(0, 10).map((item) => (
                    <div key={item.id} className="history-item">
                      <div className="history-title">{item.title}</div>
                      <div className="history-time">{item.updated_at}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="section-title">咨询建议</h3>
                <ul className="advisor-list">
                  <li>说明当前业务指标与目标值，例如转化率、满意度、工时成本。</li>
                  <li>明确约束条件，如预算上限、系统兼容、合规要求。</li>
                  <li>优先给出 1-2 个最关键场景，可获得更准确的落地方案。</li>
                </ul>
              </section>

              <section>
                <h3 className="section-title">推荐模型</h3>
                <div className="mini-list">
                  {data.models.slice(0, 4).map((model) => (
                    <a key={model.id} className="mini-item mini-link" href={`/models/${model.id}`}>
                      <div>{model.name}</div>
                      <span>{model.provider}</span>
                    </a>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="section-title">参考资讯</h3>
                <div className="mini-list">
                  {data.articles.slice(0, 4).map((article) => (
                    <a key={article.id} className="mini-item mini-link" href={`/articles/${article.id}`}>
                      <div>{article.title}</div>
                      <span>{article.source}</span>
                    </a>
                  ))}
                </div>
              </section>
            </aside>

            <AdvisorChat />
          </div>
        </section>
      </div>
    </main>
  );
}
