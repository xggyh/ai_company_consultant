import Link from "next/link";
import { notFound } from "next/navigation";
import { getDataRepository } from "../../../../lib/data/repository";

export default async function ModelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = getDataRepository();
  const [profile, model] = await Promise.all([repo.getProfile(), repo.getModelById(id)]);
  if (!model) {
    notFound();
  }

  const feed = await repo.getFeed(profile);
  const relatedModels = feed.models.filter((item) => item.id !== model.id).slice(0, 4);
  const relatedArticles = feed.articles.slice(0, 4);

  return (
    <main className="detail-shell">
      <header className="detail-topbar panel">
        <Link href="/explore" className="ghost-link">
          返回探索
        </Link>
        <Link href="/advisor" className="ghost-link">
          去顾问对话
        </Link>
      </header>

      <article className="detail-main panel">
        <p className="detail-kicker">模型详情</p>
        <h1>{model.name}</h1>
        <p className="detail-sub">{model.provider}</p>
        <p className="detail-desc">{model.description || "暂无模型描述"}</p>

        <div className="detail-chip-row">
          {model.business_scenarios.length > 0 ? (
            model.business_scenarios.map((tag) => (
              <span key={tag} className="chip">
                {tag}
              </span>
            ))
          ) : (
            <span className="chip">通用场景</span>
          )}
        </div>

        <div className="detail-stats">
          <div>
            <span>输入成本</span>
            <strong>¥{model.cost_input || 0}/1M</strong>
          </div>
          <div>
            <span>输出成本</span>
            <strong>¥{model.cost_output || 0}/1M</strong>
          </div>
          <div>
            <span>发布时间</span>
            <strong>{model.release_date || "未知"}</strong>
          </div>
        </div>

        <div className="detail-links">
          {model.docs_url ? (
            <a href={model.docs_url} target="_blank" rel="noreferrer" className="btn btn-ghost">
              官方文档
            </a>
          ) : null}
          {model.source_url ? (
            <a href={model.source_url} target="_blank" rel="noreferrer" className="btn btn-ghost">
              来源页面
            </a>
          ) : null}
        </div>
      </article>

      <section className="detail-side panel">
        <h2>相关模型</h2>
        <div className="detail-list">
          {relatedModels.map((item) => (
            <Link key={item.id} href={`/models/${item.id}`} className="detail-list-item">
              <strong>{item.name}</strong>
              <span>{item.provider}</span>
            </Link>
          ))}
        </div>

        <h2>相关资讯</h2>
        <div className="detail-list">
          {relatedArticles.map((item) => (
            <Link key={item.id} href={`/articles/${item.id}`} className="detail-list-item">
              <strong>{item.title}</strong>
              <span>{item.source}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
