"use client";

import { useState, type FormEvent } from "react";
import { ImagePlus, CheckCircle2, Loader2, Info, PackageCheck } from "lucide-react";
import type { Listing } from "@/lib/domain";
import { categories, conditions, transportLabels, disassemblyLabels, utcFromJST, type Session } from "./constants";
import { api, ErrorNotice, SignInPrompt } from "./ui";

export default function ListingForm({ session, onSaved }: { session: Session | null; onSaved: (listing: Listing) => void }) {
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [saved, setSaved] = useState<Listing | null>(null);
  if (!session?.canCreateDraft) return <div className="sign-in-panel"><span className="mini-eyebrow">COMING NEXT</span><h3>出品機能は準備中です。</h3><p>現在はサンプルの検索、お気に入り保存、料金の参考試算を公開しています。一般の出品・取引はまだ受け付けていません。</p><p>運営者のみ、ログイン後に下書き機能を確認できます。</p>{!session?.user && <a className="button button-outline" href="/signin-with-chatgpt?return_to=%2F" target="_top">運営者ログイン</a>}<p className="small-muted">この画面では企業情報・写真の入力を受け付けていません。</p></div>;

  async function upload(file: File | undefined) {
    if (!file) return;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 3 * 1024 * 1024) {
      setError("写真はJPEG・PNG・WebP形式、3MB以内で選択してください。");
      return;
    }
    setUploading(true);
    try { const data = await api<{ imageUrl: string }>("/api/photos", { method: "POST", body: file, headers: { "Content-Type": file.type } }); setImageUrl(data.imageUrl); }
    catch (err) { setError(err instanceof Error ? err.message : "写真をアップロードできませんでした。"); }
    finally { setUploading(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const data: Record<string, string | number | boolean> = {};
    for (const [key, value] of form.entries()) { if (typeof value === "string") data[key] = value; }
    for (const key of ["priceJPY", "quantity", "widthCm", "depthCm", "heightCm", "weightKg"]) data[key] = Number(form.get(key));
    for (const key of ["rightsConfirmed", "termsAccepted", "pickupRulesConfirmed"]) data[key] = form.get(key) === "on";
    try {
      data.pickupStart = utcFromJST(String(form.get("pickupStart")));
      data.pickupEnd = utcFromJST(String(form.get("pickupEnd")));
      if (new Date(String(data.pickupEnd)) <= new Date(String(data.pickupStart))) { setError("引渡終了日時は開始日時より後にしてください。"); return; }
      if (imageUrl) data.imageUrl = imageUrl;
      setBusy(true);
      const result = await api<{ listing: Listing }>("/api/listings", { method: "POST", body: JSON.stringify(data) });
      setSaved(result.listing);
      onSaved(result.listing);
    } catch (err) { setError(err instanceof Error ? err.message : "保存できませんでした。"); }
    finally { setBusy(false); }
  }

  if (saved) return <div className="saved-panel"><span className="success-icon"><CheckCircle2 size={34} /></span><h3>下書きを保存しました。</h3><p>「{saved.title}」は、あなたのマイページから確認できます。</p><div className="notice"><Info size={20} /><span>プレビュー期間中は、下書きは一般公開されません。掲載・取引の開始前に内容を改めて確認できます。</span></div></div>;

  return <form className="listing-form" onSubmit={submit}>
    <div className="notice"><PackageCheck size={22} /><span>まずは下書きから。写真と引渡条件をまとめておくと、次の出展者につなぎやすくなります。</span></div>
    <section className="form-section"><h3>什器について</h3>
      <label className="upload-box">{imageUrl ? <img src={imageUrl} alt="アップロードした什器の写真" /> : <><ImagePlus size={30} /><strong>{uploading ? "アップロード中…" : "写真を追加"}</strong><span>JPEG・PNG・WebP / 3MB以内 / 任意</span></>}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => upload(e.target.files?.[0])} disabled={uploading} /><span className="sr-only">什器の写真を選ぶ</span></label>
      <label>出品タイトル <span className="required">必須</span><input name="title" required minLength={3} maxLength={100} placeholder="例：木目調の展示台 3台セット" /></label>
      <div className="field-grid"><label>カテゴリー<select name="category" defaultValue="display">{Object.entries(categories).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>状態<select name="condition" defaultValue="good">{Object.entries(conditions).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div>
      <div className="field-grid"><label>セット全体の希望価格（円）<input name="priceJPY" type="number" min="0" max="10000000" step="1" defaultValue="0" required /></label><label>セットに含まれる個数<input name="quantity" type="number" min="1" max="1000" step="1" defaultValue="1" required /></label></div>
      <p className="field-help">価格は1個あたりではなく、出品するセット全体の金額です。無償譲渡の場合は0円を入力してください。</p>
      <div className="field-grid four"><label>幅（cm）<input name="widthCm" type="number" min="0.1" max="2000" step="0.1" placeholder="90" required /></label><label>奥行（cm）<input name="depthCm" type="number" min="0.1" max="2000" step="0.1" placeholder="45" required /></label><label>高さ（cm）<input name="heightCm" type="number" min="0.1" max="2000" step="0.1" placeholder="80" required /></label><label>重量（kg）<input name="weightKg" type="number" min="0.1" max="5000" step="0.1" placeholder="15" required /></label></div>
      <p className="field-help">寸法・重量は1個あたりの代表値です。個体差や梱包後のサイズは説明欄に記載してください。</p>
      <label>状態・付属品・引渡時の注意<textarea name="description" required minLength={10} maxLength={4000} rows={4} placeholder="傷の場所、使用回数、必要な工具、人手などを具体的に記載してください。" /></label>
    </section>
    <section className="form-section"><h3>引渡しについて</h3>
      <div className="field-grid"><label>引渡場所・会場名<input name="venue" required minLength={2} maxLength={120} placeholder="例：東京ビッグサイト" /></label><label>地域<input name="addressArea" required minLength={2} maxLength={120} placeholder="例：東京都江東区有明" /></label></div>
      <div className="field-grid"><label>開始日時（日本時間）<input name="pickupStart" type="datetime-local" required /></label><label>終了日時（日本時間）<input name="pickupEnd" type="datetime-local" required /></label></div>
      <div className="field-grid"><label>運搬手段の目安<select name="transport" defaultValue="van">{Object.entries(transportLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>解体<select name="disassembly" defaultValue="none">{Object.entries(disassemblyLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div>
      <label>企業名・屋号<input name="companyName" required minLength={2} maxLength={100} placeholder="公開時に表示する企業名・屋号" /></label>
    </section>
    <fieldset className="confirmation-fields"><legend>保存前の確認</legend><label className="check-row"><input type="checkbox" name="rightsConfirmed" required /><span>この什器を所有している、または譲渡する権限があります。レンタル品ではありません。</span></label><label className="check-row"><input type="checkbox" name="pickupRulesConfirmed" required /><span>主催者・会場の搬出条件を確認し、必要な許可は取引開始までに準備します。</span></label><label className="check-row"><input type="checkbox" name="termsAccepted" required /><span>プレビュー期間中は下書き保存のみで、取引・決済が開始されないことを確認しました。</span></label></fieldset>
    {error && <ErrorNotice message={error} />}
    <button className="button button-dark full-width" type="submit" disabled={busy || uploading}>{busy ? <><Loader2 className="spin" size={18} />保存中…</> : "下書きを保存"}</button>
    <p className="small-muted centered">入力内容はログイン中のアカウントに保存されます。<br /><a href="/terms" target="_blank" rel="noopener noreferrer">プレビューの利用条件</a>と<a href="/privacy" target="_blank" rel="noopener noreferrer">プライバシーについて</a>をご確認ください。</p>
  </form>;
}
