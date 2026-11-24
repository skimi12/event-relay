import { authenticated, database, json, listingDTO, REQUEST_JOIN, requestDTO, route, type ListingRow, type RequestRow } from "../../../lib/api";
export const dynamic = "force-dynamic";
export async function GET() { return route(async()=>{
  const user=await authenticated(); const db=database();
  const [listings,incoming,outgoing]=await Promise.all([
    db.prepare("SELECT * FROM listings WHERE owner_id = ? ORDER BY created_at DESC LIMIT 100").bind(user.userId).all<ListingRow>(),
    db.prepare(`${REQUEST_JOIN} WHERE l.owner_id = ? ORDER BY r.created_at DESC LIMIT 100`).bind(user.userId).all<RequestRow>(),
    db.prepare(`${REQUEST_JOIN} WHERE r.buyer_id = ? ORDER BY r.created_at DESC LIMIT 100`).bind(user.userId).all<RequestRow>(),
  ]);
  return json({listings:listings.results.map(listingDTO),incoming:incoming.results.map(row=>requestDTO(row,user.userId)),outgoing:outgoing.results.map(row=>requestDTO(row,user.userId))});
}); }
