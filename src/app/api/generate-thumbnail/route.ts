/**
 * サムネイル画像生成 API
 *
 * - GET: スタイル一覧 + プロバイダ一覧を返す
 * - POST: 指定 provider で画像生成
 *
 * 画像生成プロバイダの詳細は src/lib/image-generators/ を参照
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  getImageGenerator,
  IMAGE_PROVIDERS,
  IMAGE_STYLE_PROMPTS,
  ImageGeneratorError,
  type ImageProvider,
  type ImageStyleKey,
  type TextAlign,
} from "@/lib/image-generators";

export async function GET() {
  // スタイル一覧（既存互換）+ プロバイダ一覧を返す
  const styles = (Object.entries(IMAGE_STYLE_PROMPTS) as [ImageStyleKey, { label: string }][]).map(
    ([key, val]) => ({ key, label: val.label })
  );
  return NextResponse.json({ styles, providers: IMAGE_PROVIDERS });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "未認証" }, { status: 401 });

  try {
    const body = await request.json();
    const {
      title,
      content,
      style,
      adjustPrompt,
      textAlign,
      overlay,
      includeTitle,
      provider,
    }: {
      title?: string;
      content?: string;
      style?: string;
      adjustPrompt?: string;
      textAlign?: string;
      overlay?: boolean;
      includeTitle?: boolean;
      provider?: string;
    } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "タイトルを入力してください" }, { status: 400 });
    }

    // プロバイダ選択（既定: gemini）
    const providerKey: ImageProvider = provider === "openai" ? "openai" : "gemini";
    const generator = getImageGenerator(providerKey);

    // スタイル正規化
    const styleKey = (IMAGE_STYLE_PROMPTS[style as ImageStyleKey] ? style : "realistic") as ImageStyleKey;
    const styleInfo = IMAGE_STYLE_PROMPTS[styleKey];

    // 記事本文からHTMLタグを除去して要約用テキストを取得（最大300文字）
    const plainContent = (content || "")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 300);

    // テキスト配置の正規化
    const alignKey: TextAlign =
      textAlign === "left" || textAlign === "right" ? textAlign : "center";

    // 画像生成プロバイダを呼び出し
    const result = await generator.generate({
      title: title.trim(),
      plainContent,
      styleKey,
      adjustPrompt: adjustPrompt?.trim() || undefined,
      withTitle: includeTitle !== false,
      textAlign: alignKey,
      overlay: overlay !== false,
    });

    return NextResponse.json({
      imageBase64: result.imageBase64,
      imageMimeType: result.imageMimeType,
      style: styleKey,
      styleLabel: styleInfo.label,
      provider: providerKey,
    });
  } catch (e: unknown) {
    if (e instanceof ImageGeneratorError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("generate-thumbnail error:", e);
    return NextResponse.json({ error: "サムネイル生成中にエラーが発生しました" }, { status: 500 });
  }
}
