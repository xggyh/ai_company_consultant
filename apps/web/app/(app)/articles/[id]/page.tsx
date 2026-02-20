import Link from "next/link";
import { notFound } from "next/navigation";
import { getDataRepository } from "../../../../lib/data/repository";

export default async function ArticleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = getDataRepository();
  const [profile, article] = await Promise.all([repo.getProfile(), repo.getArticleById(id)]);
  if (!article) {
    notFound();
  }

  const feed = await repo.getFeed(profile);
  const relatedArticles = feed.articles.filter((item) => item.id !== article.id).slice(0, 5);

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
        <p className="detail-kicker">资讯详情</p>
        <h1>{article.title}</h1>
        <p className="detail-sub">
          {article.source}
          {article.published_at ? ` · ${new Date(article.published_at).toLocaleString("zh-CN")}` : ""}
        </p>

        <div className="detail-chip-row">
          {article.tags.length > 0 ? (
            article.tags.map((tag) => (
              <span key={tag} className="chip">
                {tag}
              </span>
            ))
          ) : (
            <span className="chip">AI资讯</span>
          )}
        </div>

        <p className="detail-desc">{article.summary || "暂无摘要"}</p>
        <div className="detail-content">{article.content || "暂无正文内容，请点击原文查看。"}</div>

        {article.url ? (
          <div className="detail-links">
            <a href={article.url} target="_blank" rel="noreferrer" className="btn btn-ghost">
              查看原文
            </a>
          </div>
        ) : null}
      </article>

      <section className="detail-side panel">
        <h2>相关推荐</h2>
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
