import test from "node:test";
import assert from "node:assert/strict";
import { assertSameOrigin, calculateFee, detectImageType, DomainError, marketplaceMode, parseTimestamp, validateListing, validateRequest } from "../lib/domain.ts";

const NOW = Date.parse("2026-11-25T00:00:00Z");
const listing = {
  title:"展示台 3台セット",category:"display",priceJPY:20000,quantity:3,widthCm:45,depthCm:45,heightCm:90,weightKg:12,
  condition:"good",venue:"東京ビッグサイト",addressArea:"東京都江東区有明",pickupStart:"2026-12-04T16:00:00+09:00",pickupEnd:"2026-12-04T18:00:00+09:00",
  description:"白い展示台です。運搬と搬出許可は受取側と確認します。",transport:"van",disassembly:"none",companyName:"テスト企業",rightsConfirmed:true,termsAccepted:true,pickupRulesConfirmed:true,
};
const available = { ...listing, status:"published", isDemo:false };
function rejects(callback, code) { assert.throws(callback,error => error instanceof DomainError && (!code || error.code===code)); }

test("価格はロット総額。個数を乗算せず、試算だけを行う",()=>{
  const input=validateListing(listing,NOW);
  assert.equal(input.priceJPY,20000); assert.equal(input.quantity,3);
  assert.deepEqual(calculateFee(input.priceJPY),{priceJPY:20000,feeJPY:2000,sellerNetJPY:18000,rateBps:1000});
  assert.equal(calculateFee(999).feeJPY,99); assert.equal(calculateFee(0).feeJPY,0);
});
test("日時はJST入力でもUTCに統一され、境界を同じ基準で判定する",()=>{
  const input=validateListing(listing,NOW);
  assert.equal(input.pickupStart,"2026-12-04T07:00:00.000Z");
  assert.equal(input.pickupEnd,"2026-12-04T09:00:00.000Z");
  rejects(()=>validateListing({...listing,pickupEnd:listing.pickupStart},NOW));
  rejects(()=>validateListing(listing,Date.parse(input.pickupEnd)),"EXPIRED");
});
test("非数・小数円・負数・型の曖昧変換を受け付けない",()=>{
  for(const value of [NaN,Infinity,-1,0.1,"100",10000001]) rejects(()=>validateListing({...listing,priceJPY:value},NOW));
  for(const value of [0,1.5,Infinity,"2"]) rejects(()=>validateListing({...listing,quantity:value},NOW));
  rejects(()=>validateListing({...listing,widthCm:0},NOW));
  rejects(()=>calculateFee(100,-1));
});
test("権限や搬出確認はtrueに明示同意。文字列trueでは代替できない",()=>{
  for(const key of ["rightsConfirmed","termsAccepted","pickupRulesConfirmed"]) {
    rejects(()=>validateListing({...listing,[key]:false},NOW));
    rejects(()=>validateListing({...listing,[key]:"true"},NOW));
  }
});
test("不正なenum・外部画像URL・任意の管理フィールドを排除する",()=>{
  rejects(()=>validateListing({...listing,category:"admin"},NOW));
  rejects(()=>validateListing({...listing,imageUrl:"https://tracker.example/image.png"},NOW),"INVALID_PHOTO");
  rejects(()=>validateListing({...listing,imageUrl:"/api/photos/../../secret"},NOW),"INVALID_PHOTO");
  const cleaned=validateListing({...listing,ownerId:"someone-else",status:"published",isDemo:false},NOW);
  assert.equal("ownerId" in cleaned,false);assert.equal("status" in cleaned,false);assert.equal("isDemo" in cleaned,false);
});
test("タイムゾーン不明の日時・存在しない日・年を超えた出品を拒否する",()=>{
  rejects(()=>parseTimestamp("2026-12-04T16:00","日時"));
  rejects(()=>parseTimestamp("2026-02-30T16:00:00+09:00","日時"));
  rejects(()=>parseTimestamp("2026-12-04T24:00:00+09:00","日時"));
  rejects(()=>validateListing({...listing,pickupStart:"2030-12-01T00:00:00Z",pickupEnd:"2030-12-02T00:00:00Z"},NOW));
});
test("サンプル、非公開、予約済み、期限切れの申込みを拒否する",()=>{
  const request={companyName:"受取企業",message:"軽バンと2名で引き取ります。",pickupAt:"2026-12-04T17:00:00+09:00",conditionsAccepted:true};
  assert.equal(validateRequest(request,available,NOW).pickupAt,"2026-12-04T08:00:00.000Z");
  rejects(()=>validateRequest(request,{...available,isDemo:true},NOW),"DEMO_LISTING");
  for(const status of ["draft","reserved","completed","withdrawn"]) rejects(()=>validateRequest(request,{...available,status},NOW),"LISTING_UNAVAILABLE");
  rejects(()=>validateRequest(request,available,Date.parse(available.pickupEnd)),"EXPIRED");
});
test("引渡時間外・過去の希望日時・未同意の申込みを拒否する",()=>{
  const request={companyName:"受取企業",message:"軽バンと2名で引き取ります。",pickupAt:"2026-12-04T17:00:00+09:00",conditionsAccepted:true};
  for(const pickupAt of ["2026-12-04T15:59:00+09:00","2026-12-04T18:01:00+09:00"]) rejects(()=>validateRequest({...request,pickupAt},available,NOW),"PICKUP_OUTSIDE_WINDOW");
  rejects(()=>validateRequest(request,available,Date.parse("2026-12-04T17:01:00+09:00")),"PICKUP_OUTSIDE_WINDOW");
  rejects(()=>validateRequest({...request,conditionsAccepted:false},available,NOW),"CONSENT_REQUIRED");
});
test("公開フラグだけでは取引開始せず、運営者情報も必要",()=>{
  assert.equal(marketplaceMode({}),"preview");
  assert.equal(marketplaceMode({MARKETPLACE_LIVE:"true"}),"preview");
  assert.equal(marketplaceMode({MARKETPLACE_LIVE:"true",OPERATOR_NAME:" ",OPERATOR_CONTACT:"contact"}),"preview");
  assert.equal(marketplaceMode({MARKETPLACE_LIVE:"true",OPERATOR_NAME:"運営企業",OPERATOR_CONTACT:"contact@example.com"}),"live");
});
test("cookie認証の書込はOrigin欠落・別サイト・同一サイト別originも拒否",()=>{
  const url="https://relay.example/api/listings";
  assertSameOrigin(new Request(url,{headers:{Origin:"https://relay.example","Sec-Fetch-Site":"same-origin"}}));
  rejects(()=>assertSameOrigin(new Request(url)),"INVALID_ORIGIN");
  rejects(()=>assertSameOrigin(new Request(url,{headers:{Origin:"https://evil.example"}})),"INVALID_ORIGIN");
  rejects(()=>assertSameOrigin(new Request(url,{headers:{Origin:"https://relay.example","Sec-Fetch-Site":"cross-site"}})),"INVALID_ORIGIN");
});
test("SVG/HTMLを画像として受理せず、許可形式のシグネチャを確認",()=>{
  assert.equal(detectImageType(new TextEncoder().encode('<svg onload="alert(1)"></svg>')),null);
  assert.equal(detectImageType(new TextEncoder().encode('<html></html>')),null);
  assert.equal(detectImageType(new Uint8Array([137,80,78,71,13,10,26,10])),"image/png");
  assert.equal(detectImageType(new Uint8Array([255,216,255,224])),"image/jpeg");
  assert.equal(detectImageType(new TextEncoder().encode('RIFF1234WEBP')),"image/webp");
});
