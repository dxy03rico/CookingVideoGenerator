"use client";

interface Props {
  status: string;
  message: string;
  dishName: string;
}

const STATUS_STEPS = [
  { key: "uploading",   label: "上传图片",   icon: "📤" },
  { key: "generating",  label: "AI 生成视频", icon: "🤖" },
  { key: "processing",  label: "添加音乐字幕", icon: "🎵" },
  { key: "done",        label: "完成！",      icon: "✅" },
];

export default function ProgressCard({ status, message, dishName }: Props) {
  const currentIdx = STATUS_STEPS.findIndex((s) => s.key === status);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
      <div className="text-4xl mb-4">
        {status === "error" ? "❌" : STATUS_STEPS[Math.max(currentIdx, 0)]?.icon}
      </div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">
        正在为「{dishName}」生成视频
      </h2>
      <p className="text-gray-500 mb-8">{message}</p>

      {/* Step indicators */}
      <div className="flex justify-between items-center gap-2">
        {STATUS_STEPS.map((step, idx) => {
          const done = idx < currentIdx || status === "done";
          const active = idx === currentIdx && status !== "done";
          return (
            <div key={step.key} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all
                  ${done ? "bg-orange-500 text-white" : active ? "bg-orange-100 ring-2 ring-orange-400 animate-pulse" : "bg-gray-100 text-gray-400"}`}
              >
                {step.icon}
              </div>
              <span className={`text-xs font-medium ${done || active ? "text-orange-600" : "text-gray-400"}`}>
                {step.label}
              </span>
              {idx < STATUS_STEPS.length - 1 && (
                <div className={`absolute mt-5 ml-16 h-0.5 w-full ${done ? "bg-orange-400" : "bg-gray-200"}`} />
              )}
            </div>
          );
        })}
      </div>

      {status === "generating" && (
        <p className="text-xs text-gray-400 mt-6">
          可灵 AI 生成中，通常需要 2-5 分钟，请耐心等待 ☕
        </p>
      )}
    </div>
  );
}
