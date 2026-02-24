import fs from "fs";
import path from "path";

// fal.ai queue API
// Docs: https://fal.ai/docs/model-endpoints/queue
const MODEL_ID = "fal-ai/kling-video/v1.6/standard/image-to-video";
const QUEUE_BASE = `https://queue.fal.run/${MODEL_ID}`;

function authHeader() {
  return { Authorization: `Key ${process.env.FAL_KEY!}` };
}

// fetch with a hard timeout — Node.js fetch 默认永不超时，必须手动加
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 30_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Convert local image to data URI (fal.ai accepts data URIs as image_url)
function imageToDataUri(imagePath: string): string {
  const ext = path.extname(imagePath).toLowerCase().replace(".", "");
  const mimeType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
  const data = fs.readFileSync(imagePath);
  return `data:${mimeType};base64,${data.toString("base64")}`;
}

// Build Chinese cooking prompt
function buildPrompt(dishName: string, style: string): string {
  const stylePrompts: Record<string, string> = {
    快手炒菜: "快节奏美食短视频风格，展示食材准备、快速翻炒、调味出锅的烹饪过程，油烟升腾，色泽鲜亮，最终呈现美味的",
    精品慢镜: "精致美食纪录片风格，慢动作镜头，细腻展示切菜、烹调、摆盘的每一个步骤，光影唯美，最终完美呈现",
    温馨家常: "温馨居家厨房氛围，自然光线，展示家常烹饪的真实过程，从食材到出锅，朴实温暖地呈现",
  };
  const prefix = stylePrompts[style] ?? stylePrompts["温馨家常"];
  return `${prefix}${dishName}，高清美食视频，专业摄影，令人食欲大开`;
}

// ── Public interface ───────────────────────────────────────────────────────

export interface GenerateVideoParams {
  imagePath: string;
  dishName: string;
  style: "快手炒菜" | "精品慢镜" | "温馨家常";
  duration: 5 | 10;
  customPrompt?: string; // 若提供则直接使用，否则自动生成
}

export interface FalTask {
  taskId: string;
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl?: string;
  error?: string;
}

// Internal shape we encode into the opaque taskId string
interface FalHandle {
  requestId: string;
  statusUrl: string;   // exact URL returned by fal.ai on submit
  responseUrl: string; // exact URL to fetch result once completed
}

/**
 * Submit image-to-video job to fal.ai queue.
 * Returns an opaque string that encodes requestId + statusUrl + responseUrl,
 * so getTaskStatus can use the correct URLs without re-constructing them.
 */
export async function createVideoTask(params: GenerateVideoParams): Promise<string> {
  const { imagePath, dishName, style, duration, customPrompt } = params;
  const imageUrl = imageToDataUri(imagePath);
  // 用户自定义 prompt 优先；为空则根据风格自动生成
  const prompt = customPrompt?.trim() || buildPrompt(dishName, style);
  console.log("[fal] using prompt:", prompt);

  const res = await fetchWithTimeout(QUEUE_BASE, {
    method: "POST",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: imageUrl,
      prompt,
      duration: duration.toString(), // "5" or "10"
      aspect_ratio: "9:16",
    }),
  }, 60_000); // 提交允许 60 秒（图片 base64 较大）

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`fal.ai submit error ${res.status}: ${err}`);
  }

  // fal.ai returns: { request_id, status, status_url, response_url, cancel_url }
  const data = await res.json();
  console.log("[fal] submit response:", JSON.stringify(data));

  const handle: FalHandle = {
    requestId: data.request_id,
    statusUrl: data.status_url   ?? `${QUEUE_BASE}/requests/${data.request_id}/status`,
    responseUrl: data.response_url ?? `${QUEUE_BASE}/requests/${data.request_id}`,
  };

  return JSON.stringify(handle);
}

/**
 * Poll fal.ai for task status using the exact URLs from the submit response.
 * taskId is the opaque JSON string returned by createVideoTask.
 */
export async function getTaskStatus(taskId: string): Promise<FalTask> {
  const { requestId, statusUrl, responseUrl } = JSON.parse(taskId) as FalHandle;

  // Check status（每次轮询最多等 30 秒）
  const statusRes = await fetchWithTimeout(statusUrl, { headers: authHeader() }, 30_000);

  if (!statusRes.ok) {
    throw new Error(`fal.ai status error ${statusRes.status} for ${statusUrl}`);
  }

  const statusData = await statusRes.json();
  console.log("[fal] status response:", JSON.stringify(statusData));

  // fal.ai statuses: IN_QUEUE → IN_PROGRESS → COMPLETED / FAILED
  const statusMap: Record<string, FalTask["status"]> = {
    IN_QUEUE: "pending",
    IN_PROGRESS: "processing",
    COMPLETED: "completed",
    FAILED: "failed",
  };
  const status = statusMap[statusData.status] ?? "pending";

  if (status === "completed") {
    // Fetch the actual result to get video URL
    const resultRes = await fetchWithTimeout(responseUrl, { headers: authHeader() }, 30_000);
    if (resultRes.ok) {
      const result = await resultRes.json();
      console.log("[fal] result response:", JSON.stringify(result));
      // fal.ai Kling response: { video: { url, content_type, file_size, ... } }
      const videoUrl: string | undefined = result.video?.url;
      return { taskId, status, videoUrl };
    }
  }

  if (status === "failed") {
    const errMsg = statusData.error ?? statusData.detail ?? "fal.ai generation failed";
    return { taskId, status, error: String(errMsg) };
  }

  return { taskId, status };
}
