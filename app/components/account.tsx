"use client";

import { useEffect, useState } from "react";
import { FileText, Plus, Package, Inbox, CheckCircle2, Info } from "lucide-react";
import type { Listing, RelayRequest } from "@/lib/domain";
import { statusLabels, shortDate, yen, type Session } from "./constants";
import { api, ErrorNotice, SignInPrompt, Loading } from "./ui";

type AccountData = { listings: Listing[]; incoming: RelayRequest[]; outgoing: RelayRequest[] };
const requestLabels = { pending: "確認待ち", accepted: "承認済み", rejected: "お断り", cancelled: "取消済み", completed: "引渡完了" };

export default function Account({ session, onCreate, onView }: { session: Session | null; onCreate: () => void; onView: (listing: Listing) => void }) {
  const [data, setData] = useState<AccountData | null>(null);
  const [tab, setTab] = useState<"listings" | "incoming" | "outgoing">("listings");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  async function load() {
    try { setData(await api<AccountData>("/api/account")); }
    catch (err) { setError(err instanceof Error ? err.message : "マイページを読み込めませんでした。"); }
  }
  useEffect(() => { if (session?.user) void load(); }, [session?.user?.id]);
  if (!session?.user) return <div className="sign-in-panel"><span className="mini-eyebrow">MY RELAY</span><h3>マイページは準備中です。</h3><p>現在はサンプルを公開しています。出品・取引機能の確認は運営者のみ利用できます。</p><a className="button button-outline" href="/signin-with-chatgpt?return_to=%2F" target="_top">運営者ログイン</a></div>;
  async function action(id: string, actionName: string, kind: "listing" | "request") {
    setBusyId(id); setError("");
    try { await api(`/api/${kind === "listing" ? "listings" : "requests"}/${id}`, { method: "PATCH", body: JSON.stringify({ action: actionName }) }); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "更新できませんでした。"); }
    finally { setBusyId(null); }
  }
  return <div className="account-content"><div className="account-heading"><div><p className="mini-eyebrow">MY RELAY</p><h3>{session.user.displayName}</h3></div><button className="button button-dark small-button" onClick={onCreate}><Plus size={17} />{session.canCreateDraft ? "出品の下書きを作成" : "出品機能について"}</button></div>
    {session.mode === "preview" && <div className="notice"><Info size={20} /><span>現在はプレビュー期間です。一般の出品・取引申込は準備中で、下書き機能は運営者のみ利用できます。</span></div>}
    <div className="account-tabs" role="tablist" aria-label="マイページの表示"><button role="tab" aria-selected={tab === "listings"} className={tab === "listings" ? "selected" : ""} onClick={() => setTab("listings")}><FileText size={17} />出品 {data?.listings.length ?? 0}</button><button role="tab" aria-selected={tab === "incoming"} className={tab === "incoming" ? "selected" : ""} onClick={() => setTab("incoming")}><Inbox size={17} />届いた希望 {data?.incoming.length ?? 0}</button><button role="tab" aria-selected={tab === "outgoing"} className={tab === "outgoing" ? "selected" : ""} onClick={() => setTab("outgoing")}><Package size={17} />送った希望 {data?.outgoing.length ?? 0}</button></div>
    {error && <ErrorNotice message={error} />}
    {!data && !error && <Loading />}
    {data && tab === "listings" && <div className="account-list">{data.listings.length ? data.listings.map(listing => <article className="account-item" key={listing.id}><button className="account-image" onClick={() => onView(listing)} aria-label={`${listing.title}の詳細`}><img src={listing.imageUrl || "/assets/display.svg"} alt="" /></button><div className="account-item-main"><span className="status-tag">{statusLabels[listing.status]}</span><button className="text-button item-title" onClick={() => onView(listing)}>{listing.title}</button><p>{yen(listing.priceJPY)} · {listing.venue} · {shortDate(listing.pickupStart)}</p><div className="item-actions">{(listing.status === "draft") && <button className="button button-outline small-button" disabled={session.mode !== "live" || busyId === listing.id} onClick={() => action(listing.id, "publish", "listing")}>{session.mode === "preview" ? "本掲載は準備中" : "公開する"}</button>}{listing.status === "published" && <button className="button button-outline small-button" disabled={busyId === listing.id} onClick={() => action(listing.id, "withdraw", "listing")}>公開を停止</button>}</div></div></article>) : <div className="empty-state compact"><FileText size={32} /><h3>まだ出品はありません。</h3><p>展示会を終える什器を、下書きから準備できます。</p><button className="button button-outline" onClick={onCreate}>最初の下書きを作る</button></div>}</div>}
    {data && tab !== "listings" && <div className="account-list">{data[tab].length ? data[tab].map(request => <article className="request-item" key={request.id}><div className="request-heading"><h3>{request.listingTitle}</h3><span className="status-tag">{requestLabels[request.status]}</span></div><p>{request.buyerCompany} · 希望日 {shortDate(request.pickupAt)}</p><p>{request.message}</p>{request.contactEmail && <p className="contact-line">相手の連絡先：<a href={`mailto:${request.contactEmail}`}>{request.contactEmail}</a></p>}{tab === "incoming" && request.status === "pending" && <p className="small-muted">承認すると、あなたと相手の連絡用メールアドレスが双方に共有されます。</p>}<div className="item-actions">{tab === "incoming" && request.status === "pending" && <><button className="button button-dark small-button" disabled={busyId === request.id} onClick={() => action(request.id, "accept", "request")}>希望を承認</button><button className="button button-outline small-button" disabled={busyId === request.id} onClick={() => action(request.id, "reject", "request")}>お断りする</button></>}{((tab === "outgoing" && request.status === "pending") || request.status === "accepted") && <button className="button button-outline small-button" disabled={busyId === request.id} onClick={() => action(request.id, "cancel", "request")}>{request.status === "accepted" ? "予約を取り消す" : "申込を取り消す"}</button>}{request.status === "accepted" && tab === "incoming" && <button className="button button-dark small-button" disabled={busyId === request.id} onClick={() => action(request.id, "complete", "request")}><CheckCircle2 size={17} />引渡完了を記録</button>}</div></article>) : <div className="empty-state compact"><Inbox size={32} /><h3>取引希望はありません。</h3><p>本取引の開始後に、こちらから確認できます。</p></div>}</div>}
    <a className="signout-link" href="/signout-with-chatgpt?return_to=%2F" target="_top">ログアウト</a>
  </div>;
}
