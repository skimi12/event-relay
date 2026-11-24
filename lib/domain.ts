/** Public product contracts and side-effect-free marketplace rules. All money is JPY. */
export const CATEGORIES = ["display", "shelf", "furniture", "decor"] as const;
export const CONDITIONS = ["like-new", "good", "used"] as const;
export const TRANSPORT = ["car", "van", "truck", "hand"] as const;
export const DISASSEMBLY = ["required", "optional", "none"] as const;
export type ListingStatus = "draft" | "published" | "reserved" | "completed" | "withdrawn";
export type RequestStatus = "pending" | "accepted" | "rejected" | "cancelled" | "completed";
export type Listing = {
  id: string; title: string; category: typeof CATEGORIES[number]; priceJPY: number;
  quantity: number; widthCm: number; depthCm: number; heightCm: number; weightKg: number;
  condition: typeof CONDITIONS[number]; venue: string; addressArea: string;
  pickupStart: string; pickupEnd: string; description: string;
  transport: typeof TRANSPORT[number]; disassembly: typeof DISASSEMBLY[number];
  imageUrl: string; companyName: string; status: ListingStatus; isDemo: boolean; createdAt: string;
};
export type CreateListingInput = Omit<Listing, "id" | "status" | "isDemo" | "createdAt" | "imageUrl"> & {
  imageUrl?: string; rightsConfirmed: boolean; termsAccepted: boolean; pickupRulesConfirmed: boolean;
};
export type RelayRequest = {
  id: string; listingId: string; listingTitle: string; buyerCompany: string; message: string;
  pickupAt: string; status: RequestStatus; createdAt: string; contactEmail?: string;
};
export type RequestInput = { companyName: string; message: string; pickupAt: string; conditionsAccepted: boolean };
export class DomainError extends Error {
  readonly status: number; readonly code: string;
  constructor(message: string, code = "INVALID_INPUT", status = 400) { super(message); this.status = status; this.code = code; }
}
function object(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new DomainError("入力内容を確認してください。");
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, min: number, max: number): string {
  if (typeof value !== "string") throw new DomainError(`${label}を入力してください。`);
  const result = value.trim();
  if (result.length < min || result.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(result)) throw new DomainError(`${label}は${min}〜${max}文字で入力してください。`);
  return result;
}
function number(value: unknown, label: string, min: number, max: number, integer = false): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) throw new DomainError(`${label}の数値を確認してください。`);
  return value;
}
function enumeration<T extends string>(value: unknown, values: readonly T[], label: string): T {
  if (typeof value !== "string" || !values.includes(value as T)) throw new DomainError(`${label}を選択してください。`);
  return value as T;
}
export function parseTimestamp(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-]\d\d:\d\d)$/.test(value) || !Number.isFinite(Date.parse(value))) throw new DomainError(`${label}を正しい日時で指定してください。`);
  const [year, month, day, hour, minute] = [value.slice(0,4),value.slice(5,7),value.slice(8,10),value.slice(11,13),value.slice(14,16)].map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth || hour > 23 || minute > 59) throw new DomainError(`${label}を実在する日時で指定してください。`);
  return new Date(value).toISOString();
}
export function validateListing(value: unknown, now = Date.now()): CreateListingInput {
  const v = object(value);
  if (v.rightsConfirmed !== true) throw new DomainError("所有権または譲渡権限をご確認ください。", "RIGHTS_REQUIRED");
  if (v.termsAccepted !== true || v.pickupRulesConfirmed !== true) throw new DomainError("利用条件と搬出条件の確認が必要です。", "CONSENT_REQUIRED");
  const pickupStart = parseTimestamp(v.pickupStart, "引渡開始");
  const pickupEnd = parseTimestamp(v.pickupEnd, "引渡終了");
  if (Date.parse(pickupEnd) <= Date.parse(pickupStart)) throw new DomainError("引渡終了は開始より後にしてください。");
  if (Date.parse(pickupEnd) <= now) throw new DomainError("引渡期限が過ぎています。", "EXPIRED");
  if (Date.parse(pickupEnd) > now + 366 * 86400000) throw new DomainError("引渡日は1年以内で指定してください。");
  const imageUrl = typeof v.imageUrl === "string" ? v.imageUrl : "";
  if (imageUrl && !/^\/api\/photos\/[a-zA-Z0-9_-]{10,80}$/.test(imageUrl)) throw new DomainError("写真をアップロードし直してください。", "INVALID_PHOTO");
  return {
    title: text(v.title, "商品名", 3, 100), category: enumeration(v.category, CATEGORIES, "カテゴリ"),
    priceJPY: number(v.priceJPY, "価格", 0, 10000000, true), quantity: number(v.quantity, "個数", 1, 1000, true),
    widthCm: number(v.widthCm, "幅", 0.1, 2000), depthCm: number(v.depthCm, "奥行", 0.1, 2000), heightCm: number(v.heightCm, "高さ", 0.1, 2000),
    weightKg: number(v.weightKg, "重量", 0.1, 5000), condition: enumeration(v.condition, CONDITIONS, "状態"),
    venue: text(v.venue, "引渡場所", 2, 120), addressArea: text(v.addressArea, "所在地", 2, 120), pickupStart, pickupEnd,
    description: text(v.description, "説明", 10, 4000), transport: enumeration(v.transport, TRANSPORT, "必要な運搬手段"),
    disassembly: enumeration(v.disassembly, DISASSEMBLY, "解体条件"), imageUrl,
    companyName: text(v.companyName, "企業名", 2, 100), rightsConfirmed: true, termsAccepted: true, pickupRulesConfirmed: true,
  };
}
export function validateRequest(value: unknown, listing: Pick<Listing, "pickupStart" | "pickupEnd" | "status" | "isDemo">, now = Date.now()): RequestInput {
  if (listing.isDemo) throw new DomainError("サンプル品への申込みはできません。", "DEMO_LISTING", 409);
  if (listing.status !== "published") throw new DomainError("現在この出品には申し込めません。", "LISTING_UNAVAILABLE", 409);
  const v = object(value);
  if (v.conditionsAccepted !== true) throw new DomainError("引渡しと運搬条件に同意してください。", "CONSENT_REQUIRED");
  const pickupAt = parseTimestamp(v.pickupAt, "希望引渡日時");
  const time = Date.parse(pickupAt);
  if (Date.parse(listing.pickupEnd) <= now) throw new DomainError("引渡期限が過ぎています。", "EXPIRED", 409);
  if (time < now || time < Date.parse(listing.pickupStart) || time > Date.parse(listing.pickupEnd)) throw new DomainError("出品者の引渡可能時間内の、これからの日時を指定してください。", "PICKUP_OUTSIDE_WINDOW");
  return { companyName: text(v.companyName, "企業名", 2, 100), message: text(v.message, "メッセージ", 5, 2000), pickupAt, conditionsAccepted: true };
}
/** Indicative service fee only. No billing integration is enabled in this release. */
export function calculateFee(priceJPY: number, rateBps = 1000): { priceJPY: number; feeJPY: number; sellerNetJPY: number; rateBps: number } {
  number(priceJPY, "価格", 0, 10000000, true); number(rateBps, "料率", 0, 10000, true);
  const feeJPY = Math.floor(priceJPY * rateBps / 10000);
  return { priceJPY, feeJPY, sellerNetJPY: priceJPY - feeJPY, rateBps };
}
export function marketplaceMode(config: { MARKETPLACE_LIVE?: string; OPERATOR_NAME?: string; OPERATOR_CONTACT?: string }): "preview" | "live" {
  return config.MARKETPLACE_LIVE === "true" && Boolean(config.OPERATOR_NAME?.trim()) && Boolean(config.OPERATOR_CONTACT?.trim()) ? "live" : "preview";
}
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) throw new DomainError("別のサイトからの操作は受け付けられません。", "INVALID_ORIGIN", 403);
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") throw new DomainError("このページから再度操作してください。", "INVALID_ORIGIN", 403);
}
export function detectImageType(bytes: Uint8Array): "image/png" | "image/jpeg" | "image/webp" | null {
  if (bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n)) return "image/png";
  if (bytes.length >= 4 && bytes[0]===255 && bytes[1]===216 && bytes[2]===255) return "image/jpeg";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP") return "image/webp";
  return null;
}
