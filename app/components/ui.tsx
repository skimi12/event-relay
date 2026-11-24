"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X, AlertCircle, Loader2 } from "lucide-react";

export function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.showModal();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return <dialog ref={ref} className={`modal ${wide ? "modal-wide" : ""}`} aria-labelledby={titleId} onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="modal-inner">
      <header className="modal-header"><h2 id={titleId}>{title}</h2><button className="icon-button" aria-label="閉じる" onClick={onClose}><X size={22} /></button></header>
      {children}
    </div>
  </dialog>;
}

export function ErrorNotice({ message }: { message: string }) {
  return <div className="notice notice-error" role="alert"><AlertCircle size={20} /><span>{message}</span></div>;
}

export function Loading({ label = "読み込み中" }: { label?: string }) {
  return <div className="loading" role="status"><Loader2 size={20} className="spin" /><span>{label}</span></div>;
}

export function SignInPrompt({ description = "ログインすると、出品の下書きを保存できます。" }: { description?: string }) {
  return <div className="sign-in-panel"><span className="mini-eyebrow">YOUR NEXT RELAY</span><h3>続きは、あなたのアカウントで。</h3><p>{description}</p><a className="button button-dark" href="/signin-with-chatgpt?return_to=%2F" target="_top">ChatGPTでログイン</a><p className="small-muted">本人確認を伴う企業審査ではありません。</p></div>;
}

export async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options, headers: { ...(options.body && typeof options.body === "string" ? { "Content-Type": "application/json" } : {}), ...options.headers } });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) { const message = data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : "処理を完了できませんでした。時間をおいて再度お試しください。"; throw new Error(message); }
  return data as T;
}
