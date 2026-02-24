"use client";
import { useCallback, useState } from "react";
import Image from "next/image";

interface Props {
  onFile: (file: File, preview: string) => void;
}

export default function UploadZone({ onFile }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const url = URL.createObjectURL(file);
      setPreview(url);
      onFile(file, url);
    },
    [onFile]
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
      onClick={() => document.getElementById("fileInput")?.click()}
      className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all
        ${dragging ? "border-orange-400 bg-orange-50" : "border-gray-300 bg-gray-50 hover:border-orange-300 hover:bg-orange-50/50"}
        flex flex-col items-center justify-center overflow-hidden
        ${preview ? "h-72" : "h-56"}`}
    >
      <input
        id="fileInput"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {preview ? (
        <div className="relative w-full h-full">
          <Image src={preview} alt="preview" fill className="object-cover rounded-2xl" />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-2xl opacity-0 hover:opacity-100 transition-opacity">
            <p className="text-white font-medium">点击更换图片</p>
          </div>
        </div>
      ) : (
        <div className="text-center px-6">
          <div className="text-5xl mb-3">🍽️</div>
          <p className="text-gray-600 font-medium">拖拽或点击上传菜品图片</p>
          <p className="text-gray-400 text-sm mt-1">支持 JPG、PNG、WebP，最大 10MB</p>
        </div>
      )}
    </div>
  );
}
