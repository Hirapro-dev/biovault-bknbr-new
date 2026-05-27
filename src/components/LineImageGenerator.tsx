"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FiSmartphone, FiDownload, FiChevronDown, FiCamera, FiEdit3,
  FiCode, FiAlignLeft, FiAlignCenter, FiAlignRight, FiSave, FiBookmark,
} from "react-icons/fi";
import { extractPlainText } from "@/lib/extract-plain-text";
import {
  generateLineImage,
  DEFAULT_STYLES,
  BTN_GRADIENT_PRESETS,
  type LineImageStyles,
  type TextAlign,
} from "@/lib/line-image-canvas";

type LineImageGeneratorProps = {
  title: string;
  content: string;
  writerName: string;
  writerAvatarUrl: string | null;
  eyecatchUrl: string | null;
};

type EditorTab = "edit" | "code";

type SavedTemplate = {
  id: number;
  name: string;
  styles: string;
  isDefault: boolean;
};

/** 画像URLをDataURLに変換（CORS対策） */
async function toDataUrl(url: string): Promise<string> {
  if (!url) return "";
  try {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      const res = await fetch(`/api/image-proxy?url=${encodeURIComponent(url)}`);
      if (!res.ok) return "";
      const data = await res.json();
      return data.dataUrl || "";
    }
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

/** スタイルのJSON文字列 */
function stylesToCode(s: LineImageStyles): string {
  return JSON.stringify(s, null, 2);
}

/** JSON文字列からスタイルをパース */
function codeToStyles(code: string): LineImageStyles | null {
  try {
    const parsed = JSON.parse(code);
    if (typeof parsed.titleFontSize !== "number") return null;
    return { ...DEFAULT_STYLES, ...parsed };
  } catch {
    return null;
  }
}

/** 数値スライダー */
function NumInput({ label, value, onChange, min, max, step = 1 }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-slate-500 w-20 shrink-0">{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-1 accent-blue-500"
      />
      <input
        type="number" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-14 text-xs text-center border border-slate-200 rounded px-1 py-0.5"
      />
    </div>
  );
}

/** カラー入力 */
function ColorInput({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-slate-500 w-20 shrink-0">{label}</span>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-7 h-7 border border-slate-200 rounded cursor-pointer" />
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-20 text-xs border border-slate-200 rounded px-2 py-0.5" />
    </div>
  );
}

/** テキスト揃えボタン */
function AlignButtons({ value, onChange }: { value: TextAlign; onChange: (v: TextAlign) => void }) {
  const opts: { val: TextAlign; icon: React.ReactNode }[] = [
    { val: "left", icon: <FiAlignLeft size={13} /> },
    { val: "center", icon: <FiAlignCenter size={13} /> },
    { val: "right", icon: <FiAlignRight size={13} /> },
  ];
  return (
    <div className="flex gap-0.5">
      {opts.map((o) => (
        <button key={o.val} type="button" onClick={() => onChange(o.val)}
          className={`p-1.5 rounded ${value === o.val ? "bg-blue-100 text-blue-600" : "text-slate-400 hover:bg-slate-100"}`}>
          {o.icon}
        </button>
      ))}
    </div>
  );
}

export default function LineImageGenerator({
  title,
  content,
  writerName,
  writerAvatarUrl,
  eyecatchUrl,
}: LineImageGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<EditorTab>("edit");

  // 編集フィールド
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editWriter, setEditWriter] = useState("");
  const [initialized, setInitialized] = useState(false);

  // スタイル設定
  const [styles, setStyles] = useState<LineImageStyles>({ ...DEFAULT_STYLES });
  const [codeText, setCodeText] = useState(stylesToCode(DEFAULT_STYLES));

  // アバターのDataURLキャッシュ
  const [avatarDataUrl, setAvatarDataUrl] = useState<string>("");
  // アイキャッチのDataURLキャッシュ
  const [eyecatchDataUrl, setEyecatchDataUrl] = useState<string>("");

  // 画像化の状態
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  // テンプレート
  const [, setTemplates] = useState<SavedTemplate[]>([]);
  const [templateSaving, setTemplateSaving] = useState(false);

  // プレビュー画像（リアルタイム）
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);

  // スタイル更新ヘルパー
  const updateStyle = useCallback(<K extends keyof LineImageStyles>(key: K, value: LineImageStyles[K]) => {
    setStyles((prev) => {
      const next = { ...prev, [key]: value };
      setCodeText(stylesToCode(next));
      return next;
    });
  }, []);

  // テンプレート読み込み
  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/line-templates")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: SavedTemplate[]) => {
        setTemplates(data);
        const def = data.find((t) => t.isDefault);
        if (def && !initialized) {
          try {
            const parsed = JSON.parse(def.styles);
            const merged = { ...DEFAULT_STYLES, ...parsed };
            setStyles(merged);
            setCodeText(stylesToCode(merged));
          } catch { /* ignore */ }
        }
      })
      .catch(() => { /* ignore */ });
  }, [isOpen, initialized]);

  // 初期値セット
  useEffect(() => {
    if (isOpen && !initialized) {
      const bodyText = extractPlainText(content, 500);
      setEditTitle(title || "");
      setEditBody(bodyText || "");
      setEditWriter(writerName || "");
      setInitialized(true);
      setGeneratedImage(null);
    }
    if (!isOpen) {
      setInitialized(false);
    }
  }, [isOpen, initialized, title, content, writerName]);

  // アバター画像をDataURLに事前変換
  useEffect(() => {
    if (writerAvatarUrl) {
      toDataUrl(writerAvatarUrl).then(setAvatarDataUrl);
    } else {
      setAvatarDataUrl("");
    }
  }, [writerAvatarUrl]);

  // アイキャッチ画像をDataURLに事前変換
  useEffect(() => {
    if (eyecatchUrl) {
      toDataUrl(eyecatchUrl).then(setEyecatchDataUrl);
    } else {
      setEyecatchDataUrl("");
    }
  }, [eyecatchUrl]);

  // プレビュー更新（debounce付き）
  useEffect(() => {
    if (!isOpen) return;
    if (generatedImage) return;

    setPreviewLoading(true);
    const timer = setTimeout(async () => {
      try {
        const url = await generateLineImage({
          title: editTitle,
          body: editBody,
          writerName: editWriter,
          avatarDataUrl,
          eyecatchDataUrl,
        }, styles);
        setPreviewUrl(url);
      } catch (e) {
        console.error("プレビュー生成エラー:", e);
      }
      setPreviewLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [isOpen, editTitle, editBody, editWriter, avatarDataUrl, eyecatchDataUrl, styles, generatedImage]);

  /** 画像を生成（Canvas API） */
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setGeneratedImage(null);

    try {
      const dataUrl = await generateLineImage({
        title: editTitle,
        body: editBody,
        writerName: editWriter,
        avatarDataUrl,
        eyecatchDataUrl,
      }, styles);
      setGeneratedImage(dataUrl);
    } catch (err) {
      console.error("LINE画像生成エラー:", err);
      alert("画像生成に失敗しました。");
    }

    setGenerating(false);
  }, [editTitle, editBody, editWriter, avatarDataUrl, eyecatchDataUrl, styles]);

  /** ダウンロード */
  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement("a");
    const slug = editTitle.slice(0, 20).replace(/[^a-zA-Z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g, "_");
    link.download = `line-${slug}-${Date.now()}.png`;
    link.href = generatedImage;
    link.click();
  };

  const handleReEdit = () => {
    setGeneratedImage(null);
  };

  /** テンプレートとして保存 */
  const handleSaveTemplate = async () => {
    setTemplateSaving(true);
    try {
      const res = await fetch("/api/line-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "デフォルトテンプレート", styles, setAsDefault: true }),
      });
      if (res.ok) {
        const saved = await res.json();
        setTemplates((prev) => [saved, ...prev.map((t) => ({ ...t, isDefault: false }))]);
        alert("テンプレートとして保存しました。次回からこの設定がデフォルトで適用されます。");
      }
    } catch { /* ignore */ }
    setTemplateSaving(false);
  };

  /** コードタブからスタイル適用 */
  const handleApplyCode = () => {
    const parsed = codeToStyles(codeText);
    if (parsed) {
      setStyles(parsed);
    } else {
      alert("JSONの形式が不正です。正しいJSON形式で入力してください。");
    }
  };

  const isGenerated = !!generatedImage;

  return (
    <div className="mb-4 md:mb-6">
      {/* 折りたたみトグル */}
      <button type="button" onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">
        <FiSmartphone size={16} />
        <span>LINE配信画像を生成</span>
        <FiChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="mt-3 bg-white border border-slate-200 rounded-lg overflow-hidden">
          {!isGenerated ? (
            /* ===== プレビュー＆編集モード ===== */
            <div className="p-4">
              <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
                {/* 左: プレビュー（Canvas生成画像） */}
                <div className="flex flex-col items-center">
                  <p className="text-[10px] text-slate-400 mb-2">プレビュー</p>
                  <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-slate-50" style={{ width: "260px", height: "520px" }}>
                    {previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previewUrl} alt="プレビュー" style={{ width: "260px", height: "520px", objectFit: "contain" }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-slate-300">
                        {previewLoading ? "生成中..." : "プレビュー"}
                      </div>
                    )}
                  </div>
                </div>

                {/* 右: エディット/コードタブ */}
                <div className="min-w-0">
                  {/* タブ切替 */}
                  <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
                    <button type="button" onClick={() => setEditorTab("edit")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-t-md font-medium transition-colors ${
                        editorTab === "edit" ? "bg-blue-50 text-blue-700 border-b-2 border-blue-500" : "text-slate-400 hover:text-slate-600"
                      }`}><FiEdit3 size={12} /> エディット</button>
                    <button type="button" onClick={() => { setCodeText(stylesToCode(styles)); setEditorTab("code"); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-t-md font-medium transition-colors ${
                        editorTab === "code" ? "bg-blue-50 text-blue-700 border-b-2 border-blue-500" : "text-slate-400 hover:text-slate-600"
                      }`}><FiCode size={12} /> コード</button>
                    {/* テンプレート保存ボタン */}
                    <button type="button" onClick={handleSaveTemplate} disabled={templateSaving}
                      className="ml-auto flex items-center gap-1 px-3 py-1.5 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-colors">
                      <FiBookmark size={12} /> {templateSaving ? "保存中..." : "テンプレートにする"}
                    </button>
                  </div>

                  {editorTab === "edit" ? (
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                      {/* コンテンツ編集 */}
                      <fieldset className="space-y-3 border border-slate-100 rounded-lg p-3">
                        <legend className="text-[11px] font-semibold text-slate-500 px-1">コンテンツ</legend>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">記事タイトル</label>
                          <textarea value={editTitle} onChange={(e) => setEditTitle(e.target.value)} rows={2}
                            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 resize-none" placeholder="タイトル" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">執筆者名</label>
                          <input type="text" value={editWriter} onChange={(e) => setEditWriter(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400" placeholder="執筆者名" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">冒頭テキスト</label>
                          <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={6}
                            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 resize-y" placeholder="冒頭テキスト" />
                        </div>
                      </fieldset>

                      {/* タイトルスタイル */}
                      <fieldset className="space-y-2 border border-slate-100 rounded-lg p-3">
                        <legend className="text-[11px] font-semibold text-slate-500 px-1">タイトル</legend>
                        <NumInput label="フォントサイズ" value={styles.titleFontSize} onChange={(v) => updateStyle("titleFontSize", v)} min={20} max={80} />
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500 w-20 shrink-0">太さ</span>
                          <select value={styles.titleFontWeight} onChange={(e) => updateStyle("titleFontWeight", e.target.value)}
                            className="text-xs border border-slate-200 rounded px-2 py-1">
                            <option value="400">通常 (400)</option>
                            <option value="500">やや太 (500)</option>
                            <option value="600">太い (600)</option>
                            <option value="700">ボールド (700)</option>
                            <option value="800">極太 (800)</option>
                            <option value="900">最太 (900)</option>
                          </select>
                        </div>
                        <NumInput label="行間" value={styles.titleLineHeight} onChange={(v) => updateStyle("titleLineHeight", v)} min={1.0} max={3.0} step={0.1} />
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500 w-20 shrink-0">揃え</span>
                          <AlignButtons value={styles.titleAlign} onChange={(v) => updateStyle("titleAlign", v)} />
                        </div>
                        <ColorInput label="色" value={styles.titleColor} onChange={(v) => updateStyle("titleColor", v)} />
                      </fieldset>

                      {/* 本文スタイル */}
                      <fieldset className="space-y-2 border border-slate-100 rounded-lg p-3">
                        <legend className="text-[11px] font-semibold text-slate-500 px-1">本文</legend>
                        <NumInput label="フォントサイズ" value={styles.bodyFontSize} onChange={(v) => updateStyle("bodyFontSize", v)} min={16} max={60} />
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500 w-20 shrink-0">太さ</span>
                          <select value={styles.bodyFontWeight} onChange={(e) => updateStyle("bodyFontWeight", e.target.value)}
                            className="text-xs border border-slate-200 rounded px-2 py-1">
                            <option value="300">細い (300)</option>
                            <option value="400">通常 (400)</option>
                            <option value="500">やや太 (500)</option>
                            <option value="600">太い (600)</option>
                            <option value="700">ボールド (700)</option>
                          </select>
                        </div>
                        <NumInput label="行間" value={styles.bodyLineHeight} onChange={(v) => updateStyle("bodyLineHeight", v)} min={1.0} max={3.0} step={0.1} />
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500 w-20 shrink-0">揃え</span>
                          <AlignButtons value={styles.bodyAlign} onChange={(v) => updateStyle("bodyAlign", v)} />
                        </div>
                        <ColorInput label="色" value={styles.bodyColor} onChange={(v) => updateStyle("bodyColor", v)} />
                      </fieldset>

                      {/* ヘッダー */}
                      <fieldset className="space-y-2 border border-slate-100 rounded-lg p-3">
                        <legend className="text-[11px] font-semibold text-slate-500 px-1">ヘッダー</legend>
                        <NumInput label="フォントサイズ" value={styles.headerFontSize} onChange={(v) => updateStyle("headerFontSize", v)} min={16} max={60} />
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500 w-20 shrink-0">太さ</span>
                          <select value={styles.headerFontWeight} onChange={(e) => updateStyle("headerFontWeight", e.target.value)}
                            className="text-xs border border-slate-200 rounded px-2 py-1">
                            <option value="400">通常 (400)</option>
                            <option value="500">やや太 (500)</option>
                            <option value="600">太い (600)</option>
                            <option value="700">ボールド (700)</option>
                            <option value="800">極太 (800)</option>
                            <option value="900">最太 (900)</option>
                          </select>
                        </div>
                        <ColorInput label="テキスト色" value={styles.headerTextColor} onChange={(v) => updateStyle("headerTextColor", v)} />
                        <NumInput label="高さ" value={styles.headerHeight} onChange={(v) => updateStyle("headerHeight", v)} min={40} max={160} />
                      </fieldset>

                      {/* レイアウト */}
                      <fieldset className="space-y-2 border border-slate-100 rounded-lg p-3">
                        <legend className="text-[11px] font-semibold text-slate-500 px-1">レイアウト</legend>
                        <NumInput label="左右余白" value={styles.paddingX} onChange={(v) => updateStyle("paddingX", v)} min={20} max={120} />
                        <NumInput label="上余白" value={styles.paddingTop} onChange={(v) => updateStyle("paddingTop", v)} min={20} max={120} />
                        <ColorInput label="背景色" value={styles.bgColor} onChange={(v) => updateStyle("bgColor", v)} />
                      </fieldset>

                      {/* From テキスト */}
                      <fieldset className="space-y-2 border border-slate-100 rounded-lg p-3">
                        <legend className="text-[11px] font-semibold text-slate-500 px-1">From テキスト</legend>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500 w-20 shrink-0">接頭語</span>
                          <input type="text" value={styles.fromPrefix} onChange={(e) => updateStyle("fromPrefix", e.target.value)}
                            className="flex-1 text-xs border border-slate-200 rounded px-2 py-1" />
                        </div>
                        <NumInput label="フォントサイズ" value={styles.fromFontSize} onChange={(v) => updateStyle("fromFontSize", v)} min={14} max={40} />
                        <ColorInput label="色" value={styles.fromColor} onChange={(v) => updateStyle("fromColor", v)} />
                      </fieldset>

                      {/* アイキャッチ画像 */}
                      <fieldset className="space-y-2 border border-slate-100 rounded-lg p-3">
                        <legend className="text-[11px] font-semibold text-slate-500 px-1">アイキャッチ画像</legend>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500 w-20 shrink-0">表示</span>
                          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                            <input type="checkbox" checked={styles.eyecatchShow} onChange={(e) => updateStyle("eyecatchShow", e.target.checked)} />
                            表示する
                          </label>
                          {!eyecatchDataUrl && styles.eyecatchShow && (
                            <span className="text-[10px] text-amber-500">※ アイキャッチ未設定</span>
                          )}
                        </div>
                        {styles.eyecatchShow && (
                          <>
                            <NumInput label="高さ" value={styles.eyecatchHeight} onChange={(v) => updateStyle("eyecatchHeight", v)} min={100} max={800} />
                            <NumInput label="下マージン" value={styles.eyecatchMarginBottom} onChange={(v) => updateStyle("eyecatchMarginBottom", v)} min={0} max={200} />
                          </>
                        )}
                      </fieldset>

                      {/* 執筆者画像（アバター） */}
                      <fieldset className="space-y-2 border border-slate-100 rounded-lg p-3">
                        <legend className="text-[11px] font-semibold text-slate-500 px-1">執筆者画像</legend>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500 w-20 shrink-0">表示</span>
                          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                            <input type="checkbox" checked={styles.avatarShow} onChange={(e) => updateStyle("avatarShow", e.target.checked)} />
                            表示する
                          </label>
                        </div>
                        {styles.avatarShow && (
                          <>
                            <NumInput label="サイズ" value={styles.avatarSize} onChange={(v) => updateStyle("avatarSize", v)} min={80} max={400} />
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-500 w-20 shrink-0">揃え</span>
                              <AlignButtons value={styles.avatarAlign} onChange={(v) => updateStyle("avatarAlign", v)} />
                            </div>
                            <NumInput label="上マージン" value={styles.avatarMarginTop} onChange={(v) => updateStyle("avatarMarginTop", v)} min={0} max={200} />
                            <NumInput label="下マージン" value={styles.avatarMarginBottom} onChange={(v) => updateStyle("avatarMarginBottom", v)} min={0} max={200} />
                          </>
                        )}
                      </fieldset>

                      {/* ボタン */}
                      <fieldset className="space-y-2 border border-slate-100 rounded-lg p-3">
                        <legend className="text-[11px] font-semibold text-slate-500 px-1">ボタン</legend>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500 w-20 shrink-0">テキスト</span>
                          <input type="text" value={styles.btnText} onChange={(e) => updateStyle("btnText", e.target.value)}
                            className="flex-1 text-xs border border-slate-200 rounded px-2 py-1" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500 w-20 shrink-0">絵文字</span>
                          <input type="text" value={styles.btnEmoji} onChange={(e) => updateStyle("btnEmoji", e.target.value)}
                            className="w-16 text-xs border border-slate-200 rounded px-2 py-1" />
                        </div>
                        <NumInput label="フォントサイズ" value={styles.btnFontSize} onChange={(v) => updateStyle("btnFontSize", v)} min={16} max={60} />
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500 w-20 shrink-0">横幅</span>
                          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                            <input type="checkbox" checked={styles.btnWidthAuto} onChange={(e) => updateStyle("btnWidthAuto", e.target.checked)} />
                            本文幅に合わせる
                          </label>
                        </div>
                        {!styles.btnWidthAuto && (
                          <NumInput label="左右パディング" value={styles.btnPaddingX} onChange={(v) => updateStyle("btnPaddingX", v)} min={20} max={160} />
                        )}
                        <NumInput label="上下パディング" value={styles.btnPaddingY} onChange={(v) => updateStyle("btnPaddingY", v)} min={10} max={60} />
                        <NumInput label="角丸" value={styles.btnRadius} onChange={(v) => updateStyle("btnRadius", v)} min={0} max={999} />
                        <ColorInput label="テキスト色" value={styles.btnTextColor} onChange={(v) => updateStyle("btnTextColor", v)} />
                        <div>
                          <span className="text-[11px] text-slate-500 block mb-1.5">グラデーション</span>
                          <div className="flex flex-wrap gap-1.5">
                            {BTN_GRADIENT_PRESETS.map((preset) => {
                              const isActive = styles.btnBgFrom === preset.from && styles.btnBgMid === preset.mid && styles.btnBgTo === preset.to;
                              return (
                                <button
                                  key={preset.key}
                                  type="button"
                                  onClick={() => {
                                    setStyles((prev) => {
                                      const next = { ...prev, btnBgFrom: preset.from, btnBgMid: preset.mid, btnBgTo: preset.to };
                                      setCodeText(stylesToCode(next));
                                      return next;
                                    });
                                  }}
                                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded-lg border transition-all ${
                                    isActive
                                      ? "border-blue-400 ring-2 ring-blue-200 bg-blue-50 font-semibold"
                                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                  }`}
                                  title={preset.label}
                                >
                                  <span
                                    className="w-5 h-5 rounded-full border border-white shadow-sm shrink-0"
                                    style={{ background: `linear-gradient(135deg, ${preset.from}, ${preset.mid}, ${preset.to})` }}
                                  />
                                  <span>{preset.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <details className="mt-1">
                          <summary className="text-[10px] text-slate-400 cursor-pointer hover:text-slate-600">カスタムカラー設定</summary>
                          <div className="space-y-2 mt-2 pl-2 border-l-2 border-slate-100">
                            <ColorInput label="開始色" value={styles.btnBgFrom} onChange={(v) => updateStyle("btnBgFrom", v)} />
                            <ColorInput label="中間色" value={styles.btnBgMid} onChange={(v) => updateStyle("btnBgMid", v)} />
                            <ColorInput label="終了色" value={styles.btnBgTo} onChange={(v) => updateStyle("btnBgTo", v)} />
                            <ColorInput label="影の色" value={styles.btnShadowColor} onChange={(v) => updateStyle("btnShadowColor", v)} />
                          </div>
                        </details>
                      </fieldset>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-[10px] text-slate-400">スタイルをJSON形式で直接編集できます。変更後「適用」をクリックしてください。</p>
                      <textarea value={codeText} onChange={(e) => setCodeText(e.target.value)} rows={20}
                        className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 resize-y bg-slate-50"
                        spellCheck={false} />
                      <button type="button" onClick={handleApplyCode}
                        className="px-4 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1.5">
                        <FiSave size={12} /> 適用
                      </button>
                    </div>
                  )}

                  {/* 画像生成ボタン */}
                  <button type="button" onClick={handleGenerate} disabled={generating || !editTitle.trim()}
                    className="w-full mt-4 py-3 text-sm font-semibold bg-black text-white rounded-lg hover:bg-black/80 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                    {generating ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> 画像を生成しています...</>
                    ) : (
                      <><FiCamera size={16} /> 画像を生成</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ===== 生成完了 → ダウンロードモード ===== */
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-green-700">画像が生成されました！</p>
                <button type="button" onClick={handleReEdit}
                  className="px-3 py-1.5 text-xs bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 flex items-center gap-1.5">
                  <FiEdit3 size={12} /> 再編集
                </button>
              </div>

              <div className="max-w-sm mx-auto">
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                  <div className="p-2 flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={generatedImage!} alt="LINE配信画像" className="w-[200px] md:w-[240px] h-auto rounded shadow-sm" />
                  </div>
                  <div className="flex justify-center pb-2">
                    <button type="button" onClick={handleDownload}
                      className="px-3 py-1 text-xs text-white rounded-lg flex items-center gap-1.5 bg-black hover:bg-black/80">
                      <FiDownload size={12} /> ダウンロード（1040×2080px）
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
