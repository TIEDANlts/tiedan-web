# 快捷记账配置

快捷记账接口是 `POST /api/quick/expense`，用于从 iOS 快捷指令或安卓快捷 HTTP 工具直接写入消费流水。

## 环境变量

在本地或生产环境配置一个长随机 token：

```powershell
node -e "console.log(crypto.randomBytes(32).toString('hex'))"
```

把输出写入环境变量：

```text
QUICK_ADD_TOKEN=你的长随机字符串
```

未配置 `QUICK_ADD_TOKEN` 时，接口返回 `404`，等同于禁用。

## iOS 快捷指令

1. 新建快捷指令，添加“听写文本”动作，语言选择中文。
2. 添加“获取 URL 内容”动作。
3. URL 填写 `https://你的域名/api/quick/expense`。
4. 方法选择 `POST`。
5. 请求体选择 JSON，添加字段 `text`，值使用上一步听写文本。
6. Header 添加：

```text
Authorization: Bearer 你的QUICK_ADD_TOKEN
Content-Type: application/json
```

7. 可选：添加“显示通知”，内容使用接口返回结果。

锁屏或动作按钮触发后，说“咖啡 35”，流水页会出现一条 `platform=quick` 的支出记录。

## 安卓 HTTP Request Shortcuts

以 HTTP Request Shortcuts 为例：

- Method：`POST`
- URL：`https://你的域名/api/quick/expense`
- Headers：

```text
Authorization: Bearer 你的QUICK_ADD_TOKEN
Content-Type: application/json
```

- Body type：Raw JSON
- Body：

```json
{
  "text": "咖啡 35"
}
```

如果要用语音输入，把 body 里的固定文本替换为应用提供的变量。

## curl 自测

PowerShell：

```powershell
curl.exe -X POST "https://你的域名/api/quick/expense" `
  -H "Authorization: Bearer 你的QUICK_ADD_TOKEN" `
  -H "Content-Type: application/json" `
  -d "{\"text\":\"咖啡 35\"}"
```

本地开发可把域名替换为 `http://localhost:3000`。正确 token 返回 `201`；错误 token 返回 `401`；未配置 `QUICK_ADD_TOKEN` 返回 `404`；同一 token 每分钟超过 10 次返回 `429`。
