import type { Conversation } from "../../lib/data/repository";

export function LeftSidebar({ conversations }: { conversations: Conversation[] }) {
  return (
    <aside className="panel sidebar-left">
      <section>
        <h3 className="section-title">导航</h3>
        <nav className="nav-list">
          <a className="nav-item nav-item-active" href="/explore">
            探索中心
          </a>
          <a className="nav-item" href="/advisor">
            AI 顾问
          </a>
          <a className="nav-item" href="/login">
            账号设置
          </a>
        </nav>
      </section>

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
    </aside>
  );
}
