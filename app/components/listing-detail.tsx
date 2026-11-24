"use client";

import { useState, type FormEvent } from "react";
import { MapPin, CalendarDays, Truck, Ruler, Info, Package, Heart, CheckCircle2, Loader2 } from "lucide-react";
import type { Listing } from "@/lib/domain";
import { categories, conditions, transportLabels, disassemblyLabels, shortDate, timeOf, localJST, utcFromJST, yen, type Session } from "./constants";
import { api, ErrorNotice, SignInPrompt } from "./ui";

export default function ListingDetail({ listing, session, saved, onFavorite }: { listing: Listing; session: Session | null; saved: boolean; onFavorite: () => void }) {
  const [requesting, setRequesting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const canRequest = !listing.isDemo && listing.status === "published" && session?.mode === "live";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      await api(`/api/listings/${listing.id}/requests`, { method: "POST", body: JSON.stringify({ companyName: form.get("companyName"), message: form.get("message"), pickupAt: utcFromJST(String(form.get("pickupAt"))), conditionsAccepted: form.get("conditionsAccepted") === "on" }) });
      setSent(true);
    } catch (err) { setError(err instanceof Error ? err.message : "希望を送信できませんでした。"); }
    finally { setBusy(false); }
  }
  return <div className="detail-content"><div className="detail-overview"><div className={`detail-image product-${listing.category}`}><img src={listing.imageUrl || "/assets/display.svg"} alt={`${listing.title}${listing.isDemo ? "のイメージイラスト" : "の写真"}`} />{listing.isDemo && <span className="sample-tag">サンプル・購入できません</span>}</div><div className="detail-summary"><span className="category-caption">{categories[listing.category]}</span><h3>{listing.title}</h3><div className="detail-price">{listing.priceJPY === 0 ? "無償譲渡" : yen(listing.priceJPY)}<small> / {listing.quantity}点セット</small></div><span className="condition-pill">{conditions[listing.condition]}</span><p className="seller-label">{listing.isDemo ? "サンプル出品者" : listing.companyName}</p><button className={`button button-outline ${saved ? "saved" : ""}`} onClick={onFavorite} aria-pressed={saved}><Heart size={18} fill={saved ? "currentColor" : "none"} />{saved ? "お気に入りに保存済み" : "お気に入りに保存"}</button><span className="small-muted">お気に入りはこのブラウザに保存されます。</span></div></div>
    <section className="detail-section"><h4>引渡条件</h4><div className="condition-grid"><div><MapPin size={21} /><span><small>引渡場所</small><strong>{listing.venue}</strong><span>{listing.addressArea}</span></span></div><div><CalendarDays size={21} /><span><small>引渡可能日時（日本時間）</small><strong>{shortDate(listing.pickupStart)} {timeOf(listing.pickupStart)}</strong><span>〜 {shortDate(listing.pickupEnd)} {timeOf(listing.pickupEnd)}</span></span></div><div><Ruler size={21} /><span><small>1点あたりのサイズ・重量</small><strong>幅 {listing.widthCm} × 奥行 {listing.depthCm} × 高さ {listing.heightCm} cm</strong><span>{listing.weightKg} kg / 点</span></span></div><div><Truck size={21} /><span><small>運搬・解体</small><strong>{transportLabels[listing.transport]}が目安</strong><span>解体：{disassemblyLabels[listing.disassembly]}</span></span></div></div></section>
    <section className="detail-section"><h4>出品について</h4><p className="listing-description">{listing.description}</p><div className="notice subtle"><Info size={20} /><span>記載情報は出品者の申告です。寸法・状態、搬出許可、必要な車両と人手は、双方で直接確認してください。運搬費は表示価格に含まれません。</span></div></section>
    <section className="detail-action">
      {listing.isDemo ? <div className="notice"><Package size={22} /><span><strong>この什器はサービス紹介用のサンプルです。</strong><br />実在の在庫ではなく、申込・購入・支払いはできません。</span></div> : !canRequest ? <div className="notice"><Info size={22} /><span>{listing.status === "draft" ? "あなたの下書きです。現在は一般公開されていません。" : listing.status === "completed" ? "この出品は引渡しが完了しています。" : "本取引は準備中です。現在、受取希望の送信はできません。"}</span></div> : sent ? <div className="notice notice-success" role="status"><CheckCircle2 size={22} /><span>受取希望を送信しました。承認状況はマイページで確認できます。まだ取引は確定していません。</span></div> : requesting ? !session?.user ? <SignInPrompt description="受取希望の送信にはログインが必要です。" /> : <form className="request-form" onSubmit={submit}><h4>受取希望を送る</h4><div className="field-grid"><label>企業名・屋号<input name="companyName" required minLength={2} maxLength={100} /></label><label>希望日時（日本時間）<input name="pickupAt" type="datetime-local" required defaultValue={localJST(listing.pickupStart)} min={localJST(listing.pickupStart)} max={localJST(listing.pickupEnd)} /></label></div><label>出品者へのメッセージ<textarea name="message" required minLength={10} maxLength={2000} rows={3} placeholder="手配する車両・人数、確認したいことなど" /></label><label className="check-row"><input name="conditionsAccepted" type="checkbox" required /><span>引渡条件を確認しました。出品者が承認すると、双方に連絡用メールアドレスが共有されることに同意します。</span></label>{error && <ErrorNotice message={error} />}<button className="button button-dark full-width" disabled={busy}>{busy ? <><Loader2 size={18} className="spin" />送信中…</> : "受取希望を送信"}</button><p className="small-muted">この操作では支払いは発生しません。</p></form> : <button className="button button-dark full-width" onClick={() => setRequesting(true)}>受取希望を送る</button>}
    </section>
  </div>;
}
