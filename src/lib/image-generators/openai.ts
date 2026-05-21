/**
 * OpenAI (gpt-image-2) 画像生成プロバイダ
 *
 * モデル: gpt-image-2（2026-04-21 リリース）
 * エンドポイント: api.openai.com/v1/images/generations
 * 認証: Header Authorization: Bearer <OPENAI_API_KEY>
 *
 * 注意点:
 * - gpt-image-2 は16:9に近いサイズとして 1536x1024 をサポートしている想定で組んでいる
 * - 日本語タイトル文字描画は GeminiよりOpenAI側がやや崩れやすい傾向があるが、
 *   gpt-image-2 ではテキスト精度が大幅に改善されているため withTitle:true でも実用レベル
 */

import OpenAI from "openai";
import { buildPrompt } from "./prompt";
import {
  ImageGenerator,
  ImageGenInput,
  ImageGenOutput,
  ImageGeneratorError,
} from "./types";

const OPENAI_MODEL = "gpt-image-2";
// 16:9 に最も近い公式サポートサイズ（gpt-image-2 想定）
// 万一サイズが拒否される場合は SDK の型エラーや 400 で返ってくるので調整可能にしておく
const OPENAI_SIZE = "1536x1024";
// 画質設定（"low" | "medium" | "high"）。コストと品質のバランスで high を既定にする
const OPENAI_QUALITY: "low" | "medium" | "high" = "high";

export const openaiGenerator: ImageGenerator = {
  name: "openai",

  async generate(input: ImageGenInput): Promise<ImageGenOutput> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ImageGeneratorError("OPENAI_API_KEY が設定されていません", 500);
    }

    const client = new OpenAI({ apiKey });
    const prompt = buildPrompt(input);

    let response;
    try {
      response = await client.images.generate({
        model: OPENAI_MODEL,
        prompt,
        // gpt-image-2 は b64_json で返るのが既定
        size: OPENAI_SIZE as unknown as never, // SDK型側がunionで限定的なため緩めるためのcast
        quality: OPENAI_QUALITY as unknown as never,
        n: 1,
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("OpenAI images.generate error:", message);
      // SDK のエラーオブジェクトに status が含まれる場合は伝える
      const status =
        typeof e === "object" && e !== null && "status" in e && typeof (e as { status: number }).status === "number"
          ? (e as { status: number }).status
          : 500;
      throw new ImageGeneratorError(`画像生成に失敗しました（OpenAI: ${message}）`, status);
    }

    const first = response.data?.[0];
    if (!first?.b64_json) {
      console.error("OpenAI response (no image):", JSON.stringify(response).slice(0, 500));
      throw new ImageGeneratorError("画像の生成に失敗しました。もう一度お試しください", 500);
    }

    return {
      imageBase64: first.b64_json,
      imageMimeType: "image/png",
    };
  },
};
