import type { UserProfile } from "../../lib/data/repository";

type TopbarTab = "explore" | "insights" | "advisor" | "favorites";

export function Topbar({ profile, activeTab }: { profile: UserProfile; activeTab: TopbarTab }) {
  return (
    <header className="panel topbar">
      <div className="logo-wrap">
        <div className="logo-dot" />
        <div>
          <div className="logo-title">AI Enterprise Advisor</div>
          <div className="logo-subtitle">企业级智能决策中台</div>
        </div>
      </div>

      <nav className="topbar-nav">
        <a href="/explore" className={`topbar-link ${activeTab === "explore" ? "topbar-link-active" : ""}`}>
          探索
        </a>
        <a
          href="/insights"
          className={`topbar-link ${activeTab === "insights" ? "topbar-link-active" : ""}`}
        >
          资讯
        </a>
        <a href="/advisor" className={`topbar-link ${activeTab === "advisor" ? "topbar-link-active" : ""}`}>
          AI 顾问
        </a>
        <a
          href="/favorites"
          className={`topbar-link ${activeTab === "favorites" ? "topbar-link-active" : ""}`}
        >
          收藏
        </a>
        <a href="/login" className="topbar-link">
          企业档案
        </a>
      </nav>

      <div className="topbar-meta">
        <span>{profile.company_industry}</span>
        <span>{profile.company_scale}</span>
      </div>
    </header>
  );
}
