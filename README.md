# 个人财务分析

个人财务总览与 HTML 分析报告阅读工具。打开即可查看总资产、总负债、净资产，并按日期回看 AI 上传的分析报告。

## 本地运行

```bash
npm install
npm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000)。

首次启动会自动生成开放接口密钥，写入 `data/.api-key`。也可在 `.env.local` 中设置 `API_KEY`。

## 使用

1. 在「管理」里维护资产和负债明细，首页三个数字按明细汇总。
2. 通过开放接口上传 HTML 分析；首页列表按分析日期倒序展示。
3. 点击列表项打开对应 HTML 报告（沙箱渲染）。

## 开放接口

所有写接口（`POST` / `PUT` / `DELETE`）都需要在请求头带上 `Authorization: Bearer <API_KEY>`，读接口（`GET`）无需鉴权。

### 上传 HTML 分析报告

`POST /api/v1/analyses`

```bash
curl -X POST http://localhost:3000/api/v1/analyses \
  -H "Authorization: Bearer $(cat data/.api-key)" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "2026年9月月度财务分析",
    "analysisDate": "2026-09-10",
    "summary": "净资产较上月增加 1.2 万元，负债结构稳定。",
    "html": "<h1>9月财务分析</h1><p>负债结构稳定。</p>",
    "source": "ai"
  }'
```

### 上传总资产 / 总负债 / 净资产（快照）

`POST /api/v1/snapshots`，按 `date` 去重，重复上传会覆盖当天记录。

```bash
curl -X POST http://localhost:3000/api/v1/snapshots \
  -H "Authorization: Bearer $(cat data/.api-key)" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-09-10",
    "totalAssets": 1234567.89,
    "totalLiabilities": 234567.89,
    "netWorth": 1000000.00,
    "note": "9 月定投后"
  }'
```

`netWorth` 留空时服务端自动按 `totalAssets - totalLiabilities` 计算。最新一条快照会覆盖首页「总资产 / 总负债 / 净资产」。

### 接口清单

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/v1/summary` | 否 | 总资产、总负债、净资产 |
| GET | `/api/v1/assets` | 否 | 资产明细列表 |
| POST | `/api/v1/assets` | 是 | 新增资产明细 |
| PUT | `/api/v1/assets/:id` | 是 | 更新资产明细 |
| DELETE | `/api/v1/assets/:id` | 是 | 删除资产明细 |
| GET | `/api/v1/liabilities` | 否 | 负债明细列表 |
| POST | `/api/v1/liabilities` | 是 | 新增负债明细 |
| PUT | `/api/v1/liabilities/:id` | 是 | 更新负债明细 |
| DELETE | `/api/v1/liabilities/:id` | 是 | 删除负债明细 |
| GET | `/api/v1/snapshots` | 否 | 快照列表 |
| POST | `/api/v1/snapshots` | 是 | 上传 / 覆盖快照 |
| DELETE | `/api/v1/snapshots/:id` | 是 | 删除快照 |
| GET | `/api/v1/analyses` | 否 | 分析列表（分页） |
| GET | `/api/v1/analyses/:id` | 否 | 单条分析 |
| POST | `/api/v1/analyses` | 是 | 上传 HTML 分析报告 |
| DELETE | `/api/v1/analyses/:id` | 是 | 删除分析 |

在「资产管理」页底部可查看 API Key、接口清单和一键复制的 AI 提示词模板，也可调用 `POST /api/v1/auth/rotate` 重新生成密钥。

数据保存在本地 `data/store.json`，单用户使用。
