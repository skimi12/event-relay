import { database, json, listingDTO, mode, readBody, route, writeIdentity, assertPhotoOwner, TERMS_VERSION, type ListingRow } from "../../../lib/api";
import { DomainError, validateListing } from "../../../lib/domain";
import { SAMPLE_LISTINGS } from "../../../lib/sample-data";
export const dynamic = "force-dynamic";
export async function GET() { return route(async()=>{
  if (mode() === "preview") return json({listings:SAMPLE_LISTINGS,mode:"preview"});
  const rows=await database().prepare("SELECT * FROM listings WHERE status = 'published' AND pickup_end > ? ORDER BY created_at DESC LIMIT 100").bind(new Date().toISOString()).all<ListingRow>();
  return json({listings:rows.results.map(listingDTO),mode:"live"});
}); }
export async function POST(request: Request) { return route(async()=>{
  const user=await writeIdentity(request); const input=validateListing(await readBody(request)); await assertPhotoOwner(input.imageUrl,user);
  const db=database();
  const id=crypto.randomUUID(); const now=new Date().toISOString();
  // The limit and write must be one DB statement, including simultaneous requests.
  const inserted=await db.prepare("INSERT INTO listings (id,owner_id,owner_email,title,category,price_jpy,quantity,width_cm,depth_cm,height_cm,weight_kg,condition,venue,address_area,pickup_start,pickup_end,description,transport,disassembly,image_url,company_name,status,rights_confirmed_at,terms_version,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'draft',?,?,?,? WHERE (SELECT COUNT(*) FROM listings WHERE owner_id = ? AND status NOT IN ('completed','withdrawn')) < 30").bind(id,user.userId,user.email,input.title,input.category,input.priceJPY,input.quantity,input.widthCm,input.depthCm,input.heightCm,input.weightKg,input.condition,input.venue,input.addressArea,input.pickupStart,input.pickupEnd,input.description,input.transport,input.disassembly,input.imageUrl||"",input.companyName,now,TERMS_VERSION,now,now,user.userId).run();
  if (!inserted.meta.changes) throw new DomainError("保存できる出品は30件までです。不要な下書きを取り下げてください。", "LIMIT_REACHED", 429);
  const row=await db.prepare("SELECT * FROM listings WHERE id = ?").bind(id).first<ListingRow>();
  return json({listing:listingDTO(row!)},201);
}); }
