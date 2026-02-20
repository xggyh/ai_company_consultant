"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { FeedData } from "../../lib/data/repository";

type Favorites = {
  model_ids: string[];
  article_ids: string[];
};

type FeedMode = "all" | "models" | "articles" | "favorites";
type ModelTab = "featured" | "practical";

type ModelCardView = FeedData["models"][number];

function includesId(ids: string[], target: string) {
  return ids.includes(target);
}

function sortByComposite(models: ModelCardView[]) {
  return [...models].sort((a, b) => b.composite_score - a.composite_score);
}

export function FeedStream({
  models,
  articles,
  favorites,
  mode = "all",
  title = "模型与资讯推荐流",
  subtitle = "根据企业标签进行个性化排序",
}: {
  models: FeedData["models"];
  articles: FeedData["articles"];
  favorites: Favorites;
  mode?: FeedMode;
  title?: string;
  subtitle?: string;
}) {
  const [favoriteState, setFavoriteState] = useState<Favorites>(favorites);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [modelTab, setModelTab] = useState<ModelTab>("featured");

  const favoriteModelSet = useMemo(() => new Set(favoriteState.model_ids), [favoriteState.model_ids]);
  const favoriteArticleSet = useMemo(() => new Set(favoriteState.article_ids), [favoriteState.article_ids]);

  const rawVisibleModels = useMemo(() => {
    if (mode === "articles") return [];
    if (mode === "favorites") return models.filter((model) => favoriteModelSet.has(model.id));
    return models;
  }, [mode, models, favoriteModelSet]);

  const segmentedModels = useMemo(() => {
    const featured = sortByComposite(rawVisibleModels.filter((model) => model.group === "featured"));
    const practical = sortByComposite(rawVisibleModels.filter((model) => model.group === "practical"));
    return { featured, practical };
  }, [rawVisibleModels]);

  const visibleModels = useMemo(() => {
    if (mode !== "models") return sortByComposite(rawVisibleModels);
    return modelTab === "featured" ? segmentedModels.featured : segmentedModels.practical;
  }, [mode, rawVisibleModels, modelTab, segmentedModels]);

  const visibleArticles = useMemo(() => {
    if (mode === "models") return [];
    if (mode === "favorites") return articles.filter((article) => favoriteArticleSet.has(article.id));
    return articles;
  }, [mode, articles, favoriteArticleSet]);

  async function toggleFavorite(payload: { model_id?: string; article_id?: string }, isActive: boolean) {
    const targetId = payload.model_id ?? payload.article_id ?? null;
    if (!targetId) {
      return;
    }

    setPendingId(targetId);

    try {
      const res = await fetch("/api/favorites", {
        method: isActive ? "DELETE" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("收藏状态更新失败");
      }

      const data = (await res.json()) as { favorites?: Favorites };
      if (data.favorites) {
        setFavoriteState(data.favorites);
      }
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="feed-wrap panel">
      <div className="feed-header">
        <h2>{title}</h2>
        <span>{subtitle}</span>
      </div>

      {mode === "models" ? (
        <section className="model-tab-wrap">
          <div className="model-tab-header">
            <div className="model-tab-group" role="tablist" aria-label="模型分组">
              <button
                role="tab"
                aria-selected={modelTab === "featured"}
                type="button"
                className={`model-tab-btn ${modelTab === "featured" ? "model-tab-btn-active" : ""}`}
                onClick={() => setModelTab("featured")}
              >
                精选模型
                <span>{segmentedModels.featured.length}</span>
              </button>
              <button
                role="tab"
                aria-selected={modelTab === "practical"}
                type="button"
                className={`model-tab-btn ${modelTab === "practical" ? "model-tab-btn-active" : ""}`}
                onClick={() => setModelTab("practical")}
              >
                开源与普适模型
                <span>{segmentedModels.practical.length}</span>
              </button>
            </div>
            <p className="model-tab-desc">
              {modelTab === "featured"
                ? "面向能力上限与关键业务价值，适合打造标杆场景。"
                : "面向性价比与稳定落地，适合大多数企业任务。"}
            </p>
          </div>
        </section>
      ) : null}

      {visibleModels.length > 0 ? (
        <div className="model-grid">
          {visibleModels.map((model) => {
            const active = includesId(favoriteState.model_ids, model.id);
            const loading = pendingId === model.id;

            return (
              <article key={model.id} className="model-card model-card-human">
                <div className="model-head">
                  <div>
                    <strong>{model.name}</strong>
                    <p className="card-provider">{model.provider}</p>
                  </div>
                  <div className="model-score-wrap">
                    <span className="score-tag">综合 {model.composite_score}</span>
                    <small>能力 {model.capability_score} · 落地 {model.delivery_score}</small>
                  </div>
                </div>

                <p className="model-best-for">{model.best_for}</p>

                <dl className="model-facts">
                  <div>
                    <dt>推荐给谁</dt>
                    <dd>{model.fit_team}</dd>
                  </div>
                  <div>
                    <dt>预算档位</dt>
                    <dd>{model.budget_tier}</dd>
                  </div>
                  <div>
                    <dt>上手难度</dt>
                    <dd>{model.rollout_difficulty}</dd>
                  </div>
                  <div>
                    <dt>不建议场景</dt>
                    <dd>{model.avoid_when}</dd>
                  </div>
                </dl>

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
                  <div className="card-actions">
                    <button
                      type="button"
                      className={`favorite-btn ${active ? "favorite-btn-active" : ""}`}
                      disabled={loading}
                      onClick={() => void toggleFavorite({ model_id: model.id }, active)}
                    >
                      {loading ? "处理中..." : active ? "已收藏" : "收藏"}
                    </button>
                    <Link className="detail-link" href={`/models/${model.id}`}>
                      查看详情
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      {visibleArticles.length > 0 ? (
        <>
          <div className="feed-header feed-header-sub">
            <h3>今日资讯</h3>
          </div>
          <div className="article-grid">
            {visibleArticles.map((article) => {
              const active = includesId(favoriteState.article_ids, article.id);
              const loading = pendingId === article.id;

              return (
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
                    <div className="card-actions">
                      <button
                        type="button"
                        className={`favorite-btn ${active ? "favorite-btn-active" : ""}`}
                        disabled={loading}
                        onClick={() => void toggleFavorite({ article_id: article.id }, active)}
                      >
                        {loading ? "处理中..." : active ? "已收藏" : "收藏"}
                      </button>
                      <Link className="detail-link" href={`/articles/${article.id}`}>
                        查看详情
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      ) : null}

      {visibleModels.length === 0 && visibleArticles.length === 0 ? (
        <article className="empty-card">
          <strong>暂无可展示内容</strong>
          <p>你还没有收藏内容，先去探索页添加模型或资讯。</p>
        </article>
      ) : null}
    </section>
  );
}
