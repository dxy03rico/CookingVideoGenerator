import jwt from "jsonwebtoken";
import fs from "fs";

const API_BASE = "https://api.klingai.com";

// Generate JWT token for Kling AI authentication
function generateToken(): string {
  const accessKey = process.env.KLING_ACCESS_KEY!;
  const secretKey = process.env.KLING_SECRET_KEY!;
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: accessKey,
    exp: now + 1800, // 30 minutes
    nbf: now - 5,
  };
  return jwt.sign(payload, secretKey, { algorithm: "HS256" });
}

function authHeaders() {
  return {
    Authorization: `Bearer ${generateToken()}`,
    "Content-Type": "application/json",
  };
}

// Convert local image file to raw base64 string (NO data URI prefix)
// Kling API expects pure base64, e.g. "/9j/4AAQ..." — NOT "data:image/jpeg;base64,..."
function imageToBase64(imagePath: string): string {
  const data = fs.readFileSync(imagePath);
  return data.toString("base64");
}

export interface GenerateVideoParams {
  imagePath: string; // local path to uploaded image
  dishName: string;
  style: "快手炒菜" | "精品慢镜" | "温馨家常";
  duration: 5 | 10;
}

export interface KlingTask {
  taskId: string;
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl?: string;
  error?: string;
}

// Build a Chinese prompt for cooking video based on dish and style
function buildPrompt(dishName: string, style: string): string {
  const stylePrompts: Record<string, string> = {
    快手炒菜:
      "快节奏美食短视频风格，展示食材准备、快速翻炒、调味出锅的烹饪过程，油烟升腾，色泽鲜亮，最终呈现美味的",
    精品慢镜:
      "精致美食纪录片风格，慢动作镜头，细腻展示切菜、烹调、摆盘的每一个步骤，光影唯美，最终完美呈现",
    温馨家常:
      "温馨居家厨房氛围，自然光线，展示家常烹饪的真实过程，从食材到出锅，朴实温暖地呈现",
  };
  const prefix = stylePrompts[style] || stylePrompts["温馨家常"];
  return `${prefix}${dishName}，高清美食视频，专业摄影，令人食欲大开`;
}

// Submit image-to-video task to Kling AI
export async function createVideoTask(
  params: GenerateVideoParams
): Promise<string> {
  const { imagePath, dishName, style, duration } = params;
  const imageBase64 = imageToBase64(imagePath);
  const prompt = buildPrompt(dishName, style);

  const body = {
    model_name: "kling-v1-6",
    image: imageBase64,
    prompt,
    negative_prompt: "模糊, 低质量, 抖动, 变形, 水印, 文字",
    cfg_scale: 0.5,
    mode: "std",
    duration: duration.toString(),
    aspect_ratio: "9:16",
  };

  const res = await fetch(`${API_BASE}/v1/videos/image2video`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Kling API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`Kling error: ${data.message}`);
  }

  return data.data.task_id as string;
}

// Poll task status and return result
export async function getTaskStatus(taskId: string): Promise<KlingTask> {
  const res = await fetch(
    `${API_BASE}/v1/videos/image2video/${taskId}`,
    { headers: authHeaders() }
  );

  if (!res.ok) {
    throw new Error(`Poll error ${res.status}`);
  }

  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`Kling poll error: ${data.message}`);
  }

  const task = data.data;
  const statusMap: Record<string, KlingTask["status"]> = {
    submitted: "pending",
    processing: "processing",
    succeed: "completed",
    failed: "failed",
  };

  const status = statusMap[task.task_status] ?? "pending";
  const videoUrl =
    status === "completed"
      ? task.task_result?.videos?.[0]?.url
      : undefined;

  return { taskId, status, videoUrl };
}
