"use client";

import { useState } from "react";
import { INDUSTRY_TAGS, SCALE_TAGS } from "../../lib/tags";

type FormState = {
  email: string;
  company_name: string;
  company_industry: string;
  company_scale: string;
};

const initialState: FormState = {
  email: "",
  company_name: "",
  company_industry: INDUSTRY_TAGS[8],
  company_scale: SCALE_TAGS[2],
};

export function LoginForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  async function submit() {
    setSaving(true);
    setNotice("");

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        throw new Error("保存失败");
      }
      setNotice("保存成功，正在进入主面板...");
      setTimeout(() => {
        window.location.href = "/";
      }, 800);
    } catch {
      setNotice("保存失败，请检查信息后重试");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="login-card">
      <h1>登录并初始化企业档案</h1>
      <p>填写企业信息后，系统将提供个性化模型与资讯推荐。</p>

      <label>
        邮箱
        <input
          value={form.email}
          onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          placeholder="name@company.com"
        />
      </label>

      <label>
        企业名称
        <input
          value={form.company_name}
          onChange={(event) => setForm((prev) => ({ ...prev, company_name: event.target.value }))}
          placeholder="你的企业名称"
        />
      </label>

      <label>
        行业
        <select
          value={form.company_industry}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, company_industry: event.target.value }))
          }
        >
          {INDUSTRY_TAGS.map((industry) => (
            <option key={industry} value={industry}>
              {industry}
            </option>
          ))}
        </select>
      </label>

      <label>
        企业规模
        <select
          value={form.company_scale}
          onChange={(event) => setForm((prev) => ({ ...prev, company_scale: event.target.value }))}
        >
          {SCALE_TAGS.map((scale) => (
            <option key={scale} value={scale}>
              {scale}
            </option>
          ))}
        </select>
      </label>

      <button type="button" className="btn btn-main" onClick={() => void submit()} disabled={saving}>
        {saving ? "保存中..." : "保存并进入"}
      </button>

      {notice ? <div className="notice-text">{notice}</div> : null}
    </div>
  );
}
