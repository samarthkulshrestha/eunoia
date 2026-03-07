"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";

const INPUT_TYPES = [
  { value: "raw", label: "Interest" },
  { value: "book", label: "Book" },
  { value: "youtube", label: "YouTube" },
  { value: "music", label: "Music" },
  { value: "article", label: "Article" },
  { value: "pdf", label: "PDF" },
] as const;

export function InputPanel() {
  const { inputPanelOpen, toggleInputPanel, addInput, loading } = useStore();
  const [content, setContent] = useState("");
  const [type, setType] = useState<string>("raw");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || loading) return;
    await addInput(content.trim(), type);
    setContent("");
  };

  if (!inputPanelOpen) {
    return (
      <button
        onClick={toggleInputPanel}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
      >
        <span className="text-xl font-light">+</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 text-white">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-light tracking-widest uppercase opacity-60">
          Add to your universe
        </h3>
        <button
          onClick={toggleInputPanel}
          className="opacity-40 hover:opacity-100 transition-opacity"
        >
          &times;
        </button>
      </div>

      <div className="flex gap-1.5 mb-4 flex-wrap">
        {INPUT_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setType(t.value)}
            className={`px-3 py-1 rounded-full text-xs transition-colors ${
              type === t.value
                ? "bg-white/20 text-white"
                : "bg-white/5 text-white/40 hover:text-white/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            type === "raw"
              ? "Type an interest... (e.g., 'category theory')"
              : type === "book"
                ? "Book title and author..."
                : type === "youtube"
                  ? "YouTube video URL..."
                  : type === "music"
                    ? "Album or track name..."
                    : type === "article"
                      ? "Paste article text..."
                      : "Describe the PDF content..."
          }
          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-white/20 resize-none focus:outline-none focus:border-white/30 transition-colors"
          rows={3}
        />
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="mt-3 w-full py-2 rounded-xl bg-white/10 text-sm font-light tracking-wide hover:bg-white/20 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Thinking..." : "Add"}
        </button>
      </form>
    </div>
  );
}
