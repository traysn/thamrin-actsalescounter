import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'node:crypto';
export const db=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
export const pub=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
export const hash=t=>createHash('sha256').update(t).digest('hex');
export const token=()=>randomBytes(32).toString('base64url');
export function respond(res,status,body){res.status(status).json(body)}
export function fail(res,e){console.error(e);respond(res,500,{error:'Kesalahan server. Periksa konfigurasi dan log Vercel.'})}
export async function admin(req){const h=req.headers.authorization||'';if(!h.startsWith('Bearer '))return false;const {data,error}=await pub().auth.getUser(h.slice(7));return !error&&data?.user?.email?.toLowerCase()===process.env.ADMIN_EMAIL?.toLowerCase()}
export async function supervisor(req){const t=req.headers['x-supervisor-token']||req.query?.token;if(typeof t!=='string'||t.length<20)return false;const {data}=await db().from('supervisor_links').select('id,expires_at,revoked_at').eq('token_hash',hash(t)).maybeSingle();return !!data&&!data.revoked_at&&(!data.expires_at||new Date(data.expires_at)>new Date())}
export async function authorize(req){return await admin(req)||await supervisor(req)}
export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const clean=v=>String(v??'').trim();
export function validDate(s){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'))}
export function unwrap({data,error}){if(error)throw error;return data}
