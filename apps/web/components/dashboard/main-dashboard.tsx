import { AdvisorChat } from "../chat/advisor-chat";
import { FeedStream } from "../feed/feed-stream";
import { LeftSidebar } from "../layout/left-sidebar";
import { RightSidebar } from "../layout/right-sidebar";
import type { DashboardData } from "../../lib/dashboard";

export function MainDashboard({ data }: { data: DashboardData }) {
  return (
    <main className="explore-shell">
      <header className="panel topbar">
        <div className="logo-wrap">
          <div className="logo-dot" />
          <div>
            <div className="logo-title">AI Enterprise Advisor</div>
            <div className="logo-subtitle">企业 AI 决策探索中心</div>
          </div>
        </div>

        <nav className="topbar-nav">
          <a href="/explore" className="topbar-link topbar-link-active">
            探索中心
          </a>
          <a href="/advisor" className="topbar-link">
            AI 顾问
          </a>
          <a href="/login" className="topbar-link">
            企业档案
          </a>
        </nav>

        <div className="topbar-meta">
          <span>{data.profile.company_industry}</span>
          <span>{data.profile.company_scale}</span>
        </div>
      </header>

      <div className="explore-grid">
        <LeftSidebar conversations={data.conversations} />

        <section className="center-stage">
          <header className="panel hero-panel">
            <p className="hero-badge">实时推荐</p>
            <h1>{data.profile.company_name} 的 AI 机会地图</h1>
            <p className="hero-copy">
              聚合模型能力、资讯动态与落地建议，支持从探索到方案落地的一体化决策。
            </p>
            <div className="hero-metrics">
              <div>
                <span>候选模型</span>
                <strong>{data.models.length}</strong>
              </div>
              <div>
                <span>今日资讯</span>
                <strong>{data.articles.length}</strong>
              </div>
              <div>
                <span>收藏数量</span>
                <strong>{data.favorites.model_ids.length + data.favorites.article_ids.length}</strong>
              </div>
            </div>
          </header>

          <FeedStream models={data.models} articles={data.articles} />
        </section>

        <section className="right-stage">
          <RightSidebar models={data.models} articles={data.articles} favorites={data.favorites} />
          <AdvisorChat />
        </section>
      </div>
    </main>
  );
}
