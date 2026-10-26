import { getChatGPTUser } from '../app/chatgpt-auth';
import { env } from 'cloudflare:workers';
export const db = () => env.DB!;
export async function identity() { const u = await getChatGPTUser(); if (!u)
    throw new Error('UNAUTHORIZED'); return { ...u, admin: u.email.toLowerCase() === 'buyyourtrips@gmail.com' }; }
export async function authorize(id: string) { const u = await identity(); const b: any = await db().prepare('SELECT * FROM bookings WHERE id=?').bind(id).first(); if (!b)
    throw new Error('NOT_FOUND'); if (!u.admin) {
    const a = await db().prepare('SELECT id FROM booking_access WHERE booking_id=? AND lower(email)=? AND active=1').bind(id, u.email.toLowerCase()).first();
    if (!a || !JSON.parse(b.data).published)
        throw new Error('FORBIDDEN');
} return { u, b }; }
export async function log(actor: string, action: string, id: string) { await db().prepare('INSERT INTO audit_events VALUES (?,?,?,?,?)').bind(crypto.randomUUID(), actor, action, id, new Date().toISOString()).run(); }
export function failure(e: unknown) { const m = e instanceof Error ? e.message : ''; return Response.json({ error: m === 'UNAUTHORIZED' ? 'Please sign in' : m === 'FORBIDDEN' ? 'Access denied' : m === 'NOT_FOUND' ? 'Booking not found' : 'Request could not be completed' }, { status: m === 'UNAUTHORIZED' ? 401 : m === 'FORBIDDEN' ? 403 : m === 'NOT_FOUND' ? 404 : 400 }); }
