import type { FeedData } from "../../lib/data/repository";

export function FeedStream({
  models,
  articles,
}: {
  models: FeedData["models"];
  articles: FeedData["articles"];
}) {
  return (
    <section className="feed-wrap panel">
      <div className="feed-header">
        <h2>模型与资讯探索流</h2>
        <span>根据企业标签实时排序</span>
      </div>

      <div className="model-grid">
        {models.map((model) => (
          <article key={model.id} className="model-card">
            <div className="card-top">
              <div>
                <strong>{model.name}</strong>
                <p className="card-provider">{model.provider}</p>
              </div>
              <span className="score-tag">匹配度 {model.score}</span>
            </div>

            <p className="card-desc">{model.description || "暂无模型描述"}</p>

            <div className="chip-row">
              {model.business_scenarios.slice(0, 3).map((scenario) => (
                <span key={scenario} className="chip">
                  {scenario}
                </span>
              ))}
            </div>

            <div className="card-foot">
              <small>
                输入 ¥{model.cost_input || 0}/1M · 输出 ¥{model.cost_output || 0}/1M
              </small>
              <a className="detail-link" href={`/models/${model.id}`}>
                查看详情
              </a>
            </div>
          </article>
        ))}
      </div>

      <div className="feed-header feed-header-sub">
        <h3>今日资讯</h3>
      </div>
      <div className="article-grid">
        {articles.map((article) => (
          <article key={article.id} className="article-card">
            <div>
              <strong>{article.title}</strong>
              <p>{article.summary || "暂无摘要"}</p>
            </div>
            <div className="chip-row compact">
              {article.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="chip">
                  {tag}
                </span>
              ))}
            </div>
            <div className="article-foot">
              <span className="article-meta">{article.source}</span>
              <a className="detail-link" href={`/articles/${article.id}`}>
                查看详情
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
