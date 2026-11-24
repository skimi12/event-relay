"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Search, MapPin, CalendarDays, SlidersHorizontal, Heart, Plus, ChevronDown, Menu, X, Package, Layers, Armchair, Leaf, Grid2X2, Check, Info, Truck, CircleUserRound, Recycle, Ruler, CheckCircle2 } from "lucide-react";
import { calculateFee, type Listing } from "@/lib/domain";
import { SAMPLE_LISTINGS } from "@/lib/sample-data";
import { categories, conditions, transportLabels, yen, shortDate, timeOf, type Session } from "./constants";
import { Modal, api } from "./ui";
import ListingForm from "./listing-form";
import ListingDetail from "./listing-detail";
import Account from "./account";

const categoryItems = [{ id: "all", label: "すべての什器", icon: Grid2X2 }, { id: "display", label: "展示台・カウンター", icon: Package }, { id: "shelf", label: "棚・ラック", icon: Layers }, { id: "furniture", label: "テーブル・チェア", icon: Armchair }, { id: "decor", label: "パネル・装飾", icon: Leaf }];
const SIGNIN = "/signin-with-chatgpt?return_to=%2F";

export default function Marketplace() {
  const [listings, setListings] = useState<Listing[]>(SAMPLE_LISTINGS);
  const [session, setSession] = useState<Session | null>(null);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [venue, setVenue] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("recommended");
  const [showFilters, setShowFilters] = useState(false);
  const [maxPrice, setMaxPrice] = useState("");
  const [freeOnly, setFreeOnly] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<"create" | "account" | null>(null);
  const [selected, setSelected] = useState<Listing | null>(null);
  const [toast, setToast] = useState("");
  const [feeAmount, setFeeAmount] = useState(20000);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem("event-relay-favorites-v1") || "[]"); if (Array.isArray(saved)) setFavorites(saved.filter(x => typeof x === "string")); } catch { /* A blocked browser store does not prevent browsing. */ }
    let active = true;
    Promise.allSettled([api<{ listings: Listing[]; mode: "preview" | "live" }>("/api/listings"), api<Session>("/api/session")]).then(results => {
      if (!active) return;
      if (results[0].status === "fulfilled") setListings(results[0].value.listings);
      else setLoadError("最新の掲載情報を取得できませんでした。サービス紹介用のサンプルを表示しています。");
      if (results[1].status === "fulfilled") setSession(results[1].value);
    });
    return () => { active = false; };
  }, []);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 3200); return () => clearTimeout(timer); }, [toast]);
  function favorite(id: string) {
    const next = favorites.includes(id) ? favorites.filter(x => x !== id) : [...favorites, id];
    setFavorites(next);
    try { localStorage.setItem("event-relay-favorites-v1", JSON.stringify(next)); setToast(next.includes(id) ? "このブラウザのお気に入りに保存しました" : "お気に入りから削除しました"); } catch { setToast("この画面内で保存しました。ブラウザを閉じると保持されません。"); }
  }
  const venues = useMemo(() => [...new Set(listings.map(x => x.venue))], [listings]);
  const results = useMemo(() => {
    const text = query.trim().toLocaleLowerCase("ja");
    const filtered = listings.filter(item => {
      if (text && !`${item.title} ${item.description} ${item.venue} ${item.addressArea}`.toLocaleLowerCase("ja").includes(text)) return false;
      if (category !== "all" && item.category !== category) return false;
      if (venue && item.venue !== venue) return false;
      if (maxPrice !== "" && item.priceJPY > Number(maxPrice)) return false;
      if (freeOnly && item.priceJPY !== 0) return false;
      if (savedOnly && !favorites.includes(item.id)) return false;
      if (date) { const start = new Date(`${date}T00:00:00+09:00`).getTime(); const end = start + 86400000; if (new Date(item.pickupEnd).getTime() < start || new Date(item.pickupStart).getTime() >= end) return false; }
      return true;
    });
    if (sort === "price-asc") filtered.sort((a, b) => a.priceJPY - b.priceJPY);
    if (sort === "date-asc") filtered.sort((a, b) => a.pickupStart.localeCompare(b.pickupStart));
    if (sort === "newest") filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return filtered;
  }, [listings, query, category, venue, maxPrice, freeOnly, savedOnly, favorites, date, sort]);
  const activeFilters = !!(query || venue || date || category !== "all" || maxPrice || freeOnly || savedOnly);
  function reset() { setQuery(""); setVenue(""); setDate(""); setCategory("all"); setMaxPrice(""); setFreeOnly(false); setSavedOnly(false); }
  function search(event: FormEvent) { event.preventDefault(); resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }
  function openModal(value: typeof modal) { setMenuOpen(false); setSelected(null); setModal(value); }
  const calculatedFee = calculateFee(feeAmount).feeJPY;

  return <>
    <a className="skip-link" href="#marketplace">什器を探す</a>
    <header className="site-header"><div className="header-inner"><a className="brand" href="#" aria-label="Event Relay トップ"><span className="brand-symbol" aria-hidden="true"><span /><span /></span><span>event<span className="brand-weight">relay</span><span className="brand-period">.</span></span></a><nav className="desktop-nav" aria-label="メインナビゲーション"><a className="active" href="#marketplace">什器を探す</a><a href="#how-it-works">使い方</a><a href="#pricing">料金</a></nav><div className="header-actions"><button className="account-button" onClick={() => openModal("account")}><CircleUserRound size={19} /><span>マイページ</span></button><button className="button button-dark header-create" onClick={() => openModal("create")}><Plus size={18} />什器を出品</button><button className="icon-button menu-button" aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button></div></div>{menuOpen && <nav className="mobile-nav" aria-label="モバイルナビゲーション"><a href="#marketplace" onClick={() => setMenuOpen(false)}>什器を探す</a><a href="#how-it-works" onClick={() => setMenuOpen(false)}>使い方</a><a href="#pricing" onClick={() => setMenuOpen(false)}>料金</a><button onClick={() => openModal("account")}>マイページ</button><button onClick={() => openModal("create")}>什器を出品</button></nav>}</header>
    <main>
      <section className="hero"><div className="hero-inner"><div className="hero-copy"><p className="eyebrow"><span className="eyebrow-line" />EXHIBITION REUSE MARKET</p><h1>その什器を、<br />次の<span className="hero-highlight">舞台</span>へ。</h1><p className="hero-description">展示会の終わりは、次のはじまり。<br />使い終えた什器と、これから必要な企業をつなぎます。</p><div className="hero-actions"><a className="button button-dark" href="#marketplace">引き継ぐ什器を探す</a><button className="hero-text-link" onClick={() => openModal("create")}>什器をゆずりたい方</button></div><p className="hero-footnote"><MapPin size={15} /> 首都圏の展示会から、小さくはじめます。</p></div><div className="hero-art" role="img" aria-label="展示台、棚、グリーンの什器イラスト"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><span className="art-label">GOOD THINGS,<br />ANOTHER CHAPTER.</span><img className="hero-shelf" src="/assets/shelf.svg" alt="" /><img className="hero-display" src="/assets/display.svg" alt="" /><img className="hero-plant" src="/assets/plant.svg" alt="" /><div className="art-note"><span className="art-note-icon"><Recycle size={20} /></span><div><strong>まだ使えるを、つないでいく。</strong><span>FROM ONE EVENT TO THE NEXT</span></div></div><span className="art-caption">CONCEPT ILLUSTRATION</span></div></div></section>
      <div className="preview-banner"><div className="container"><span className="preview-label">PREVIEW</span><p>プレビュー公開中です。サンプルを探して、引き継ぐ体験をお試しください。<span>本取引・決済は準備中です。</span></p></div></div>
      <section id="marketplace" className="marketplace-section container" ref={resultsRef}><div className="section-heading"><div><p className="mini-eyebrow">FIND YOUR NEXT</p><h2>次の展示会に、ぴったりを。</h2></div><p>会場と日付から、引き継げる什器を探しましょう。</p></div>
        <form className="search-bar" onSubmit={search}><label className="search-keyword"><Search size={21} /><span className="sr-only">什器名・キーワード</span><input type="search" placeholder="展示台、木製、グリーン…" value={query} onChange={e => setQuery(e.target.value)} /></label><label className="search-venue"><MapPin size={19} /><span className="sr-only">引渡場所</span><select value={venue} onChange={e => setVenue(e.target.value)}><option value="">すべての会場・地域</option>{venues.map(v => <option value={v} key={v}>{v}</option>)}</select></label><label className="search-date"><CalendarDays size={19} /><span className="sr-only">引渡希望日</span><input type="date" aria-label="引渡希望日" value={date} onChange={e => setDate(e.target.value)} /></label><button className="button button-dark search-submit" type="submit">探す</button></form>
        <div className="category-row"><div className="category-tabs" aria-label="什器のカテゴリー">{categoryItems.map(({ id, label, icon: Icon }) => <button key={id} className={`category-tab ${category === id ? "selected" : ""}`} onClick={() => setCategory(id)} aria-pressed={category === id}><Icon size={17} /><span>{label}</span></button>)}</div><button className={`filter-button ${showFilters ? "selected" : ""}`} aria-expanded={showFilters} onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal size={17} /><span>絞り込み</span></button></div>
        {showFilters && <div className="advanced-filters"><label>希望価格の上限（セット総額）<div className="money-input"><span>¥</span><input type="number" min="0" max="10000000" step="1000" placeholder="上限なし" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} /></div></label><label className="check-row"><input type="checkbox" checked={freeOnly} onChange={e => setFreeOnly(e.target.checked)} /><span>無償譲渡のみ</span></label><label className="check-row"><input type="checkbox" checked={savedOnly} onChange={e => setSavedOnly(e.target.checked)} /><span>お気に入りのみ（このブラウザ）</span></label><button className="text-button" onClick={reset}>条件をリセット</button></div>}
        <div className="results-toolbar"><p aria-live="polite"><strong>{results.length}</strong> 件の什器 <span> {listings.every(x => x.isDemo) ? "すべてサービス紹介用のサンプルです" : "サンプルには専用ラベルを表示しています"}</span></p><div className="results-actions"><button className={`favorite-filter ${savedOnly ? "selected" : ""}`} onClick={() => setSavedOnly(!savedOnly)} aria-pressed={savedOnly} aria-label="お気に入りだけ表示"><Heart size={17} fill={savedOnly ? "currentColor" : "none"} /><span>保存済み</span></button><label><span className="sr-only">並び替え</span><select value={sort} onChange={e => setSort(e.target.value)}><option value="recommended">掲載順</option><option value="date-asc">引渡日が早い順</option><option value="price-asc">価格が安い順</option><option value="newest">新しい順</option></select></label></div></div>
        {loadError && <div className="notice data-notice" role="status"><Info size={19} /><span>{loadError}</span></div>}
        {results.length > 0 ? <div className="listing-grid">{results.map(listing => <article className="listing-card" key={listing.id}><div className={`listing-image product-${listing.category}`}><button className="image-button" onClick={() => setSelected(listing)} aria-label={`${listing.title}の詳細を見る`}><img src={listing.imageUrl || "/assets/display.svg"} alt={`${listing.title}${listing.isDemo ? "のイメージイラスト" : ""}`} loading="lazy" /></button><span className="condition-label">{conditions[listing.condition]}</span><button className={`favorite-button ${favorites.includes(listing.id) ? "selected" : ""}`} onClick={() => favorite(listing.id)} aria-pressed={favorites.includes(listing.id)} aria-label={`${listing.title}を${favorites.includes(listing.id) ? "お気に入りから削除" : "お気に入りに保存"}`}><Heart size={20} fill={favorites.includes(listing.id) ? "currentColor" : "none"} /></button>{listing.isDemo && <span className="sample-tag">サンプル出品</span>}</div><div className="listing-card-body"><div className="card-category"><span>{categories[listing.category]}</span><span>{listing.quantity}点セット</span></div><h3><button onClick={() => setSelected(listing)}>{listing.title}</button></h3><p className={`card-price ${listing.priceJPY === 0 ? "free-price" : ""}`}>{listing.priceJPY === 0 ? "無償譲渡" : yen(listing.priceJPY)}<span> / セット</span></p><div className="card-divider" /><p className="card-meta"><MapPin size={15} /><span>{listing.venue}</span></p><p className="card-meta"><CalendarDays size={15} /><span>{shortDate(listing.pickupStart)} {timeOf(listing.pickupStart)}〜</span></p><div className="card-bottom"><span><Ruler size={14} />{listing.widthCm} × {listing.depthCm} × {listing.heightCm} cm</span><span><Truck size={14} />{transportLabels[listing.transport]}</span></div></div></article>)}</div> : <div className="empty-state"><Search size={36} /><h3>条件に合う什器が見つかりませんでした。</h3><p>{savedOnly ? "お気に入りに保存した什器は、ここに表示されます。" : "会場や日付、キーワードを少し変えてみてください。"}</p><button className="button button-outline" onClick={reset}>すべての什器を表示</button></div>}
        {activeFilters && results.length > 0 && <button className="reset-results text-button" onClick={reset}>すべての条件をクリア</button>}
        <p className="catalog-footnote"><Info size={15} />掲載イラスト・条件・価格はサンプルです。実在の在庫や成約実績を示すものではありません。</p>
      </section>
      <section id="how-it-works" className="how-section"><div className="container"><div className="section-heading"><div><p className="mini-eyebrow">PASS IT ON</p><h2>ひとつの終わりを、<br className="mobile-only" />次のはじまりに。</h2></div><p>出品から引渡しまで、3つのステップ。</p></div><div className="steps-grid"><article><span className="step-icon"><Package size={27} /></span><h3>写真と条件を登録</h3><p>大きさ、状態、引渡場所と日時を記入。必要な運搬手段まで、あらかじめ共有します。</p><span className="step-caption">FOR THE NEXT EXHIBITOR</span></article><article><span className="step-icon"><CalendarDays size={27} /></span><h3>受取希望をすり合わせ</h3><p>条件の合う企業からの希望を確認。引渡時間や搬出ルールを、双方で調整します。</p><span className="step-caption">A MATCH THAT MAKES SENSE</span></article><article><span className="step-icon"><Recycle size={27} /></span><h3>会場で、次の企業へ</h3><p>現物を確認して、直接引き継ぎ。車両・運搬・保管は、取引する企業同士で手配します。</p><span className="step-caption">READY FOR ANOTHER STAGE</span></article></div><p className="how-note">現在はサンプルを閲覧できます。一般の出品・本取引は準備中です。上記には今後提供予定の機能を含みます。</p></div></section>
      <section id="pricing" className="pricing-section container"><div className="pricing-copy"><p className="mini-eyebrow">SIMPLE, FROM THE START</p><h2>つながった価値に、<br />わかりやすい料金を。</h2><p>掲載のハードルは低く、引き継ぎはスムーズに。<br />成約時だけ手数料が発生する仕組みを検討しています。</p><div className="pricing-points"><p><Check size={18} />プレビュー中の利用料金は無料</p><p><Check size={18} />現在、決済・請求は発生しません</p><p><Check size={18} />有料提供の条件は開始前にお知らせ</p></div><span className="pricing-note">右の計算は料金設計の参考です。確定した料金プランではありません。</span></div><div className="fee-calculator"><div className="calculator-heading"><span>成約手数料シミュレーター</span><span className="status-tag">参考試算</span></div><label htmlFor="sale-amount">什器セットの成約金額</label><div className="fee-input"><span>¥</span><input id="sale-amount" type="number" min="0" max="10000000" step="1000" value={feeAmount} onChange={e => setFeeAmount(Math.max(0, Math.min(10000000, Math.floor(Number(e.target.value) || 0))))} /></div><div className="fee-breakdown"><div><span>手数料（仮に10%の場合）</span><strong>{yen(calculatedFee)}</strong></div><div><span>出品者の受取額の目安</span><strong>{yen(feeAmount - calculatedFee)}</strong></div></div><p>税・決済手数料・運搬費はこの試算に含みません。<br />売上や利益を保証するものではありません。</p></div></section>
      <section className="seller-cta container"><div><span className="mini-eyebrow">NOT THE END. THE NEXT.</span><h2>あなたの什器にも、<br className="mobile-only" />まだ続きがあります。</h2><p>展示会の前から、次の引き継ぎを準備しませんか。</p></div><button className="button button-lime" onClick={() => openModal("create")}><Plus size={19} />出品の下書きを作る</button></section>
    </main>
    <footer className="site-footer container"><div className="footer-top"><a className="brand" href="#"><span className="brand-symbol" aria-hidden="true"><span /><span /></span><span>event<span className="brand-weight">relay</span><span className="brand-period">.</span></span></a><p>展示会の什器を、次の舞台へ。</p><div><a className="text-button" href="/terms">利用条件</a><a className="text-button" href="/privacy">プライバシー</a></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Event Relay</span><span>サービス検証のためのプレビュー版</span></div></footer>
    {toast && <div className="toast" role="status"><CheckCircle2 size={18} />{toast}</div>}
    {selected && <Modal title="什器の詳細" onClose={() => setSelected(null)} wide><ListingDetail listing={selected} session={session} saved={favorites.includes(selected.id)} onFavorite={() => favorite(selected.id)} /></Modal>}
    {modal === "create" && <Modal title="什器の出品を準備する" onClose={() => setModal(null)} wide><ListingForm session={session} onSaved={() => setToast("下書きをサーバーに保存しました")} /></Modal>}
    {modal === "account" && <Modal title="マイページ" onClose={() => setModal(null)} wide><Account session={session} onCreate={() => setModal("create")} onView={listing => { setModal(null); setSelected(listing); }} /></Modal>}

  </>;
}
