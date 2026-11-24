import { database, json, readBody, REQUEST_JOIN, requestDTO, requireLive, route, writeIdentity, type RequestRow } from "../../../../lib/api";
import { DomainError } from "../../../../lib/domain";
export const dynamic = "force-dynamic";
export async function PATCH(request:Request,context:{params:Promise<{id:string}>}) { return route(async()=>{
  const user=await writeIdentity(request); requireLive(); const {id}=await context.params; const db=database();
  const row=await db.prepare(`${REQUEST_JOIN} WHERE r.id=?`).bind(id).first<RequestRow>();
  if(!row || (row.owner_id!==user.userId && row.buyer_id!==user.userId)) throw new DomainError("申込みが見つかりません。","NOT_FOUND",404);
  const body=await readBody(request); const now=new Date().toISOString();
  const isSeller=row.owner_id===user.userId;
  if(body.action==="accept") {
    if(!isSeller) throw new DomainError("出品者のみ承認できます。","FORBIDDEN",403);
    if(row.status!=="pending" || Date.parse(row.pickup_at)<=Date.now()) throw new DomainError("申込み状態または希望日時が変わっています。","INVALID_STATE",409);
    // One D1 transaction. The listing's compare-and-swap picks exactly one request.
    const results=await db.batch([
      db.prepare("UPDATE listings SET status='reserved',reserved_request_id=?,updated_at=? WHERE id=? AND owner_id=? AND status='published' AND pickup_end>? AND EXISTS(SELECT 1 FROM requests WHERE id=? AND status='pending' AND pickup_at>?)").bind(id,now,row.listing_id,user.userId,now,id,now),
      db.prepare("UPDATE requests SET status='accepted',updated_at=? WHERE id=? AND status='pending' AND EXISTS(SELECT 1 FROM listings WHERE id=? AND reserved_request_id=?)").bind(now,id,row.listing_id,id),
      db.prepare("UPDATE requests SET status='rejected',updated_at=? WHERE listing_id=? AND id<>? AND status='pending' AND EXISTS(SELECT 1 FROM listings WHERE id=? AND reserved_request_id=?)").bind(now,row.listing_id,id,row.listing_id,id),
    ]);
    if(!results[0].meta.changes) throw new DomainError("すでに別の申込みが承認されたか、出品が変更されています。","RESERVATION_CONFLICT",409);
  } else if(body.action==="reject") {
    if(!isSeller) throw new DomainError("出品者のみ辞退できます。","FORBIDDEN",403);
    const result=await db.prepare("UPDATE requests SET status='rejected',updated_at=? WHERE id=? AND status='pending'").bind(now,id).run();
    if(!result.meta.changes) throw new DomainError("この申込みは辞退できません。","INVALID_STATE",409);
  } else if(body.action==="cancel") {
    const results=await db.batch([
      db.prepare("UPDATE requests SET status='cancelled',updated_at=? WHERE id=? AND (buyer_id=? OR EXISTS(SELECT 1 FROM listings WHERE id=requests.listing_id AND owner_id=?)) AND status IN ('pending','accepted')").bind(now,id,user.userId,user.userId),
      db.prepare("UPDATE listings SET status=CASE WHEN pickup_end>? THEN 'published' ELSE 'withdrawn' END,reserved_request_id=NULL,updated_at=? WHERE id=? AND reserved_request_id=? AND status='reserved' AND EXISTS(SELECT 1 FROM requests WHERE id=? AND status='cancelled')").bind(now,now,row.listing_id,id,id),
    ]);
    if(!results[0].meta.changes) throw new DomainError("この申込みは取消できません。","INVALID_STATE",409);
  } else if(body.action==="complete") {
    if(!isSeller) throw new DomainError("出品者のみ引渡完了にできます。","FORBIDDEN",403);
    const results=await db.batch([
      db.prepare("UPDATE requests SET status='completed',updated_at=? WHERE id=? AND status='accepted' AND EXISTS(SELECT 1 FROM listings WHERE id=? AND status='reserved' AND reserved_request_id=?)").bind(now,id,row.listing_id,id),
      db.prepare("UPDATE listings SET status='completed',updated_at=? WHERE id=? AND status='reserved' AND reserved_request_id=? AND EXISTS(SELECT 1 FROM requests WHERE id=? AND status='completed')").bind(now,row.listing_id,id,id),
    ]);
    if(!results[0].meta.changes) throw new DomainError("承認済みの申込みだけ引渡完了にできます。","INVALID_STATE",409);
  } else throw new DomainError("指定された操作はできません。");
  const updated=await db.prepare(`${REQUEST_JOIN} WHERE r.id=?`).bind(id).first<RequestRow>();
  return json({request:requestDTO(updated!,user.userId)});
}); }
