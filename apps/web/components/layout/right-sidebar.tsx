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
          <a href="/advisor" className="quick-item">
            发起咨询
          </a>
          <a href="/explore" className="quick-item">
            探索模型
          </a>
          <a href="/explore" className="quick-item">
            今日资讯
          </a>
          <a href="/login" className="quick-item">
            企业信息
          </a>
        </div>
      </section>

      <section>
        <h3 className="section-title">收藏模型</h3>
        <div className="mini-list">
          {favoriteModels.length === 0 ? <p className="empty-tip">暂无收藏</p> : null}
          {favoriteModels.map((model) => (
            <a key={model.id} className="mini-item mini-link" href={`/models/${model.id}`}>
              <div>{model.name}</div>
              <span>{model.provider}</span>
            </a>
          ))}
        </div>
      </section>

      <section>
        <h3 className="section-title">收藏资讯</h3>
        <div className="mini-list">
          {favoriteArticles.length === 0 ? <p className="empty-tip">暂无收藏</p> : null}
          {favoriteArticles.map((article) => (
            <a key={article.id} className="mini-item mini-link" href={`/articles/${article.id}`}>
              <div>{article.title}</div>
              <span>{article.source}</span>
            </a>
          ))}
        </div>
      </section>
    </aside>
  );
}
