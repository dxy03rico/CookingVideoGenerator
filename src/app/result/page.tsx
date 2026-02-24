"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface StatusResponse {
  jobId: string;
  status: string;
  message: string;
  dishName: string;
  downloads?: {
    tiktok: string;
    youtube: string;
    xiaohongshu: string;
  };
  error?: string;
}

const PLATFORM_INFO = [
  {
    key: "tiktok" as const,
    label: "TikTok",
    icon: "🎵",
    desc: "9:16 竖屏 · 已优化节奏",
    color: "from-black to-gray-800",
  },
  {
    key: "youtube" as const,
    label: "YouTube",
    icon: "▶️",
    desc: "16:9 横屏 · 适合长视频",
    color: "from-red-600 to-red-700",
  },
  {
    key: "xiaohongshu" as const,
    label: "小红书",
    icon: "📕",
    desc: "9:16 竖屏 · 大字幕",
    color: "from-red-500 to-pink-600",
  },
];

const COOKING_TIPS = [
  "🔪 切菜前先磨刀，效率翻倍",
  "🧂 盐要最后放，锁住食材水分",
  "🔥 大火爆香，小火慢炖是诀窍",
  "🫒 好的食用油是美食的灵魂",
  "🥚 鸡蛋打散前加一小勺料酒去腥",
  "🍳 热锅冷油，食材不易粘锅",
  "🌿 新鲜香料比干燥的香味强三倍",
  "🫙 隔夜的炖汤味道更醇厚",
  "🥩 肉类提前腌制 30 分钟更入味",
  "🫕 翻炒时加少许热水，保持锅气",
];

// 动态"正在处理"步骤描述
const STATUS_LABELS: Record<string, { icon: string; label: string; detail: string }> = {
  uploading:  { icon: "📤", label: "上传图片",      detail: "正在把你的菜品图片发送给 AI…" },
  generating: { icon: "🤖", label: "AI 生成视频",   detail: "可灵 AI 正在用图片生成做饭视频，通常需要 2-5 分钟" },
  processing: { icon: "🎵", label: "添加音乐字幕",  detail: "正在混音、调色、封装三个平台版本…" },
};

// 格式化秒数为 mm:ss
function formatTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function ResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const jobId = searchParams.get("jobId");

  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [elapsed, setElapsed] = useState(0);          // seconds since page load
  const [tipIdx, setTipIdx] = useState(0);            // rotating cooking tip
  const [dots, setDots] = useState(".");              // animated dots

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const tipRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const dotsRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll status
  useEffect(() => {
    if (!jobId) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/status?jobId=${jobId}`);
        const data: StatusResponse = await res.json();
        setStatus(data);
        if (data.status === "done" || data.status === "error") {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      } catch (e) {
        console.error("Poll error:", e);
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 4000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [jobId]);

  // Elapsed time counter
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Rotating cooking tips every 6 seconds
  useEffect(() => {
    const start = Math.floor(Math.random() * COOKING_TIPS.length);
    setTipIdx(start);
    tipRef.current = setInterval(() => setTipIdx(i => (i + 1) % COOKING_TIPS.length), 6000);
    return () => { if (tipRef.current) clearInterval(tipRef.current); };
  }, []);

  // Animated dots
  useEffect(() => {
    dotsRef.current = setInterval(() =>
      setDots(d => d.length >= 3 ? "." : d + "."), 500);
    return () => { if (dotsRef.current) clearInterval(dotsRef.current); };
  }, []);

  if (!jobId) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p>没有找到任务 ID</p>
        <button onClick={() => router.push("/")} className="mt-4 text-orange-500 underline">
          返回首页
        </button>
      </div>
    );
  }

  // ── 已完成 ────────────────────────────────────────────────────────────────
  if (status?.status === "done" && status.downloads) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10 space-y-4">
        <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
          <div className="text-5xl mb-2">🎉</div>
          <h2 className="text-xl font-bold text-gray-800">「{status.dishName}」视频已生成！</h2>
          <p className="text-gray-400 text-sm mt-1">共耗时 {formatTime(elapsed)} · 选择平台下载</p>
        </div>

        {PLATFORM_INFO.map((p) => (
          <a
            key={p.key}
            href={status.downloads![p.key]}
            download
            className={`flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-r ${p.color} text-white shadow-lg hover:shadow-xl transition-all active:scale-95`}
          >
            <div className="text-3xl">{p.icon}</div>
            <div className="flex-1">
              <div className="font-bold text-lg">{p.label} 版本</div>
              <div className="text-white/70 text-sm">{p.desc}</div>
            </div>
            <div className="text-2xl">⬇️</div>
          </a>
        ))}

        <button
          onClick={() => router.push("/")}
          className="w-full py-3 rounded-xl border-2 border-orange-300 text-orange-600 font-semibold hover:bg-orange-50 transition-all"
        >
          ← 再生成一个
        </button>
      </div>
    );
  }

  // ── 失败 ──────────────────────────────────────────────────────────────────
  if (status?.status === "error") {
    return (
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">生成失败</h2>
          <p className="text-gray-500 text-sm mb-6 font-mono break-all">{status.error || "未知错误"}</p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600"
          >
            重新尝试
          </button>
        </div>
      </div>
    );
  }

  // ── 等待中（包含初始连接中状态）────────────────────────────────────────────
  const currentStep = status ? (STATUS_LABELS[status.status] ?? STATUS_LABELS.generating) : null;

  return (
    <div className="max-w-lg mx-auto px-4 py-10 space-y-4">

      {/* 主状态卡片 */}
      <div className="bg-white rounded-2xl shadow-lg p-8">
        {/* 旋转动画圆圈 */}
        <div className="flex justify-center mb-6">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-orange-100" />
            <div className="absolute inset-0 rounded-full border-4 border-orange-400 border-t-transparent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-3xl">
              {currentStep?.icon ?? "⏳"}
            </div>
          </div>
        </div>

        {/* 当前步骤 */}
        <h2 className="text-xl font-bold text-gray-800 text-center mb-1">
          {currentStep ? currentStep.label : "连接中"}{dots}
        </h2>
        <p className="text-gray-500 text-sm text-center mb-6">
          {currentStep ? currentStep.detail : "正在连接服务器，请稍候…"}
        </p>

        {/* 步骤进度条 */}
        <div className="flex items-center gap-1 mb-6">
          {["uploading", "generating", "processing"].map((step, idx) => {
            const steps = ["uploading", "generating", "processing"];
            const curIdx = status ? steps.indexOf(status.status) : -1;
            const done = idx < curIdx;
            const active = idx === curIdx;
            return (
              <div key={step} className="flex-1 flex flex-col items-center gap-1">
                <div className={`h-2 w-full rounded-full transition-all duration-500
                  ${done ? "bg-orange-400" : active ? "bg-orange-300 animate-pulse" : "bg-gray-100"}`} />
              </div>
            );
          })}
        </div>

        {/* 计时器 */}
        <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
          <span className="font-mono text-lg font-semibold text-orange-500">{formatTime(elapsed)}</span>
          <span>已等待</span>
          {status?.status === "generating" && (
            <span className="text-gray-300">· 预计 2-5 分钟</span>
          )}
        </div>
      </div>

      {/* 美食小知识卡片 */}
      <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex gap-3 items-start">
        <div className="text-2xl">💡</div>
        <div>
          <p className="text-xs text-orange-400 font-semibold mb-1">等待时间的美食小知识</p>
          <p className="text-gray-600 text-sm transition-all">{COOKING_TIPS[tipIdx]}</p>
        </div>
      </div>

      {/* 安心提示 */}
      <p className="text-center text-xs text-gray-400">
        页面正在持续与服务器同步，无需刷新 · 请勿关闭此页面
      </p>
    </div>
  );
}

export default function ResultPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-yellow-50">
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">加载中…</p>
          </div>
        </div>
      }>
        <ResultContent />
      </Suspense>
    </main>
  );
}
