# MVP Verification Runbook

- Checklist: local setup, migrations, crawler trigger, advisor smoke test

## Local setup
- `npm install`
- `cd apps/crawler && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`

## Apply DB migrations
- `supabase db push`

## Trigger crawler manually
- `python apps/crawler/main.py`

## Advisor smoke test
- 注册新用户并填写企业信息
- 输入完整业务需求并确认返回 1-3 个方案
- 点击导出按钮验证 PDF 可下载
