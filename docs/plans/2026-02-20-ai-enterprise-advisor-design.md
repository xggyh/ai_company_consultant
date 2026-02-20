# AI企业顾问 - 产品设计文档

**日期**: 2026-02-20
**版本**: v1.0 (MVP)

## 1. 产品概述

帮助企业高层和业务负责人了解AI能力，将AI应用到业务中的决策辅助SaaS产品。

### 核心目标用户
- 企业高层决策者（CTO/CEO）
- 业务部门负责人
- 非技术背景，但需要了解AI应用的人

## 2. 技术架构

### 2.1 技术栈

| 层级 | 选型 |
|------|------|
| 前端框架 | Next.js 15 + React |
| 样式 | Tailwind CSS + shadcn/ui |
| 后端 | Next.js API Routes |
| 数据库/认证 | Supabase (PostgreSQL + Auth) |
| AI API | ByteDance Ark API |
| 多智能体 | LangGraph |
| 爬虫 | Python + BeautifulSoup4 |
| 定时任务 | GitHub Actions |
| 部署 | Vercel |

### 2.2 系统架构图

```
                    ┌─────────────┐
                    │   用户层    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Vercel CDN │
                    │ (Next.js SSR)│
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼────┐      ┌─────▼─────┐    ┌─────▼──────┐
    │ Next.js │      │  Supabase │    │  ByteDance │
    │API Routes│      │ (DB/Auth) │    │   Ark API  │
    └────┬────┘      └─────┬─────┘    └─────┬──────┘
         │                  │                  │
         └──────────────────┼──────────────────┘
                            │
                   ┌────────▼────────┐
                   │  GitHub Actions │
                   │   (每日爬虫)    │
                   └─────────────────┘
```

## 3. 数据模型

### 3.1 users (用户表)
```sql
id (uuid, primary key)
email (text, unique)
company_name (text)
company_industry (text)
company_scale (text)
created_at (timestamp)
```

### 3.2 models (AI模型表)
```sql
id (uuid, primary key)
name (text)
provider (text)
description (text)
cost_input (numeric)
cost_output (numeric)
api_url (text)
docs_url (text)
business_scenarios (text[])
release_date (date)
source_url (text)
created_at (timestamp)
updated_at (timestamp)
```

### 3.3 articles (资讯文章表)
```sql
id (uuid, primary key)
title (text)
summary (text)
content (text)
source (text)
url (text)
tags (text[])
published_at (timestamp)
created_at (timestamp)
```

### 3.4 favorites (收藏表)
```sql
id (uuid, primary key)
user_id (uuid, foreign key -> users)
model_id (uuid, foreign key -> models, nullable)
article_id (uuid, foreign key -> articles, nullable)
created_at (timestamp)
```

### 3.5 conversations (对话历史表)
```sql
id (uuid, primary key)
user_id (uuid, foreign key -> users)
title (text)
created_at (timestamp)
updated_at (timestamp)
```

### 3.6 messages (消息表)
```sql
id (uuid, primary key)
conversation_id (uuid, foreign key -> conversations)
role (text)
content (text)
agent_type (text, nullable)
created_at (timestamp)
```

### 3.7 solutions (方案表)
```sql
id (uuid, primary key)
user_id (uuid, foreign key -> users)
conversation_id (uuid, foreign key -> conversations)
title (text)
content (jsonb)
pdf_url (text, nullable)
created_at (timestamp)
```

## 4. Tag 体系

### 4.1 企业行业 Tags
- 电商零售
- 金融科技
- 教育培训
- 医疗健康
- 制造业
- 农业
- 物流运输
- 文化传媒
- 企业服务（SaaS）
- 游戏娱乐
- 房地产
- 能源环保
- 政务公共
- 餐饮旅游
- 法律咨询
- 人力资源
- 广告营销
- 智能硬件
- 生物科技
- 其他

### 4.2 企业规模 Tags
- 初创（<20人）
- 小型（20-100人）
- 中型（100-500人）
- 大型（500-2000人）
- 超大型（>2000人）

### 4.3 模型业务场景 Tags
- 内容生成（文案、文章、营销内容）
- 客服对话（智能客服、问答机器人）
- 数据分析（报表生成、洞察发现）
- 代码辅助（代码生成、review、debug）
- 图像处理（生成、编辑、识别）
- 语音处理（语音转文字、文字转语音）
- 知识问答（知识库、RAG系统）
- 文档处理（摘要、翻译、格式化）
- 决策辅助（商业分析、策略建议）
- 自动化工作流（任务编排、agent调度）
- 多模态（图文音视频综合）

## 5. 多智能体设计

### 5.1 Agent 流程

```
用户输入业务描述
        │
        ▼
┌─────────────────┐
│  需求理解Agent │
│  (Demand Agent)│
└────────┬────────┘
         │
         ├─► 追问（如果信息不足）
         │
         ▼
┌─────────────────┐
│  方案设计Agent │
│ (Solution Agent)│
└────────┬────────┘
         │
         ├─► 推荐适用模型
         ├─► 给出落地方案
         └─► 估算成本
         │
         ▼
    输出给用户
```

### 5.2 Demand Agent 职责
- 理解用户的业务场景
- 提取关键信息：行业、规模、当前痛点、期望目标
- 判断信息是否充足，不足则追问
- 输出结构化的需求文档

### 5.3 Solution Agent 职责
- 基于需求，从 models 表检索匹配的模型
- 设计1-3个AI应用落地方案
- 包含：场景描述、技术架构、成本估算、ROI分析
- 方案结构：
  - 方案概述
  - 适用模型推荐（带成本对比）
  - 实施步骤
  - 预期效果
  - 风险提示

## 6. 爬虫设计

### 6.1 爬虫源

**模型数据源：**
- OpenRouter (https://openrouter.ai/models)
- HuggingFace Models (https://huggingface.co/models)
- LiteLLM (https://litellm.ai)

**AI资讯源（中文）：**
- 机器之心 (https://www.jiqizhixin.com)
- 量子位 (https://www.qbitai.com)
- 36氪AI (https://36kr.com/column/104812)
- 钛媒体AI (https://www.tmtpost.com/column/ai)
- 新智元 (https://www.ai-xinzhiyuan.com)
- InfoQ中国 (https://www.infoq.cn/topic/artificial-intelligence)

**AI资讯源（英文）：**
- AI Weekly / The Batch (DeepLearning.AI)
- Towards Data Science (Medium)
- MIT Technology Review AI
- OpenAI Blog / Anthropic Blog

### 6.2 执行方式
- GitHub Actions 每天凌晨2点触发
- Python脚本：BeautifulSoup4 + requests
- 数据去重：通过URL/模型名称判断
- 更新策略：已存在的模型只更新变化字段

### 6.3 内容整合流程
```
原始内容 (HTML)
      │
      ▼
提取标题/正文/时间/来源
      │
      ▼
调用 Ark API:
  - 生成100-200字摘要
  - 提取关键词
  - 打上业务场景tag
      │
      ▼
存入 Supabase
```

## 7. UI/UX 设计

### 7.1 整体风格
- 配色：Claude风格 (#D97757 主色，#F5F5F5 背景，#2A2A2A 文字)
- 字体：Inter / Geist Sans
- 组件库：shadcn/ui + Tailwind CSS

### 7.2 页面结构

**登录页**
- Logo + 邮箱/密码登录 + 企业信息填写

**主应用（三栏布局）**
```
┌─────────────┬──────────────────────────────────┬───────────────┐
│  左侧边栏   │           中间主内容区          │   右侧边栏   │
│             │                                  │               │
│  - Logo     │  ┌────────────────────────────┐ │  - 快捷入口  │
│  - 导航     │  │    模型/资讯推荐流        │ │  - 收藏列表  │
│  - 历史对话 │  └────────────────────────────┘ │  - 个人设置  │
│             │  ┌────────────────────────────┐ │               │
│             │  │    AI顾问对话区            │ │               │
│             │  └────────────────────────────┘ │               │
└─────────────┴──────────────────────────────────┴───────────────┘
```

**模型详情页**
- 模型基本信息、成本、适用场景
- 类似模型推荐
- 收藏按钮

**对话页**
- Claude风格聊天界面
- 方案生成后有"导出PDF"按钮

## 8. 核心流程

### 8.1 新用户注册 → 个性化推荐
1. 用户访问网站
2. 注册/登录（Supabase Auth）
3. 填写企业信息：名称 + 行业 + 规模
4. 系统根据行业/规模tag匹配推荐模型和资讯
5. 展示个性化首页

### 8.2 用户与AI顾问对话
1. 用户点击"AI顾问"
2. 输入业务问题/需求
3. Demand Agent 分析，必要时追问
4. Solution Agent 生成方案
5. 用户查看方案，可收藏/继续对话/导出PDF

### 8.3 每日爬虫更新
1. GitHub Actions 每天凌晨2点触发
2. 爬虫脚本依次访问各数据源
3. 抓取新内容
4. 调用Ark API生成摘要和标签
5. 去重后存入Supabase
6. 更新用户的推荐 feed

## 9. 功能清单（MVP）

| 模块 | 功能 |
|------|------|
| 用户系统 | 注册/登录、企业信息设置 |
| 模型库 | 模型列表、详情、搜索、筛选 |
| 资讯流 | 资讯列表、详情、摘要 |
| 个性化推荐 | 基于企业tag的模型/资讯推荐 |
| AI顾问 | 双Agent对话、需求理解、方案生成 |
| 收藏 | 收藏模型/资讯、收藏列表 |
| 历史对话 | 对话列表、消息历史 |
| 方案导出 | 方案PDF导出 |
| 爬虫 | 每日自动采集、内容摘要生成 |

## 10. 成功标准

MVP 成功标准：完整流程跑通
- 爬虫能采集数据并存入数据库
- 用户能注册登录并填写企业信息
- 用户能看到个性化推荐的模型和资讯
- 用户能与AI顾问对话并获得方案
- 用户能收藏、查看历史对话、导出PDF

---

**下一步：调用 writing-plans skill 生成实施计划**
