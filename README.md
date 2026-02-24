# 🍳 美食视频生成器

上传一张做好的菜品图片，AI 自动生成做饭过程短视频，添加背景音乐和字幕，一键导出 TikTok / YouTube / 小红书三个平台版本。

**视频引擎：Seedance 2.0（字节跳动）**

---

## 快速开始

### 第一步：填写 API Key

编辑 `.env.local`：

```
SEEDANCE_API_KEY=你的API_Key
SEEDANCE_API_BASE=https://api.apiyi.com   # 根据服务商修改
```

**获取 Seedance 2.0 API Key（任选一个）：**

| 服务商 | 地址 | 说明 |
|--------|------|------|
| 官方 Volcengine | [volcengine.com](https://www.volcengine.com) | 最正式，需大陆账号 |
| apiyi.com | [apiyi.com](https://apiyi.com) | 第三方代理，注册简单 |
| piapi.ai | [piapi.ai](https://piapi.ai) | 英文界面，支持信用卡 |

注册后在「API Key / Developer」页面生成，格式通常是 `sk-xxxx`。

### 第二步：替换背景音乐（可选）

把你喜欢的 MP3 放入 `public/music/`，替换同名文件：
- `gentle_bgm.mp3` — 温柔风格
- `upbeat_bgm.mp3` — 活泼风格
- `elegant_bgm.mp3` — 精致优雅

推荐免费音乐：[YouTube 音频库](https://studio.youtube.com/channel/music)、[Pixabay Music](https://pixabay.com/music/)

### 第三步：启动

```bash
cd /Users/xiaoyandang/cooking-video
npm run dev
```

打开浏览器：**http://localhost:3000**

---

## 使用流程

1. 上传菜品成品图片（JPG/PNG/WebP，≤10MB）
2. 输入菜品名称，如「红烧肉」
3. 选择视频风格和背景音乐
4. 点击「生成视频」（约 1-3 分钟）
5. 下载三个平台的成品视频

---

## 导出格式

| 平台 | 比例 | 说明 |
|------|------|------|
| TikTok | 9:16 | 竖屏，强节奏 |
| YouTube | 16:9 | 横屏，长视频 |
| 小红书 | 9:16 | 竖屏，大字幕 |

生成的视频保存在 `output/<任务ID>/` 目录。

---

## 技术栈

- **前端**: Next.js 16 + TypeScript + Tailwind CSS
- **视频生成**: Seedance 2.0 image-to-video API（字节跳动）
- **视频处理**: FFmpeg (本地)
- **认证**: Bearer Token（简单，无需 JWT）

## 费用参考（Seedance 2.0）

| 时长 | 分辨率 | 费用（约） |
|------|--------|-----------|
| 5 秒 | 1080p | ¥2-4 / 条 |
| 10 秒 | 1080p | ¥4-8 / 条 |

*以实际服务商计费为准。*
