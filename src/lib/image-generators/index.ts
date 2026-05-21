/**
 * 画像生成プロバイダのエクスポート + 切り替え用ファクトリ
 */

import { geminiGenerator } from "./gemini";
import { openaiGenerator } from "./openai";
import type { ImageGenerator, ImageProvider } from "./types";

export * from "./types";
export { IMAGE_STYLE_PROMPTS } from "./prompt";

/**
 * 指定された provider に対応するジェネレータを返す。
 * 不明な値が来た場合は Gemini にフォールバック。
 */
export function getImageGenerator(provider: ImageProvider | string | undefined): ImageGenerator {
  switch (provider) {
    case "openai":
      return openaiGenerator;
    case "gemini":
    default:
      return geminiGenerator;
  }
}

// 画面に出す選択肢（ラベル付き）
export const IMAGE_PROVIDERS: { key: ImageProvider; label: string; description: string }[] = [
  {
    key: "gemini",
    label: "Gemini (Nano Banana Pro)",
    description: "日本語タイトル文字に強い・繊細な構図",
  },
  {
    key: "openai",
    label: "OpenAI (gpt-image-2)",
    description: "テキスト精度が高い・新しい思考モード",
  },
];
