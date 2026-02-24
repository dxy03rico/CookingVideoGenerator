import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";

// Use Homebrew ffmpeg
ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH || "/opt/homebrew/bin/ffmpeg");
ffmpeg.setFfprobePath(process.env.FFPROBE_PATH || "/opt/homebrew/bin/ffprobe");

const OUTPUT_DIR = path.join(process.cwd(), "output");

export interface ProcessVideoParams {
  rawVideoPath: string; // downloaded Kling video
  dishName: string;
  musicTrack: string; // filename from public/music/
  jobId: string;
}

export interface ProcessedResult {
  tiktok: string; // 9:16, 60s max
  youtube: string; // 16:9
  xiaohongshu: string; // 9:16, square-safe
}

// Ensure output dir exists
function ensureOutputDir(jobId: string): string {
  const dir = path.join(OUTPUT_DIR, jobId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Wrap ffmpeg in a Promise
function runFfmpeg(cmd: ffmpeg.FfmpegCommand): Promise<void> {
  return new Promise((resolve, reject) => {
    cmd
      .on("end", () => resolve())
      .on("error", (err: Error) => reject(err))
      .run();
  });
}

// Get video duration in seconds
export function getVideoDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, meta) => {
      if (err) return reject(err);
      resolve(meta.format.duration ?? 0);
    });
  });
}

// Scale video to target aspect ratio + mix background music
// Note: drawtext removed (requires libfreetype, not in this ffmpeg build)
async function buildVersion(
  rawVideo: string,
  _dishName: string,
  musicPath: string,
  outPath: string,
  ratio: "9:16" | "16:9"
): Promise<void> {
  const [w, h] = ratio === "9:16" ? [1080, 1920] : [1920, 1080];

  // Scale + letterbox/pillarbox to target resolution
  const videoFilter = `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black`;

  await runFfmpeg(
    ffmpeg()
      .input(rawVideo)
      .input(musicPath)
      .videoFilter(videoFilter)
      .outputOptions([
        "-map 0:v",       // video from raw clip
        "-map 1:a",       // audio from music track
        "-c:v libx264",
        "-preset fast",
        "-crf 23",
        "-c:a aac",
        "-b:a 128k",
        "-af", "volume=0.4", // music at 40% volume
        "-shortest",      // end when shortest stream ends
        "-movflags +faststart",
        "-y",
      ])
      .output(outPath)
  );
}

export async function processVideo(
  params: ProcessVideoParams
): Promise<ProcessedResult> {
  const { rawVideoPath, dishName, musicTrack, jobId } = params;
  const dir = ensureOutputDir(jobId);
  const musicPath = path.join(process.cwd(), "public", "music", musicTrack);

  const tiktokOut = path.join(dir, "tiktok_9x16.mp4");
  const youtubeOut = path.join(dir, "youtube_16x9.mp4");
  const xhsOut = path.join(dir, "xiaohongshu_9x16.mp4");

  // TikTok & 小红书 are both 9:16 — generate once, copy for xhs
  await buildVersion(rawVideoPath, dishName, musicPath, tiktokOut, "9:16");
  fs.copyFileSync(tiktokOut, xhsOut);

  // YouTube 16:9
  await buildVersion(rawVideoPath, dishName, musicPath, youtubeOut, "16:9");

  return {
    tiktok: tiktokOut,
    youtube: youtubeOut,
    xiaohongshu: xhsOut,
  };
}
