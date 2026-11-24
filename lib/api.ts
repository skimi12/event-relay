import { env } from "cloudflare:workers";
import { getChatGPTUser, type ChatGPTUser } from "../app/chatgpt-auth";
import { assertSameOrigin, DomainError, marketplaceMode, type Listing, type RelayRequest } from "./domain";

export const TERMS_VERSION = "preview-2026-11-25";
export function database(): D1Database {
  if (!env.DB) throw new DomainError("保存機能の準備ができていません。しばらくして再度お試しください。", "STORAGE_UNAVAILABLE", 503);
  return env.DB;
}
export function mode(): "preview" | "live" { return marketplaceMode(env); }
export function requireLive(): void {
  if (mode() !== "live") throw new DomainError("現在は公開プレビューです。出品は下書き保存でき、本掲載と取引は準備中です。", "PREVIEW_ONLY", 409);
}
export async function authenticated(): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (!user) throw new DomainError("ログインしてから操作してください。", "AUTH_REQUIRED", 401);
  return user;
}
export function canCreateDraft(user: ChatGPTUser | null): boolean {
  if (!user) return false;
  if (mode() === "live") return true;
  const owner = env.PREVIEW_OWNER_EMAIL?.trim().toLowerCase();
  return Boolean(owner && user.email.trim().toLowerCase() === owner);
}
export async function writeIdentity(request: Request): Promise<ChatGPTUser> {
  assertSameOrigin(request);
  const user = await authenticated();
  if (!canCreateDraft(user)) throw new DomainError("出品機能は準備中です。現在は運営者による動作確認のみ受け付けています。", "PREVIEW_RESTRICTED", 403);
  return user;
}
export async function readBody(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new DomainError("JSON形式で送信してください。", "INVALID_CONTENT_TYPE", 415);
  const raw = await readLimitedBody(request, 20 * 1024);
  try { const value = JSON.parse(new TextDecoder().decode(raw)); if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(); return value; }
  catch { throw new DomainError("送信内容を読み取れませんでした。", "INVALID_JSON"); }
}
export async function readLimitedBody(request: Request, limit: number): Promise<Uint8Array> {
  const length = request.headers.get("content-length");
  if (length && Number(length) > limit) throw new DomainError("送信サイズが上限を超えています。", "PAYLOAD_TOO_LARGE", 413);
  if (!request.body) throw new DomainError("送信内容が空です。");
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  try { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > limit) { await reader.cancel(); throw new DomainError("送信サイズが上限を超えています。", "PAYLOAD_TOO_LARGE", 413); } chunks.push(value); } }
  finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; } return bytes;
}
export function json(value: unknown, status = 200): Response {
  return Response.json(value, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Vary": "Cookie, oai-authenticated-user-id" } });
}
export async function route(action: ()=>Promise<Response>): Promise<Response> {
  try { return await action(); } catch (error) {
    if (error instanceof DomainError) return json({ error: error.message, code: error.code }, error.status);
    // Do not expose SQL, tokens, contact details, or request bodies in responses or logs.
    console.error("Event Relay API failure", error instanceof Error ? error.name : "UnknownError");
    return json({ error: "処理を完了できませんでした。時間をおいて再度お試しください。", code: "INTERNAL_ERROR" }, 500);
  }
}
export type ListingRow = {
  id:string; owner_id:string; owner_email:string; title:string; category:Listing["category"]; price_jpy:number; quantity:number;
  width_cm:number; depth_cm:number; height_cm:number; weight_kg:number; condition:Listing["condition"]; venue:string; address_area:string;
  pickup_start:string; pickup_end:string; description:string; transport:Listing["transport"]; disassembly:Listing["disassembly"];
  image_url:string; company_name:string; status:Listing["status"]; reserved_request_id:string|null; created_at:string; updated_at:string;
};
export function listingDTO(row: ListingRow): Listing {
  return { id:row.id,title:row.title,category:row.category,priceJPY:row.price_jpy,quantity:row.quantity,widthCm:row.width_cm,depthCm:row.depth_cm,heightCm:row.height_cm,weightKg:row.weight_kg,condition:row.condition,venue:row.venue,addressArea:row.address_area,pickupStart:row.pickup_start,pickupEnd:row.pickup_end,description:row.description,transport:row.transport,disassembly:row.disassembly,imageUrl:row.image_url,companyName:row.company_name,status:row.status,isDemo:false,createdAt:row.created_at };
}
export async function findListing(id: string): Promise<ListingRow> {
  const row = await database().prepare("SELECT * FROM listings WHERE id = ?").bind(id).first<ListingRow>();
  if (!row) throw new DomainError("出品が見つかりません。", "NOT_FOUND", 404);
  return row;
}
export function assertOwner(row: ListingRow, user: ChatGPTUser): void {
  if (row.owner_id !== user.userId) throw new DomainError("この出品は操作できません。", "FORBIDDEN", 403);
}
export async function assertPhotoOwner(imageUrl: string | undefined, user: ChatGPTUser): Promise<void> {
  if (!imageUrl) return;
  const photo = await database().prepare("SELECT owner_id FROM photos WHERE id = ?").bind(imageUrl.split("/").at(-1)).first<{owner_id:string}>();
  if (!photo || photo.owner_id !== user.userId) throw new DomainError("利用できない写真です。アップロードし直してください。", "INVALID_PHOTO", 403);
}
export type RequestRow = {
 id:string;listing_id:string;buyer_id:string;buyer_email:string;buyer_company:string;message:string;pickup_at:string;status:RelayRequest["status"];created_at:string;owner_id:string;owner_email:string;listing_title:string;
};
export function requestDTO(row: RequestRow, userId: string): RelayRequest {
  const dto: RelayRequest = {id:row.id,listingId:row.listing_id,listingTitle:row.listing_title,buyerCompany:row.buyer_company,message:row.message,pickupAt:row.pickup_at,status:row.status,createdAt:row.created_at};
  if (row.status === "accepted" || row.status === "completed") dto.contactEmail = row.buyer_id === userId ? row.owner_email : row.buyer_email;
  return dto;
}
export const REQUEST_JOIN = "SELECT r.*, l.owner_id, l.owner_email, l.title AS listing_title FROM requests r JOIN listings l ON l.id = r.listing_id";
