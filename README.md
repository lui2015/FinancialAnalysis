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

配套接口：

- `GET /api/v1/summary`
- `GET /api/v1/analyses`
- `GET /api/v1/analyses/:id`
- `DELETE /api/v1/analyses/:id`

数据保存在本地 `data/store.json`，单用户使用。
