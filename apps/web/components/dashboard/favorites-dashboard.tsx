import type { DashboardData } from "../../lib/dashboard";
import { FeedStream } from "../feed/feed-stream";
import { LeftSidebar } from "../layout/left-sidebar";
import { Topbar } from "../layout/topbar";

export function FavoritesDashboard({ data }: { data: DashboardData }) {
  return (
    <main className="explore-shell">
      <Topbar profile={data.profile} activeTab="favorites" />

      <div className="explore-grid explore-grid-no-right">
        <LeftSidebar conversations={data.conversations} activeTab="favorites" />

        <section className="center-stage">
          <header className="panel hero-panel hero-panel-favorites">
            <p className="hero-badge">收藏清单</p>
            <h1>高价值模型与资讯库</h1>
            <p className="hero-copy">
              将关键模型与资讯沉淀为可复用资产，便于评审会讨论、方案对比与后续实施追踪。
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
            mode="favorites"
            title="我的收藏"
            subtitle="支持在卡片中直接取消收藏并跳转详情"
          />
        </section>
      </div>
    </main>
  );
}
