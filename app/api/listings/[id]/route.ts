import { getChatGPTUser } from "../../../chatgpt-auth";
import { assertOwner, assertPhotoOwner, database, findListing, json, listingDTO, mode, readBody, requireLive, route, TERMS_VERSION, writeIdentity } from "../../../../lib/api";
import { DomainError, validateListing } from "../../../../lib/domain";
import { SAMPLE_LISTINGS } from "../../../../lib/sample-data";
export const dynamic = "force-dynamic";
type Context = {params:Promise<{id:string}>};
export async function GET(_request:Request,context:Context) { return route(async()=>{
  const {id}=await context.params; const sample=SAMPLE_LISTINGS.find(item=>item.id===id);
  if(sample && mode()==="preview") return json({listing:sample});
  const row=await findListing(id); const user=await getChatGPTUser();
  if(row.owner_id!==user?.userId && (mode()!=="live" || !["published","reserved","completed"].includes(row.status))) throw new DomainError("出品が見つかりません。","NOT_FOUND",404);
  return json({listing:listingDTO(row)});
}); }
export async function PATCH(request:Request,context:Context) { return route(async()=>{
  const user=await writeIdentity(request); const {id}=await context.params; const row=await findListing(id); assertOwner(row,user);
  const body=await readBody(request); const db=database(); const now=new Date().toISOString();
  if(body.action==="update") {
    if(row.status!=="draft") throw new DomainError("編集できるのは下書きのみです。","INVALID_STATE",409);
    const input=validateListing(body); await assertPhotoOwner(input.imageUrl,user);
    const result=await db.prepare("UPDATE listings SET title=?,category=?,price_jpy=?,quantity=?,width_cm=?,depth_cm=?,height_cm=?,weight_kg=?,condition=?,venue=?,address_area=?,pickup_start=?,pickup_end=?,description=?,transport=?,disassembly=?,image_url=?,company_name=?,rights_confirmed_at=?,terms_version=?,updated_at=? WHERE id=? AND owner_id=? AND status='draft'").bind(input.title,input.category,input.priceJPY,input.quantity,input.widthCm,input.depthCm,input.heightCm,input.weightKg,input.condition,input.venue,input.addressArea,input.pickupStart,input.pickupEnd,input.description,input.transport,input.disassembly,input.imageUrl||"",input.companyName,now,TERMS_VERSION,now,id,user.userId).run();
    if(!result.meta.changes) throw new DomainError("出品状態が変更されました。再読み込みしてください。","CONFLICT",409);
  } else if(body.action==="publish") {
    requireLive();
    if(!row.image_url) throw new DomainError("掲載前に商品の写真を追加してください。","PHOTO_REQUIRED");
    const result=await db.prepare("UPDATE listings SET status='published',updated_at=? WHERE id=? AND owner_id=? AND status='draft' AND pickup_end>?").bind(now,id,user.userId,now).run();
    if(!result.meta.changes) throw new DomainError("掲載できない状態または引渡期限切れです。","INVALID_STATE",409);
  } else if(body.action==="withdraw") {
    const result=await db.batch([
      db.prepare("UPDATE listings SET status='withdrawn',updated_at=? WHERE id=? AND owner_id=? AND status IN ('draft','published')").bind(now,id,user.userId),
      db.prepare("UPDATE requests SET status='rejected',updated_at=? WHERE listing_id=? AND status='pending' AND EXISTS(SELECT 1 FROM listings WHERE id=? AND status='withdrawn')").bind(now,id,id),
    ]);
    if(!result[0].meta.changes) throw new DomainError("予約済みの出品は先に予約を解消してください。","INVALID_STATE",409);
  } else if(body.action==="completed") {
    requireLive();
    const result=await db.batch([
      db.prepare("UPDATE listings SET status='completed',updated_at=? WHERE id=? AND owner_id=? AND status='published'").bind(now,id,user.userId),
      db.prepare("UPDATE requests SET status='rejected',updated_at=? WHERE listing_id=? AND status='pending' AND EXISTS(SELECT 1 FROM listings WHERE id=? AND status='completed')").bind(now,id,id),
    ]);
    if(!result[0].meta.changes) throw new DomainError("予約がある場合は該当申込みから引渡完了にしてください。","INVALID_STATE",409);
  } else throw new DomainError("指定された操作はできません。");
  return json({listing:listingDTO(await findListing(id))});
}); }
