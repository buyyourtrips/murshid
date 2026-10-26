import { env } from 'cloudflare:workers';
import { db, authorize, failure } from '../../../../lib/access';
export async function GET(_req: Request, ctx: {
    params: Promise<{
        id: string;
    }>;
}) { try {
    const { id } = await ctx.params;
    const d: any = await db().prepare('SELECT * FROM documents WHERE id=?').bind(id).first();
    if (!d)
        throw new Error('NOT_FOUND');
    const { u } = await authorize(d.booking_id);
    if (!u.admin && d.visibility !== 'customer')
        throw new Error('FORBIDDEN');
    const b = await env.BUCKET!.get(id);
    if (!b)
        throw new Error('NOT_FOUND');
    return new Response(b.body, { headers: { 'Content-Type': d.mime, 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(d.name)}`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}
catch (e) {
    return failure(e);
} }
