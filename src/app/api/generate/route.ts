import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { createJob, updateJob } from "@/lib/store";
import { createVideoTask, getTaskStatus } from "@/lib/fal";
import { processVideo } from "@/lib/ffmpeg";
import fs from "fs";

const UPLOAD_DIR = path.join(process.cwd(), "output", "uploads");

// Download a URL to a local file
async function downloadFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buffer);
}

// Poll fal.ai until done（最多 15 分钟，每 8 秒一次）
async function pollUntilDone(taskId: string): Promise<string> {
  const maxAttempts = 112; // 112 × 8s ≈ 15 min
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 8000)); // 8 秒间隔，减少请求频率
    const task = await getTaskStatus(taskId);
    if (task.status === "completed" && task.videoUrl) {
      return task.videoUrl;
    }
    if (task.status === "failed") {
      throw new Error(`视频生成失败: ${task.error}`);
    }
  }
  throw new Error("视频生成超时（超过 15 分钟），请重试");
}

export async function POST(req: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    const dishName = (formData.get("dishName") as string) || "美味佳肴";
    const style = (formData.get("style") as string) || "温馨家常";
    const musicTrack = (formData.get("music") as string) || "gentle_bgm.mp3";
    const duration = parseInt((formData.get("duration") as string) || "5") as 5 | 10;
    const customPrompt = (formData.get("prompt") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "No image uploaded" }, { status: 400 });
    }

    // Save uploaded image
    const jobId = uuidv4();
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const ext = file.name.split(".").pop() || "jpg";
    const imagePath = path.join(UPLOAD_DIR, `${jobId}.${ext}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(imagePath, buffer);

    // Create job
    createJob(jobId, dishName, imagePath);

    // Run pipeline in background (non-blocking response)
    runPipeline(jobId, imagePath, dishName, style as any, duration, musicTrack, customPrompt);

    return NextResponse.json({ jobId });
  } catch (err) {
    console.error("Generate error:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

// Background pipeline — does NOT block the HTTP response
async function runPipeline(
  jobId: string,
  imagePath: string,
  dishName: string,
  style: "快手炒菜" | "精品慢镜" | "温馨家常",
  duration: 5 | 10,
  musicTrack: string,
  customPrompt: string = ""
) {
  try {
    // Step 1: Submit to fal.ai
    updateJob(jobId, { status: "generating" });
    const taskId = await createVideoTask({ imagePath, dishName, style, duration, customPrompt });
    updateJob(jobId, { klingTaskId: taskId }); // field reused for any provider task ID

    // Step 2: Poll until done
    const videoUrl = await pollUntilDone(taskId);

    // Step 3: Download raw video
    const rawVideoPath = path.join(process.cwd(), "output", "uploads", `${jobId}_raw.mp4`);
    await downloadFile(videoUrl, rawVideoPath);
    updateJob(jobId, { rawVideoPath, status: "processing" });

    // Step 4: FFmpeg post-process
    const outputs = await processVideo({ rawVideoPath, dishName, musicTrack, jobId });
    updateJob(jobId, { status: "done", outputs });
  } catch (err) {
    console.error(`Pipeline error for job ${jobId}:`, err);
    updateJob(jobId, { status: "error", error: (err as Error).message });
  }
}
