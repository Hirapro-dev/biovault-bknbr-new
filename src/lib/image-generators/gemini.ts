/**
 * Gemini (Nano Banana Pro) 画像生成プロバイダ
 *
 * モデル: gemini-3-pro-image-preview
 * エンドポイント: generativelanguage.googleapis.com
 * 認証: URL クエリ ?key=<GEMINI_API_KEY>
 */

import { buildPrompt } from "./prompt";
import {
  ImageGenerator,
  ImageGenInput,
  ImageGenOutput,
  ImageGeneratorError,
} from "./types";

const GEMINI_MODEL = "gemini-3-pro-image-preview";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export const geminiGenerator: ImageGenerator = {
  name: "gemini",

  async generate(input: ImageGenInput): Promise<ImageGenOutput> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ImageGeneratorError("GEMINI_API_KEY が設定されていません", 500);
    }

    const prompt = buildPrompt(input);
    const url = `${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          // TEXT も含めることで Gemini が画像生成モードで動作する
          responseModalities: ["TEXT", "IMAGE"],
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Gemini API error:", errText);
      throw new ImageGeneratorError(`画像生成に失敗しました（${res.status}）`, 500);
    }

    const data = await res.json();

    // レスポンスから inlineData を探索
    let imageBase64 = "";
    let imageMimeType = "image/png";
    const candidates = data.candidates || [];
    for (const candidate of candidates) {
      const parts = candidate.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData) {
          imageBase64 = part.inlineData.data;
          imageMimeType = part.inlineData.mimeType || "image/png";
          break;
        }
      }
      if (imageBase64) break;
    }

    if (!imageBase64) {
      console.error("Gemini response (no image):", JSON.stringify(data).slice(0, 500));
      throw new ImageGeneratorError("画像の生成に失敗しました。もう一度お試しください", 500);
    }

    return { imageBase64, imageMimeType };
  },
};
