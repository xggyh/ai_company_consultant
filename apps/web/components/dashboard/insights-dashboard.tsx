import type { DashboardData } from "../../lib/dashboard";
import { FeedStream } from "../feed/feed-stream";
import { LeftSidebar } from "../layout/left-sidebar";
import { RightSidebar } from "../layout/right-sidebar";
import { Topbar } from "../layout/topbar";

export function InsightsDashboard({ data }: { data: DashboardData }) {
  return (
    <main className="explore-shell">
      <Topbar profile={data.profile} activeTab="insights" />

      <div className="explore-grid">
        <LeftSidebar conversations={data.conversations} activeTab="insights" />

        <section className="center-stage">
          <header className="panel hero-panel hero-panel-insight">
            <p className="hero-badge">资讯雷达</p>
            <h1>企业 AI 情报看板</h1>
            <p className="hero-copy">
              聚焦行业最新模型应用、ROI 案例与架构实践，帮助团队在业务决策前快速掌握信号与趋势。
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

          <FeedStream
            models={data.models}
            articles={data.articles}
            favorites={data.favorites}
            mode="articles"
            title="AI 资讯推荐流"
            subtitle="基于企业标签匹配资讯价值密度"
          />
        </section>

        <section className="right-stage">
          <RightSidebar models={data.models} articles={data.articles} favorites={data.favorites} />
        </section>
      </div>
    </main>
  );
}
