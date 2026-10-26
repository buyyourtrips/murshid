import { env } from 'cloudflare:workers';
import { identity, authorize, db, log, failure } from '../../../lib/access';
import { validateDocument } from '../../../lib/files';
import { tripSchema } from '../../../lib/validation';
export async function GET() { try {
    const u = await identity();
    const rows = u.admin ? await db().prepare('SELECT * FROM bookings ORDER BY updated DESC').all() : await db().prepare('SELECT DISTINCT b.* FROM bookings b JOIN booking_access a ON a.booking_id=b.id WHERE lower(a.email)=? AND a.active=1 ORDER BY b.updated DESC').bind(u.email.toLowerCase()).all();
    const list = [];
    for (const row of rows.results as any[]) {
        const trip = JSON.parse(row.data);
        if (!u.admin && !trip.published)
            continue;
        const docs = await db().prepare(`SELECT * FROM documents WHERE booking_id=? ${u.admin ? '' : "AND visibility='customer'"}`).bind(row.id).all();
        const support = await db().prepare('SELECT * FROM support_requests WHERE booking_id=? ORDER BY created DESC').bind(row.id).all();
        for (const request of support.results as any[]) {
            const m = await db().prepare('SELECT * FROM support_messages WHERE request_id=? ORDER BY created,id').bind(request.id).all();
            request.messages = m.results;
        }
        const permissions = u.admin ? await db().prepare('SELECT * FROM booking_access WHERE booking_id=?').bind(row.id).all() : { results: [] };
        list.push({ id: row.id, reference: row.reference, ...trip, documents: docs.results, support: support.results, access: permissions.results });
    }
    return Response.json({ admin: u.admin, user: u.displayName, bookings: list }, { headers: { 'Cache-Control': 'no-store' } });
}
catch (e) {
    return failure(e);
} }
export async function POST(req: Request) {
    try {
        const origin = req.headers.get('origin');
        if (origin && origin !== new URL(req.url).origin)
            throw new Error('FORBIDDEN');
        const u = await identity();
        const ct = req.headers.get('content-type') || '';
        if (ct.includes('multipart/form-data')) {
            if (!u.admin)
                throw new Error('FORBIDDEN');
            const f = await req.formData();
            const id = String(f.get('bookingId'));
            await authorize(id);
            let validated;
            try {
                validated = await validateDocument(f.get('file'));
            }
            catch (e) {
                return Response.json({ error: (e as Error).message }, { status: 400 });
            }
            const { file, bytes } = validated;
            const key = crypto.randomUUID();
            await env.BUCKET!.put(key, bytes, { httpMetadata: { contentType: file.type } });
            try {
                await db().prepare('INSERT INTO documents VALUES (?,?,?,?,?,?,?)').bind(key, id, file.name.slice(0, 180), file.type, file.size, f.get('visibility') === 'customer' ? 'customer' : 'staff', new Date().toISOString()).run();
            }
            catch (e) {
                await env.BUCKET!.delete(key);
                throw e;
            }
            await log(u.email, 'document_uploaded', id);
            return Response.json({ ok: true });
        }
        const body = await req.json() as any;
        const { action, id } = body;
        if (action === 'support') {
            await authorize(id);
            const subject = String(body.subject || '').trim(), message = String(body.message || '').trim();
            if (!subject || !message || subject.length > 160 || message.length > 4000)
                throw new Error('INVALID');
            await db().prepare('INSERT INTO support_requests VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(), id, subject, message, 'open', new Date().toISOString()).run();
            await log(u.email, 'support_created', id);
            return Response.json({ ok: true });
        }
        if (action === 'reply') {
            await authorize(id);
            const message = String(body.message || '').trim();
            if (!message || message.length > 4000)
                throw new Error('INVALID');
            const thread = await db().prepare('SELECT id FROM support_requests WHERE id=? AND booking_id=?').bind(body.requestId, id).first();
            if (!thread)
                throw new Error('NOT_FOUND');
            await db().prepare('INSERT INTO support_messages VALUES (?,?,?,?,?)').bind(crypto.randomUUID(), body.requestId, u.admin ? 'Coordinator' : 'Traveller', message, new Date().toISOString()).run();
            await log(u.email, 'support_reply', id);
            return Response.json({ ok: true });
        }
        if (!u.admin)
            throw new Error('FORBIDDEN');
        if (action === 'create' || action === 'save') {
            const data = tripSchema.parse(body.data);
            const key = action === 'create' ? crypto.randomUUID() : id;
            let reference = '';
            if (action === 'save') {
                const { b } = await authorize(id);
                reference = b.reference;
                const old = JSON.parse(b.data);
                data.revision = old.revision + (data.published ? 1 : 0);
                await db().prepare('UPDATE bookings SET data=?,updated=? WHERE id=?').bind(JSON.stringify(data), new Date().toISOString(), id).run();
            }
            else {
                reference = 'MR-' + crypto.randomUUID().slice(0, 8).toUpperCase();
                await db().prepare('INSERT INTO bookings VALUES (?,?,?,?,?)').bind(key, u.userId, reference, JSON.stringify(data), new Date().toISOString()).run();
            }
            await log(u.email, action === 'create' ? 'booking_created' : 'booking_updated', key);
            return Response.json({ id: key, reference });
        }
        await authorize(id);
        if (action === 'grant') {
            const email = String(body.email || '').trim().toLowerCase();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
                throw new Error('INVALID');
            const existing: any = await db().prepare('SELECT id FROM booking_access WHERE booking_id=? AND lower(email)=?').bind(id, email).first();
            if (existing) {
                await db().prepare('UPDATE booking_access SET active=1 WHERE id=?').bind(existing.id).run();
            }
            else {
                await db().prepare('INSERT INTO booking_access VALUES (?,?,?,1)').bind(crypto.randomUUID(), id, email).run();
            }
            await log(u.email, 'access_granted', id);
        }
        else if (action === 'revoke') {
            await db().prepare('UPDATE booking_access SET active=0 WHERE id=? AND booking_id=?').bind(body.accessId, id).run();
            await log(u.email, 'access_revoked', id);
        }
        else if (action === 'resolve') {
            await db().prepare("UPDATE support_requests SET status='resolved' WHERE id=? AND booking_id=?").bind(body.requestId, id).run();
            await log(u.email, 'support_resolved', id);
        }
        else if (action === 'deleteDocument') {
            const d = await db().prepare('SELECT id FROM documents WHERE id=? AND booking_id=?').bind(body.documentId, id).first();
            if (!d)
                throw new Error('NOT_FOUND');
            await db().prepare('DELETE FROM documents WHERE id=?').bind(body.documentId).run();
            await env.BUCKET!.delete(body.documentId);
            await log(u.email, 'document_deleted', id);
        }
        else
            throw new Error('INVALID');
        return Response.json({ ok: true });
    }
    catch (e) {
        return failure(e);
    }
}
