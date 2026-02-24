import fs from "fs";
import path from "path";

// API base URL — configurable so it works with:
// - Official Volcengine: https://api.volcengineapi.com
// - Third-party proxies: piapi.ai, apiyi.com, etc.
const API_BASE =
  process.env.SEEDANCE_API_BASE || "https://api.apiyi.com";

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.SEEDANCE_API_KEY}`,
    "Content-Type": "application/json",
  };
}

// Convert local image to base64 data URI
function imageToBase64(imagePath: string): string {
  const ext = path.extname(imagePath).toLowerCase().replace(".", "");
  const mimeType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
  const data = fs.readFileSync(imagePath);
  return `data:${mimeType};base64,${data.toString("base64")}`;
}

export interface GenerateVideoParams {
  imagePath: string;
  dishName: string;
  style: "快手炒菜" | "精品慢镜" | "温馨家常";
  duration: 5 | 10;
}

export interface VideoTask {
  taskId: string;
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl?: string;
  error?: string;
}

// Build Chinese cooking video prompt
function buildPrompt(dishName: string, style: string): string {
  const stylePrompts: Record<string, string> = {
    快手炒菜:
      "快节奏美食短视频，展示食材准备、快速翻炒、调味出锅的烹饪过程，油烟升腾，色泽鲜亮，最终呈现美味的",
    精品慢镜:
      "精致美食纪录片风格，慢动作镜头，细腻展示切菜、烹调、摆盘的每一步，光影唯美，最终完美呈现",
    温馨家常:
      "温馨居家厨房氛围，自然光线，展示家常烹饪的真实过程，从食材备料到出锅装盘，朴实温暖地呈现",
  };
  const prefix = stylePrompts[style] || stylePrompts["温馨家常"];
  return `${prefix}${dishName}，4K高清美食视频，专业摄影，令人食欲大开`;
}

// Submit image-to-video task to Seedance 2.0
export async function createVideoTask(
  params: GenerateVideoParams
): Promise<string> {
  const { imagePath, dishName, style, duration } = params;
  const imageBase64 = imageToBase64(imagePath);
  const prompt = buildPrompt(dishName, style);

  const body = {
    model: "seedance-2.0",
    image: imageBase64,           // base64 data URI
    prompt,
    negative_prompt: "模糊, 低质量, 抖动, 变形, 水印, 文字叠加",
    duration: duration,           // Seedance accepts number (not string)
    aspect_ratio: "9:16",
    resolution: "1080p",          // Seedance supports up to 2K — 1080p is safe default
  };

  const res = await fetch(`${API_BASE}/v1/videos/image2video`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Seedance API error ${res.status}: ${err}`);
  }

  const data = await res.json();

  // Handle both common response formats:
  // Format A (Kling-compatible): { code: 0, data: { task_id: "..." } }
  // Format B (REST standard):    { task_id: "...", status: "pending" }
  const taskId =
    data?.data?.task_id ??
    data?.task_id ??
    data?.id;

  if (!taskId) {
    throw new Error(`Seedance: no task_id in response: ${JSON.stringify(data)}`);
  }

  return taskId as string;
}

// Poll task status
export async function getTaskStatus(taskId: string): Promise<VideoTask> {
  const res = await fetch(`${API_BASE}/v1/videos/image2video/${taskId}`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Seedance poll error ${res.status}`);
  }

  const data = await res.json();

  // Unwrap nested data if present
  const task = data?.data ?? data;

  // Normalise status string across providers
  const rawStatus: string =
    task.task_status ?? task.status ?? "pending";

  const statusMap: Record<string, VideoTask["status"]> = {
    // Volcengine / Kling-compatible
    submitted:  "pending",
    processing: "processing",
    succeed:    "completed",
    succeeded:  "completed",
    failed:     "failed",
    // Generic REST style
    pending:    "pending",
    running:    "processing",
    completed:  "completed",
    done:       "completed",
    error:      "failed",
  };

  const status = statusMap[rawStatus] ?? "pending";

  // Extract video URL across provider response shapes
  const videoUrl =
    status === "completed"
      ? (task.task_result?.videos?.[0]?.url ??   // Kling-compatible
         task.video_url ??                         // simple flat
         task.output?.video_url ??                 // nested output
         task.result?.url)                         // another variant
      : undefined;

  return {
    taskId,
    status,
    videoUrl,
    error: task.error ?? task.message,
  };
}
