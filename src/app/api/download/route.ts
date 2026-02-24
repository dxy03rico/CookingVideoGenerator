import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/store";
import { readFile } from "fs/promises";
import path from "path";

const PLATFORM_LABELS: Record<string, string> = {
  tiktok: "TikTok",
  youtube: "YouTube",
  xiaohongshu: "小红书",
};

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId");
  const platform = req.nextUrl.searchParams.get("platform") as
    | "tiktok"
    | "youtube"
    | "xiaohongshu"
    | null;

  if (!jobId || !platform) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const job = getJob(jobId);
  if (!job || !job.outputs) {
    return NextResponse.json({ error: "Job not ready" }, { status: 404 });
  }

  const filePath = job.outputs[platform];
  if (!filePath) {
    return NextResponse.json({ error: "Platform not found" }, { status: 404 });
  }

  try {
    const buffer = await readFile(filePath);
    const filename = `${job.dishName}_${PLATFORM_LABELS[platform]}.mp4`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
