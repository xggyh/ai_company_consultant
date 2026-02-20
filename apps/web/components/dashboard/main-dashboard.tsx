import { FeedStream } from "../feed/feed-stream";
import { LeftSidebar } from "../layout/left-sidebar";
import { RightSidebar } from "../layout/right-sidebar";
import { Topbar } from "../layout/topbar";
import type { DashboardData } from "../../lib/dashboard";

export function MainDashboard({ data }: { data: DashboardData }) {
  return (
    <main className="explore-shell">
      <Topbar profile={data.profile} activeTab="explore" />

      <div className="explore-grid">
        <LeftSidebar conversations={data.conversations} activeTab="explore" showHistory={false} />

        <section className="center-stage">
          <header className="panel hero-panel">
            <p className="hero-badge">模型策略台</p>
            <h1>{data.profile.company_name} 企业级 AI 决策中台</h1>
            <p className="hero-copy">
              整合模型能力、行业情报与实施评估，支持从机会识别、方案比选到上线落地的闭环决策。
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
            <div className="hero-actions">
              <a href="/advisor" className="btn btn-main">
                进入智能顾问
              </a>
              <a href="/insights" className="btn btn-ghost">
                查看行业资讯
              </a>
            </div>
          </header>

          <FeedStream
            models={data.models}
            articles={data.articles}
            favorites={data.favorites}
            mode="models"
            title="模型能力推荐"
            subtitle="结合企业行业、规模与场景偏好进行排序"
          />
        </section>

        <section className="right-stage">
          <RightSidebar models={data.models} articles={data.articles} favorites={data.favorites} />
        </section>
      </div>
    </main>
  );
}
