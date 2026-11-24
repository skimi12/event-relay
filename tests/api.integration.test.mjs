/** Runs the real API handlers against SQLite, without using or weakening production auth. */
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { build } from "esbuild";

const ORIGIN="https://event-relay.test";
const seller={userId:"seller-1",email:"seller@example.test",displayName:"Seller",fullName:null};
const buyerA={userId:"buyer-a",email:"buyer-a@example.test",displayName:"Buyer A",fullName:null};
const buyerB={userId:"buyer-b",email:"buyer-b@example.test",displayName:"Buyer B",fullName:null};
const outsider={userId:"outsider",email:"outsider@example.test",displayName:"Outsider",fullName:null};
globalThis.__relayTestEnv={}; globalThis.__relayTestUser=null;
const sourceRoot=resolve(import.meta.dirname,"..");
const entries={session:"app/api/session/route.ts",listings:"app/api/listings/route.ts",listing:"app/api/listings/[id]/route.ts",requestCreate:"app/api/listings/[id]/requests/route.ts",requestUpdate:"app/api/requests/[id]/route.ts",account:"app/api/account/route.ts",photos:"app/api/photos/route.ts",photo:"app/api/photos/[id]/route.ts"};
const bundled=await build({stdin:{contents:Object.entries(entries).map(([name,path])=>`export * as ${name} from ${JSON.stringify(resolve(sourceRoot,path))};`).join("\n"),resolveDir:sourceRoot,loader:"ts"},bundle:true,platform:"node",format:"esm",write:false,plugins:[{
  name:"test-only-platform-boundary",
  setup(b){
    b.onResolve({filter:/^cloudflare:workers$/},()=>({path:"cloudflare",namespace:"test-boundary"}));
    b.onResolve({filter:/chatgpt-auth$/},()=>({path:"auth",namespace:"test-boundary"}));
    b.onLoad({filter:/.*/,namespace:"test-boundary"},({path})=>({contents:path==="cloudflare"?"export const env=globalThis.__relayTestEnv;":"export function getChatGPTUser(){return Promise.resolve(globalThis.__relayTestUser);}",loader:"js"}));
  }
}]});
const api=await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);
class Prepared {
  constructor(db,sql,values=[]){this.db=db;this.sql=sql;this.values=values;}
  bind(...values){return new Prepared(this.db,this.sql,values);}
  async first(column){const row=this.db.prepare(this.sql).get(...this.values);return row?(column?row[column]:row):null;}
  async all(){return{results:this.db.prepare(this.sql).all(...this.values),success:true};}
  runSync(){const result=this.db.prepare(this.sql).run(...this.values);return{success:true,meta:{changes:Number(result.changes)}};}
  async run(){return this.runSync();}
}
let sqlite;
function reset(live=false){
  sqlite?.close();sqlite=new DatabaseSync(":memory:");sqlite.exec("PRAGMA foreign_keys=ON");
  for(const file of readdirSync(resolve(sourceRoot,"drizzle")).filter(x=>x.endsWith(".sql")).sort()) sqlite.exec(readFileSync(resolve(sourceRoot,"drizzle",file),"utf8"));
  const files=new Map();
  const db={prepare:(sql)=>new Prepared(sqlite,sql),async batch(statements){sqlite.exec("BEGIN");try{const results=statements.map(s=>s.runSync());sqlite.exec("COMMIT");return results;}catch(error){sqlite.exec("ROLLBACK");throw error;}}};
  const bucket={async put(key,data,options){files.set(key,{data:new Uint8Array(data),options});},async get(key){const file=files.get(key);return file?{body:new Response(file.data).body,size:file.data.length}:null;},async delete(key){files.delete(key);}};
  Object.keys(globalThis.__relayTestEnv).forEach(k=>delete globalThis.__relayTestEnv[k]);
  Object.assign(globalThis.__relayTestEnv,{DB:db,BUCKET:bucket,MARKETPLACE_LIVE:live?"true":"false",OPERATOR_NAME:live?"Test operator":"",OPERATOR_CONTACT:live?"contact@example.test":""});
  globalThis.__relayTestUser=null;
}
function use(user){globalThis.__relayTestUser=user;}
function context(id){return{params:Promise.resolve({id})};}
function req(path,method="GET",body,headers={}){return new Request(`${ORIGIN}${path}`,{method,headers:{...(method!=="GET"?{Origin:ORIGIN,"Content-Type":"application/json"}:{}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});}
function input(){const start=Date.now()+7*86400000;return {title:"テスト展示台",category:"display",priceJPY:20000,quantity:3,widthCm:45,depthCm:45,heightCm:90,weightKg:12,condition:"good",venue:"テスト展示会場",addressArea:"東京都江東区",pickupStart:new Date(start).toISOString(),pickupEnd:new Date(start+7200000).toISOString(),description:"所有する展示台です。搬出許可と運搬人数を確認します。",transport:"van",disassembly:"none",companyName:"テスト出展企業",rightsConfirmed:true,termsAccepted:true,pickupRulesConfirmed:true};}
async function createDraft(){use(seller);const response=await api.listings.POST(req("/api/listings","POST",input()));assert.equal(response.status,201,await response.clone().text());return(await response.json()).listing;}
async function uploadPhoto(){const response=await api.photos.POST(new Request(`${ORIGIN}/api/photos`,{method:"POST",headers:{Origin:ORIGIN,"Content-Type":"image/png"},body:new Uint8Array([137,80,78,71,13,10,26,10])}));assert.equal(response.status,201);return(await response.json()).imageUrl;}
async function published(){const photo=await uploadPhoto();const draft=await createDraft();const payload={...input(),imageUrl:photo,action:"update"};const update=await api.listing.PATCH(req(`/api/listings/${draft.id}`,"PATCH",payload),context(draft.id));assert.equal(update.status,200);const response=await api.listing.PATCH(req(`/api/listings/${draft.id}`,"PATCH",{action:"publish"}),context(draft.id));assert.equal(response.status,200,await response.clone().text());return(await response.json()).listing;}
async function requestFor(listing,user){use(user);const response=await api.requestCreate.POST(req(`/api/listings/${listing.id}/requests`,"POST",{companyName:"テスト受取企業",message:"軽バンと2名で運びます。",pickupAt:new Date(Date.parse(listing.pickupStart)+3600000).toISOString(),conditionsAccepted:true}),context(listing.id));assert.equal(response.status,201,await response.clone().text());return(await response.json()).request;}
after(()=>sqlite?.close());

test("listing capacity remains 30 when several saves arrive together and released capacity is reusable",async()=>{
  reset(true);use(seller);
  const responses=await Promise.all(Array.from({length:35},()=>api.listings.POST(req("/api/listings","POST",input()))));
  assert.equal(responses.filter(r=>r.status===201).length,30);
  assert.equal(responses.filter(r=>r.status===429).length,5);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM listings").get().n,30);
  const first=sqlite.prepare("SELECT id FROM listings LIMIT 1").get();
  assert.equal((await api.listing.PATCH(req(`/api/listings/${first.id}`,"PATCH",{action:"withdraw"}),context(first.id))).status,200);
  assert.equal((await api.listings.POST(req("/api/listings","POST",input()))).status,201);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM listings WHERE status NOT IN ('completed','withdrawn')").get().n,30);
});

test("daily request capacity is atomic and becomes available after the window expires",async()=>{
  reset(true);
  const start=new Date(Date.now()+7*86400000).toISOString();const end=new Date(Date.parse(start)+7200000).toISOString();const now=new Date().toISOString();
  // Test fixtures only: independent listings, so the per-listing uniqueness rule does not mask the daily limit.
  for(let i=0;i<35;i++)sqlite.prepare("INSERT INTO listings(id,owner_id,owner_email,title,category,price_jpy,quantity,width_cm,depth_cm,height_cm,weight_kg,condition,venue,address_area,pickup_start,pickup_end,description,transport,disassembly,image_url,company_name,status,rights_confirmed_at,terms_version,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(`capacity-${i}`,seller.userId,seller.email,"展示台","display",1000,1,10,10,10,1,"good","会場","東京",start,end,"テスト用展示台","van","none","","企業","published",now,"test",now,now);
  use(buyerA);
  const submit=i=>api.requestCreate.POST(req(`/api/listings/capacity-${i}/requests`,"POST",{companyName:"テスト受取企業",message:"軽バンと2名で運びます。",pickupAt:new Date(Date.parse(start)+3600000).toISOString(),conditionsAccepted:true}),context(`capacity-${i}`));
  const responses=await Promise.all(Array.from({length:35},(_,i)=>submit(i)));
  assert.equal(responses.filter(r=>r.status===201).length,30);
  assert.equal(responses.filter(r=>r.status===429).length,5);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM requests").get().n,30);
  const rejected=responses.findIndex(r=>r.status===429);
  sqlite.prepare("UPDATE requests SET created_at=?").run(new Date(Date.now()-25*3600000).toISOString());
  assert.equal((await submit(rejected)).status,201);
});

test("anonymous writes are rejected and a stranger cannot collect data in preview",async()=>{
  reset();
  let response=await api.listings.POST(req("/api/listings","POST",input()));assert.equal(response.status,401);
  use(outsider);response=await api.listings.POST(req("/api/listings","POST",input()));assert.equal(response.status,403);assert.equal((await response.json()).code,"PREVIEW_RESTRICTED");
  const session=await(await api.session.GET()).json();assert.equal(session.canCreateDraft,false);assert.equal(session.fees.enabled,false);assert.equal("PREVIEW_OWNER_EMAIL" in session,false);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM listings").get().n,0);
});
test("preview owner can persist a draft but cannot publish it; public sees only samples",async()=>{
  reset();globalThis.__relayTestEnv.PREVIEW_OWNER_EMAIL=seller.email;const listing=await createDraft();
  assert.equal((await(await api.session.GET()).json()).canCreateDraft,true);
  assert.equal(listing.status,"draft");assert.equal("ownerId" in listing,false);assert.equal("ownerEmail" in listing,false);
  const publish=await api.listing.PATCH(req(`/api/listings/${listing.id}`,"PATCH",{action:"publish"}),context(listing.id));assert.equal(publish.status,409);assert.equal((await publish.json()).code,"PREVIEW_ONLY");
  use(null);const publicData=await(await api.listings.GET()).json();assert.equal(publicData.mode,"preview");assert.equal(publicData.listings.length,6);assert.ok(publicData.listings.every(x=>x.isDemo));assert.ok(!publicData.listings.some(x=>x.id===listing.id));
  assert.equal((await api.listing.GET(req(`/api/listings/${listing.id}`),context(listing.id))).status,404);
});
test("drafts and uploaded photos are private; foreign photos cannot be attached",async()=>{
  reset(true);use(seller);const imageUrl=await uploadPhoto();const photoId=imageUrl.split("/").at(-1);const listing=await createDraft();
  use(outsider);assert.equal((await api.listing.GET(req(`/api/listings/${listing.id}`),context(listing.id))).status,404);
  assert.equal((await api.listing.PATCH(req(`/api/listings/${listing.id}`,"PATCH",{action:"withdraw"}),context(listing.id))).status,403);
  assert.equal((await api.photo.GET(req(imageUrl),context(photoId))).status,404);
  const response=await api.listings.POST(req("/api/listings","POST",{...input(),imageUrl}));assert.equal(response.status,403);
  use(seller);assert.equal((await api.photo.GET(req(imageUrl),context(photoId))).status,200);
});
test("duplicate and self requests are rejected; contact emails are not shared before acceptance",async()=>{
  reset(true);use(seller);const listing=await published();
  const own=await api.requestCreate.POST(req(`/api/listings/${listing.id}/requests`,"POST",{}),context(listing.id));assert.equal(own.status,409);assert.equal((await own.json()).code,"OWN_LISTING");
  await requestFor(listing,buyerA);
  const duplicate=await api.requestCreate.POST(req(`/api/listings/${listing.id}/requests`,"POST",{}),context(listing.id));assert.equal(duplicate.status,400); // Invalid input is checked before duplicate lookup.
  const validBody={companyName:"テスト受取企業",message:"軽バンで運びます。",pickupAt:new Date(Date.parse(listing.pickupStart)+3600000).toISOString(),conditionsAccepted:true};
  const repeated=await api.requestCreate.POST(req(`/api/listings/${listing.id}/requests`,"POST",validBody),context(listing.id));assert.equal(repeated.status,409);assert.equal((await repeated.json()).code,"DUPLICATE_REQUEST");
  const outgoing=await(await api.account.GET()).json();assert.equal("contactEmail" in outgoing.outgoing[0],false);
  use(seller);const incoming=await(await api.account.GET()).json();assert.equal("contactEmail" in incoming.incoming[0],false);
});
test("competing approvals reserve exactly one request, reveal contacts only to its parties, and seller can cancel",async()=>{
  reset(true);use(seller);const listing=await published();const a=await requestFor(listing,buyerA);const b=await requestFor(listing,buyerB);use(seller);
  const results=await Promise.all([a,b].map(r=>api.requestUpdate.PATCH(req(`/api/requests/${r.id}`,"PATCH",{action:"accept"}),context(r.id))));
  assert.deepEqual(results.map(x=>x.status).sort(),[200,409]);
  const rows=sqlite.prepare("SELECT id,status FROM requests ORDER BY id").all();assert.equal(rows.filter(r=>r.status==="accepted").length,1);assert.equal(rows.filter(r=>r.status==="rejected").length,1);
  const accepted=rows.find(r=>r.status==="accepted");const winner=accepted.id===a.id?buyerA:buyerB;
  const stored=sqlite.prepare("SELECT status,reserved_request_id FROM listings WHERE id=?").get(listing.id);assert.equal(stored.status,"reserved");assert.equal(stored.reserved_request_id,accepted.id);
  const sellerAccount=await(await api.account.GET()).json();assert.equal(sellerAccount.incoming.find(r=>r.id===accepted.id).contactEmail,winner.email);
  use(winner);assert.equal((await(await api.account.GET()).json()).outgoing[0].contactEmail,seller.email);
  use(outsider);assert.equal((await api.requestUpdate.PATCH(req(`/api/requests/${accepted.id}`,"PATCH",{action:"cancel"}),context(accepted.id))).status,404);
  use(seller);const cancellation=await api.requestUpdate.PATCH(req(`/api/requests/${accepted.id}`,"PATCH",{action:"cancel"}),context(accepted.id));assert.equal(cancellation.status,200);
  assert.equal((await cancellation.json()).request.status,"cancelled");assert.equal(sqlite.prepare("SELECT status FROM listings WHERE id=?").get(listing.id).status,"published");
});
test("complete transitions reservation and request together, and cannot be repeated",async()=>{
  reset(true);use(seller);const listing=await published();const request=await requestFor(listing,buyerA);use(seller);
  assert.equal((await api.requestUpdate.PATCH(req(`/api/requests/${request.id}`,"PATCH",{action:"accept"}),context(request.id))).status,200);
  const complete=()=>api.requestUpdate.PATCH(req(`/api/requests/${request.id}`,"PATCH",{action:"complete"}),context(request.id));
  assert.equal((await complete()).status,200);assert.equal((await complete()).status,409);
  assert.equal(sqlite.prepare("SELECT status FROM listings WHERE id=?").get(listing.id).status,"completed");assert.equal(sqlite.prepare("SELECT status FROM requests WHERE id=?").get(request.id).status,"completed");
});
test("cross-origin writes fail even with a valid owner identity",async()=>{
  reset(true);use(seller);const response=await api.listings.POST(req("/api/listings","POST",input(),{Origin:"https://attacker.test"}));assert.equal(response.status,403);assert.equal((await response.json()).code,"INVALID_ORIGIN");assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM listings").get().n,0);
});
