import { env } from "cloudflare:workers";
import { database, json, readLimitedBody, route, writeIdentity } from "../../../lib/api";
import { detectImageType, DomainError } from "../../../lib/domain";
export const dynamic = "force-dynamic";
export async function POST(request:Request) { return route(async()=>{
  const user=await writeIdentity(request);
  if(!env.BUCKET) throw new DomainError("写真保存の準備ができていません。","STORAGE_UNAVAILABLE",503);
  const claimed=request.headers.get("content-type")?.split(";")[0].trim();
  if(!["image/jpeg","image/png","image/webp"].includes(claimed||"")) throw new DomainError("JPEG・PNG・WebPを選択してください。","INVALID_IMAGE",415);
  const bytes=await readLimitedBody(request,3*1024*1024); const actual=detectImageType(bytes);
  if(!actual || claimed!==actual) throw new DomainError("写真の形式を確認してください。","INVALID_IMAGE",415);
  const db=database(); const id=crypto.randomUUID(); const now=new Date().toISOString();
  const inserted=await db.prepare("INSERT INTO photos (id,owner_id,content_type,byte_length,created_at) SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM photos WHERE owner_id=?)<30").bind(id,user.userId,actual,bytes.length,now,user.userId).run();
  if(!inserted.meta.changes) throw new DomainError("写真は30枚まで保存できます。不要な写真を削除してください。","LIMIT_REACHED",429);
  try { await env.BUCKET.put(`photos/${id}`,bytes,{httpMetadata:{contentType:actual}}); }
  catch(error) { await db.prepare("DELETE FROM photos WHERE id=? AND owner_id=?").bind(id,user.userId).run(); throw error; }
  return json({imageUrl:`/api/photos/${id}`},201);
}); }
