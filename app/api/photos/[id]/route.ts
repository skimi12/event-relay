import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { database, json, mode, route, writeIdentity } from "../../../../lib/api";
import { DomainError } from "../../../../lib/domain";
export const dynamic = "force-dynamic";
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,context:Context) { return route(async()=>{
  const {id}=await context.params; const db=database();
  const photo=await db.prepare("SELECT owner_id,content_type FROM photos WHERE id=?").bind(id).first<{owner_id:string;content_type:string}>();
  if(!photo) throw new DomainError("写真が見つかりません。","NOT_FOUND",404);
  const publicUse=mode()==="live" ? await db.prepare("SELECT id FROM listings WHERE image_url=? AND status IN ('published','reserved','completed') LIMIT 1").bind(`/api/photos/${id}`).first() : null;
  if(!publicUse) { const user=await getChatGPTUser(); if(user?.userId!==photo.owner_id) throw new DomainError("写真が見つかりません。","NOT_FOUND",404); }
  const file=await env.BUCKET?.get(`photos/${id}`);
  if(!file) throw new DomainError("写真が見つかりません。","NOT_FOUND",404);
  return new Response(file.body,{headers:{"Content-Type":photo.content_type,"Content-Length":String(file.size),"X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; sandbox","Cache-Control":"private, no-store","Content-Disposition":"inline"}});
}); }
export async function DELETE(request:Request,context:Context) { return route(async()=>{
  const user=await writeIdentity(request); const {id}=await context.params; const db=database();
  const photo=await db.prepare("SELECT owner_id FROM photos WHERE id=?").bind(id).first<{owner_id:string}>();
  if(!photo || photo.owner_id!==user.userId) throw new DomainError("写真が見つかりません。","NOT_FOUND",404);
  const result=await db.prepare("DELETE FROM photos WHERE id=? AND owner_id=? AND NOT EXISTS(SELECT 1 FROM listings WHERE image_url=?)").bind(id,user.userId,`/api/photos/${id}`).run();
  if(!result.meta.changes) throw new DomainError("出品で使用中の写真は削除できません。","PHOTO_IN_USE",409);
  await env.BUCKET?.delete(`photos/${id}`);
  return json({deleted:true});
}); }
