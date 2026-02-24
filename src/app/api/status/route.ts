import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/store";
import path from "path";

const STATUS_MESSAGES: Record<string, string> = {
  uploading: "正在上传图片...",
  generating: "可灵 AI 正在生成做饭视频（约2-5分钟）...",
  processing: "正在添加背景音乐和字幕...",
  done: "视频生成完成！",
  error: "生成失败",
};

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  const job = getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Return relative download paths (not full filesystem paths)
  const downloads = job.outputs
    ? {
        tiktok: `/api/download?jobId=${jobId}&platform=tiktok`,
        youtube: `/api/download?jobId=${jobId}&platform=youtube`,
        xiaohongshu: `/api/download?jobId=${jobId}&platform=xiaohongshu`,
      }
    : undefined;

  return NextResponse.json({
    jobId,
    status: job.status,
    message: STATUS_MESSAGES[job.status] || job.status,
    dishName: job.dishName,
    downloads,
    error: job.error,
  });
}
