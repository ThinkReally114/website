# 假模型中转（Cloudflare Worker）

整活用的 OpenAI 兼容接口。不需要任何密钥、不请求上游，任何对话请求都返回同一段字符画（用 ` ```text ` 包裹，客户端按等宽渲染）。

## 端点

- `GET /v1/models`：`gpt-6-astra`、`claude-opus-5.5`，无需鉴权
- `POST /v1/chat/completions`：需要 Key，模型名必须在白名单内
- 其他路径：404，响应里带可用端点提示

鉴权：`Authorization: Bearer sk-thinkreally114-worker-111` 或 `x-api-key`，不匹配返回 401。

每次对话请求会先随机等 5～20 秒再返回。`stream: true` 时按 16 token/s 吐字（1 token 约 4 字符，一块一块发，收尾带 `[DONE]`），整段字符画大约要 18 秒。

## 文件

- `index.js`：入口，`import { RELAY_ANSWER } from './art.js'`
- `art.js`：字符画与包裹后的完整回答，由 `npm run build:worker` 从 `src/relay/payload.ts` 生成，别手改
- `single.js`：无 import 的单文件版本，给 Cloudflare 控制台粘贴用

## 部署

控制台：Workers & Pages → Create → 粘贴 `single.js` → Deploy。

命令行：`npx wrangler login`，然后在本目录 `npx wrangler deploy`。

改完字符画记得先 `npm run build:worker` 重新生成 `art.js` 与 `single.js`。
