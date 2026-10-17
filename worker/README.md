# LLM 代理（Cloudflare Worker，可选备用）

> 现在 `/playground` 默认直连 **DeepSeek 官方接口**（`https://api.deepseek.com/chat/completions`），
> 它允许浏览器跨域直连，**正常情况下不需要这个 Worker**。
> 只有当你把接口换回智谱官方（预检不带 CORS 头）或其他不允许浏览器直连的地址时，
> 才需要部署它，然后在「接口设置」里把接口地址改成 Worker 地址。

智谱官方接口 `https://open.bigmodel.cn/api/paas/v4/chat/completions`
不会响应浏览器的 CORS 预检（OPTIONS 不带 `Access-Control-Allow-Origin`），
所以静态站无法直连，必须走一层自己的代理。

这个 Worker 就是那层代理：浏览器 → Worker → 智谱，Key 只存在 Worker 的 Secret 里，
不会进入前端产物，也不会进 Git。

## 部署

```sh
cd worker
npx wrangler login
npx wrangler secret put ZHIPU_API_KEY
npx wrangler deploy
```

`deploy` 成功后会得到一个形如 `https://thinkreally114-llm-proxy.<你的账号>.workers.dev` 的地址。

## 让站点用上它

在 `/playground` → 「接口设置」里把「接口地址」改成 Worker 地址并保存，
或在构建期用仓库变量 `VITE_LLM_ENDPOINT` 注入（`deploy.yml` 会透传给 Vite）。
该值只写在访问者自己的 localStorage 里。

## 行为与限制

- 只接受 `POST`，并对 `OPTIONS` 返回预检响应。
- 模型白名单只有 `glm-4.6v-flash`，传别的模型直接报 400（不静默篡改你的请求）。
- 强制 `stream: true`、`max_tokens: 2048`，`temperature` 限制在 0～1.5。
- 优先用 Worker 的 `ZHIPU_API_KEY`；没有配置 Secret 时，会退而使用请求头里的
  `Authorization`（便于访客自带 Key 调试）。
- 不做限流。建议在 Cloudflare 控制台给这个 Worker 配一条 Rate limiting 规则，
  避免被别人拿去刷。

## 备选：不用 Worker

任何支持服务端转发的环境都可以，只要满足：

- 向智谱接口转发请求并把 `Authorization: Bearer <key>` 加在服务端；
- 对浏览器返回 `Access-Control-Allow-Origin`；
- 把上游的 SSE 流原样透传（不要缓冲，否则打字机会变成一次性输出）。
