import Link from "next/link";
import type { FeedData } from "../../lib/data/repository";

type Favorites = {
  model_ids: string[];
  article_ids: string[];
};

export function RightSidebar({
  models,
  articles,
  favorites,
}: {
  models: FeedData["models"];
  articles: FeedData["articles"];
  favorites: Favorites;
}) {
  const favoriteModels = models.filter((model) => favorites.model_ids.includes(model.id));
  const favoriteArticles = articles.filter((article) => favorites.article_ids.includes(article.id));

  return (
    <aside className="panel sidebar-right">
      <section>
        <h3 className="section-title">快捷入口</h3>
        <div className="quick-grid">
          <Link href="/advisor" className="quick-item">
            发起咨询
          </Link>
          <Link href="/insights" className="quick-item">
            资讯速览
          </Link>
          <Link href="/explore" className="quick-item">
            模型对比
          </Link>
          <Link href="/favorites" className="quick-item">
            我的收藏
          </Link>
        </div>
      </section>

      <section>
        <h3 className="section-title">收藏模型</h3>
        <div className="mini-list">
          {favoriteModels.length === 0 ? <p className="empty-tip">暂无收藏</p> : null}
          {favoriteModels.map((model) => (
            <Link key={model.id} className="mini-item mini-link" href={`/models/${model.id}`}>
              <div>{model.name}</div>
              <span>{model.provider}</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h3 className="section-title">收藏资讯</h3>
        <div className="mini-list">
          {favoriteArticles.length === 0 ? <p className="empty-tip">暂无收藏</p> : null}
          {favoriteArticles.map((article) => (
            <Link key={article.id} className="mini-item mini-link" href={`/articles/${article.id}`}>
              <div>{article.title}</div>
              <span>{article.source}</span>
            </Link>
          ))}
        </div>
      </section>
    </aside>
  );
}
