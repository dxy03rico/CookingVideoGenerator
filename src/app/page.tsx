"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import UploadZone from "@/components/UploadZone";

const MUSIC_OPTIONS = [
  { value: "gentle_bgm.mp3",   label: "🎶 温柔轻音乐", desc: "适合家常菜、温馨风格" },
  { value: "upbeat_bgm.mp3",   label: "⚡ 活泼节奏",   desc: "适合快炒、街头小吃" },
  { value: "elegant_bgm.mp3",  label: "✨ 精致优雅",   desc: "适合精品料理、摆盘" },
];

const STYLE_OPTIONS = [
  { value: "温馨家常", label: "🏠 温馨家常", desc: "自然光，真实质感" },
  { value: "快手炒菜", label: "🔥 快手炒菜", desc: "节奏感强，油烟升腾" },
  { value: "精品慢镜", label: "🎬 精品慢镜", desc: "慢镜唯美，精致摆盘" },
];

export default function HomePage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [dishName, setDishName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("温馨家常");
  const [music, setMusic] = useState("gentle_bgm.mp3");
  const [duration, setDuration] = useState<5 | 10>(5);
  const [showPrompt, setShowPrompt] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = useCallback((f: File) => setFile(f), []);

  const handleGenerate = async () => {
    if (!file) { setError("请先上传菜品图片"); return; }
    if (!dishName.trim()) { setError("请输入菜品名称"); return; }
    setError("");
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("dishName", dishName.trim());
      fd.append("style", style);
      fd.append("music", music);
      fd.append("duration", duration.toString());
      if (prompt.trim()) fd.append("prompt", prompt.trim());

      const res = await fetch("/api/generate", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "生成失败");
      router.push(`/result?jobId=${data.jobId}`);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-yellow-50">
      <div className="max-w-lg mx-auto px-4 py-10">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-2">🍳</div>
          <h1 className="text-3xl font-bold text-gray-800">美食视频生成器</h1>
          <p className="text-gray-500 mt-2">上传菜品图片，AI 自动生成做饭短视频</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📸 上传菜品成品图
            </label>
            <UploadZone onFile={handleFile} />
          </div>

          {/* Dish Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🥢 菜品名称
            </label>
            <input
              type="text"
              value={dishName}
              onChange={(e) => setDishName(e.target.value)}
              placeholder="例如：红烧肉、番茄炒蛋、麻婆豆腐..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-300 placeholder:text-gray-400"
            />
          </div>

          {/* Style */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🎨 视频风格
            </label>
            <div className="grid grid-cols-3 gap-2">
              {STYLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStyle(opt.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-all
                    ${style === opt.value ? "border-orange-400 bg-orange-50" : "border-gray-100 hover:border-orange-200"}`}
                >
                  <div className="font-medium text-sm text-gray-800">{opt.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Prompt */}
          <div>
            <button
              type="button"
              onClick={() => setShowPrompt(v => !v)}
              className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2 w-full text-left"
            >
              ✍️ 自定义提示词（可选）
              <span className="ml-auto text-gray-400 text-xs">
                {showPrompt ? "▲ 收起" : "▼ 展开"}
              </span>
            </button>

            {showPrompt && (
              <div className="space-y-2">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={`留空则自动生成。例如：\n展示厨师手法精湛地翻炒番茄炒蛋，大火爆炒，锅气十足，最终装盘色泽鲜亮...`}
                  rows={4}
                  maxLength={500}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 placeholder:text-gray-400 resize-none"
                />
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-400">
                    💡 描述想要的画面、动作、氛围，越具体效果越好
                  </p>
                  <span className="text-xs text-gray-400">{prompt.length}/500</span>
                </div>
                {prompt.trim() && (
                  <button
                    type="button"
                    onClick={() => setPrompt("")}
                    className="text-xs text-orange-400 hover:text-orange-600"
                  >
                    × 清空，改用自动生成
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Music */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🎵 背景音乐
            </label>
            <div className="space-y-2">
              {MUSIC_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setMusic(opt.value)}
                  className={`w-full p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3
                    ${music === opt.value ? "border-orange-400 bg-orange-50" : "border-gray-100 hover:border-orange-200"}`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0
                    ${music === opt.value ? "border-orange-400" : "border-gray-300"}`}>
                    {music === opt.value && <div className="w-2 h-2 rounded-full bg-orange-400" />}
                  </div>
                  <div>
                    <div className="font-medium text-sm text-gray-800">{opt.label}</div>
                    <div className="text-xs text-gray-400">{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              ⏱️ 视频时长
            </label>
            <div className="grid grid-cols-2 gap-2">
              {([5, 10] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`p-3 rounded-xl border-2 text-center transition-all
                    ${duration === d ? "border-orange-400 bg-orange-50" : "border-gray-100 hover:border-orange-200"}`}
                >
                  <div className="font-semibold text-gray-800">{d} 秒</div>
                  <div className="text-xs text-gray-400">{d === 5 ? "适合 TikTok / 小红书" : "适合 YouTube Shorts"}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading || !file}
            className={`w-full py-4 rounded-xl font-bold text-white text-lg transition-all
              ${loading || !file
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg hover:shadow-xl active:scale-95"}`}
          >
            {loading ? "提交中..." : "🚀 生成视频"}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          视频由可灵 AI 生成，约需 2-5 分钟 · 支持 TikTok / YouTube / 小红书导出
        </p>
      </div>
    </main>
  );
}
