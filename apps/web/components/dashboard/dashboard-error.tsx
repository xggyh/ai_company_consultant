import Link from "next/link";

export function DashboardErrorView({ message }: { message: string }) {
  return (
    <main className="explore-shell">
      <section className="panel hero-panel">
        <p className="hero-badge">服务状态</p>
        <h1>页面暂时不可用</h1>
        <p className="hero-copy">
          服务端加载数据时发生异常，请检查环境变量与数据库连接后重试。
        </p>
        <p className="crawl-warning">{message}</p>
        <div className="hero-actions">
          <Link href="/explore" className="btn btn-main">
            返回探索页
          </Link>
          <Link href="/login" className="btn btn-ghost">
            检查档案与配置
          </Link>
        </div>
      </section>
    </main>
  );
}
