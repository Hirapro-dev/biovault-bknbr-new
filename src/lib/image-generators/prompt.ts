/**
 * プロンプト生成ユーティリティ
 *
 * Gemini と OpenAI (gpt-image-2) はプロンプトの解釈クセが異なるため、
 * 基本構造は共通化しつつプロバイダ別に微調整できるようにしている。
 */

import type { ImageGenInput, ImageStyleKey, TextAlign } from "./types";

// スタイル定義（プロンプトに反映される英語指示）
export const IMAGE_STYLE_PROMPTS: Record<ImageStyleKey, { label: string; prompt: string }> = {
  realistic: {
    label: "リアル",
    prompt:
      "photorealistic, ultra high quality photograph, professional photography, cinematic lighting, 8K resolution",
  },
  illustration: {
    label: "イラスト",
    prompt:
      "high quality digital illustration, clean vector art style, modern flat design with depth, vibrant colors",
  },
  anime: {
    label: "アニメ風",
    prompt:
      "anime art style, Japanese animation aesthetic, vivid colors, detailed anime illustration, studio quality",
  },
  watercolor: {
    label: "水彩画",
    prompt:
      "watercolor painting style, soft blending, artistic brush strokes, elegant watercolor illustration, fine art quality",
  },
  minimal: {
    label: "ミニマル",
    prompt:
      "minimalist design, clean simple composition, geometric shapes, limited color palette, modern minimal art",
  },
  cyberpunk: {
    label: "サイバーパンク",
    prompt:
      "cyberpunk aesthetic, neon lights, futuristic cityscape, dark background with glowing elements, sci-fi atmosphere",
  },
};

// テキスト配置の指示（日本語）
const ALIGN_PROMPTS: Record<TextAlign, string> = {
  left: "タイトル文字は画像の左寄せで、垂直方向は中央に配置。左側に余白を少し取り、テキストは左揃えにする",
  center: "タイトル文字は画像の水平・垂直ともに中央に配置。テキストは中央揃えにする",
  right: "タイトル文字は画像の右寄せで、垂直方向は中央に配置。右側に余白を少し取り、テキストは右揃えにする",
};

/**
 * プロンプトを組み立てる（プロバイダ共通の本体）
 *
 * プロバイダ別の言い回し違いは、呼び出し側で必要なら入れ替える。
 * 現状は両プロバイダとも同じ文面で十分機能する想定。
 */
export function buildPrompt(input: ImageGenInput): string {
  const styleInfo = IMAGE_STYLE_PROMPTS[input.styleKey] || IMAGE_STYLE_PROMPTS.realistic;
  const alignPrompt = ALIGN_PROMPTS[input.textAlign] || ALIGN_PROMPTS.center;
  const themeText = input.plainContent || input.title;
  const adjustLine = input.adjustPrompt ? `\n【追加の指示】${input.adjustPrompt}` : "";

  if (input.withTitle) {
    // タイトル文字あり：従来のプロンプト
    return `投資ブログのサムネイル画像を1枚生成してください。

【画像に入れるタイトル文字】
「${input.title}」

【記事の内容テーマ】
${themeText}${adjustLine}

【画像スタイル】${styleInfo.prompt}

【デザイン指示】
- 横長の16:9アスペクト比で生成
- ${alignPrompt}
- タイトル文字は大きく太い白文字で配置
- タイトル文字は読みやすさ最優先。${
      input.overlay
        ? "文字の後ろに半透明の暗いオーバーレイ帯（黒の40〜60%透過）を敷いて視認性を確保する"
        : "オーバーレイは使わず、文字に太い影やアウトラインをつけて視認性を確保する。背景画像はそのまま見せる"
    }
- フォントサイズは画像幅の1/12〜1/10程度の大きさ（非常に大きく目立つように）
- 背景は記事テーマに合ったイメージ画像
- ブログのサムネイルとして魅力的でクリックしたくなるデザインにする
- ブランドロゴやサイト名は入れないでください`;
  }

  // タイトル文字なし：ビジュアル専用
  return `投資ブログのサムネイル画像を1枚生成してください。

【記事の内容テーマ】
${themeText}${adjustLine}

【画像スタイル】${styleInfo.prompt}

【デザイン指示】
- 横長の16:9アスペクト比で生成
- 文字・テキスト・タイポグラフィは画像内に一切入れない（タイトル・キャプション・ロゴ・透かし・記号類を含めない）
- ビジュアルのみで記事テーマを表現する
- 背景は記事テーマに合ったイメージ画像
- ブログのサムネイルとして魅力的でクリックしたくなるデザインにする
- ブランドロゴやサイト名は入れないでください`;
}
