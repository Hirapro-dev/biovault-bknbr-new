/**
 * 画像生成プロバイダの共通型定義
 *
 * Gemini (Nano Banana Pro) と OpenAI (gpt-image-2) を統一インターフェースで扱う。
 */

// サポートするプロバイダ
export type ImageProvider = "gemini" | "openai";

// 画像スタイル種別（サムネ生成側で使う既存キー）
export type ImageStyleKey =
  | "realistic"
  | "illustration"
  | "anime"
  | "watercolor"
  | "minimal"
  | "cyberpunk";

// テキスト配置（タイトル文字あり時のみ意味を持つ）
export type TextAlign = "left" | "center" | "right";

// 画像生成プロバイダへの入力
export type ImageGenInput = {
  // 記事タイトル（withTitle=true の場合に画像内に埋め込む）
  title: string;
  // 記事本文の要約用プレーンテキスト（HTML除去済み、最大300文字程度）
  plainContent: string;
  // 選択されたスタイル（プロンプトに反映）
  styleKey: ImageStyleKey;
  // 追加プロンプト（ユーザーが任意入力）
  adjustPrompt?: string;
  // タイトル文字を画像に入れるか
  withTitle: boolean;
  // タイトル文字配置（withTitle=true 時のみ使用）
  textAlign: TextAlign;
  // 透過オーバーレイ使用フラグ（withTitle=true 時のみ使用）
  overlay: boolean;
};

// 画像生成プロバイダの出力
export type ImageGenOutput = {
  // Base64エンコードされた画像データ（PNG想定）
  imageBase64: string;
  // MIMEタイプ（"image/png" 等）
  imageMimeType: string;
};

// プロバイダが必要なエラーを表す
export class ImageGeneratorError extends Error {
  public status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "ImageGeneratorError";
    this.status = status;
  }
}

// 各プロバイダ実装が満たすインターフェース
export interface ImageGenerator {
  // プロバイダ名（ログ・エラー用）
  readonly name: string;
  // 画像生成を実行
  generate(input: ImageGenInput): Promise<ImageGenOutput>;
}
