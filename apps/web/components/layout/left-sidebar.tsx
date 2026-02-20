import type { Conversation } from "../../lib/data/repository";

type SidebarTab = "explore" | "insights" | "advisor" | "favorites";

export function LeftSidebar({
  conversations,
  activeTab,
  showHistory = true,
}: {
  conversations: Conversation[];
  activeTab: SidebarTab;
  showHistory?: boolean;
}) {
  return (
    <aside className="panel sidebar-left">
      <section>
        <h3 className="section-title">工作区</h3>
        <nav className="nav-list">
          <a className={`nav-item ${activeTab === "explore" ? "nav-item-active" : ""}`} href="/explore">
            模型探索
          </a>
          <a className={`nav-item ${activeTab === "insights" ? "nav-item-active" : ""}`} href="/insights">
            资讯雷达
          </a>
          <a className={`nav-item ${activeTab === "advisor" ? "nav-item-active" : ""}`} href="/advisor">
            智能顾问
          </a>
          <a className={`nav-item ${activeTab === "favorites" ? "nav-item-active" : ""}`} href="/favorites">
            我的收藏
          </a>
          <a className="nav-item" href="/login">
            档案设置
          </a>
        </nav>
      </section>

      {showHistory ? (
        <section>
          <h3 className="section-title">历史对话</h3>
          <div className="history-list">
            {conversations.length === 0 ? <p className="empty-tip">暂无历史对话</p> : null}
            {conversations.map((item) => (
              <div key={item.id} className="history-item">
                <div className="history-title">{item.title}</div>
                <div className="history-time">{item.updated_at}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </aside>
  );
}
