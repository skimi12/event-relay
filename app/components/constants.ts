import type { Listing } from "@/lib/domain";

export const categories: Record<Listing["category"], string> = { display: "展示台・カウンター", shelf: "棚・ラック", furniture: "テーブル・チェア", decor: "パネル・装飾" };
export const conditions: Record<Listing["condition"], string> = { "like-new": "未使用に近い", good: "目立つ傷なし", used: "使用感あり" };
export const transportLabels: Record<Listing["transport"], string> = { hand: "手運び", car: "乗用車", van: "バン", truck: "トラック" };
export const disassemblyLabels: Record<Listing["disassembly"], string> = { none: "不要", optional: "解体可能", required: "解体が必要" };
export const statusLabels: Record<Listing["status"], string> = { draft: "下書き", published: "公開中", reserved: "引渡調整中", completed: "引渡完了", withdrawn: "公開停止" };
export const yen = (value: number) => new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(value);
export function shortDate(value: string) { return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", weekday: "short", timeZone: "Asia/Tokyo" }).format(new Date(value)); }
export function timeOf(value: string) { return new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" }).format(new Date(value)); }
export const localJST = (value: string) => new Date(new Date(value).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 16);
export const utcFromJST = (value: string) => new Date(`${value}:00+09:00`).toISOString();
export type Session = { user: null | { id: string; displayName: string }; mode: "preview" | "live"; canCreateDraft: boolean; fees: { rateBps: number; enabled: boolean } };
