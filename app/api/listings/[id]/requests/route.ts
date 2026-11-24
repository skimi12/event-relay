import { database, findListing, json, listingDTO, readBody, requireLive, route, writeIdentity } from "../../../../../lib/api";
import { DomainError, validateRequest } from "../../../../../lib/domain";
export const dynamic = "force-dynamic";
export async function POST(request:Request,context:{params:Promise<{id:string}>}) { return route(async()=>{
  const user=await writeIdentity(request); const {id}=await context.params;
  if(id.startsWith("demo-")) throw new DomainError("サンプル品への申込みはできません。","DEMO_LISTING",409);
  requireLive(); const listing=await findListing(id);
  if(listing.owner_id===user.userId) throw new DomainError("自分の出品には申し込めません。","OWN_LISTING",409);
  const input=validateRequest(await readBody(request),listingDTO(listing)); const db=database(); const now=new Date().toISOString();
  const duplicate=await db.prepare("SELECT id FROM requests WHERE listing_id=? AND buyer_id=?").bind(id,user.userId).first();
  if(duplicate) throw new DomainError("この出品にはすでに申込み済みです。マイページで確認してください。","DUPLICATE_REQUEST",409);
  const count=await db.prepare("SELECT COUNT(*) AS count FROM requests WHERE buyer_id=? AND created_at>?").bind(user.userId,new Date(Date.now()-86400000).toISOString()).first<{count:number}>();
  if((count?.count??0)>=30) throw new DomainError("1日あたりの申込み上限に達しました。","LIMIT_REACHED",429);
  const requestId=crypto.randomUUID();
  const result=await db.prepare("INSERT OR IGNORE INTO requests (id,listing_id,buyer_id,buyer_email,buyer_company,message,pickup_at,status,conditions_accepted_at,created_at,updated_at) SELECT ?,id,?,?,?,?,?,'pending',?,?,? FROM listings WHERE id=? AND status='published' AND pickup_end>? AND owner_id<>?").bind(requestId,user.userId,user.email,input.companyName,input.message,input.pickupAt,now,now,now,id,now,user.userId).run();
  if(!result.meta.changes) throw new DomainError("出品状態が変更されたか、申込み済みです。","CONFLICT",409);
  return json({request:{id:requestId,listingId:id,listingTitle:listing.title,buyerCompany:input.companyName,message:input.message,pickupAt:input.pickupAt,status:"pending",createdAt:now}},201);
}); }
