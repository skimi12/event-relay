import { getChatGPTUser } from "../../chatgpt-auth";
import { canCreateDraft, json, mode, route } from "../../../lib/api";
export const dynamic = "force-dynamic";
export async function GET() { return route(async()=>{ const user=await getChatGPTUser(); return json({ user:user?{id:user.userId,displayName:user.displayName}:null, mode:mode(), canCreateDraft:canCreateDraft(user), fees:{rateBps:1000,enabled:false} }); }); }
