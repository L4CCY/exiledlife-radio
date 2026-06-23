// ============================================================
// Cloudflare Pages Function – /play végpont
// ============================================================
// Beállítás Pages → Settings → Functions → Bindings:
//   Variable name : RADIO_KV
//   KV namespace  : radio-sessions
// ============================================================

const CORS = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...CORS },
    });
}

export async function onRequest(context) {
    const { request, env } = context;

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (request.method !== 'POST')    return json({ ok: false, error: 'method_not_allowed' }, 405);

    if (!env.RADIO_KV) {
        console.error('[Radio] RADIO_KV binding hiányzik!');
        return json({ ok: false, error: 'kv_not_configured' }, 500);
    }

    let body;
    try { body = await request.json(); }
    catch { return json({ ok: false, error: 'invalid_json' }, 400); }

    const { token, videoId, title } = body;

    if (!token || typeof token !== 'string' || token.length < 6)
        return json({ ok: false, error: 'invalid_token' }, 400);

    if (!videoId || typeof videoId !== 'string' || !/^[\w-]+$/.test(videoId) || videoId.length > 20)
        return json({ ok: false, error: 'invalid_video_id' }, 400);

    // Token validálás
    let session;
    try { session = await env.RADIO_KV.get('session:' + token); }
    catch { return json({ ok: false, error: 'kv_error' }, 500); }

    if (!session) return json({ ok: false, error: 'invalid_token' }, 403);

    // Parancs beírása 30 másodperces TTL-lel
    try {
        await env.RADIO_KV.put(
            'cmd:' + token,
            JSON.stringify({
                videoId: videoId.trim(),
                title:   (typeof title === 'string' ? title : '').trim().slice(0, 80),
                ts:      Date.now(),
            }),
            { expirationTtl: 30 }
        );
    } catch {
        return json({ ok: false, error: 'kv_write_error' }, 500);
    }

    return json({ ok: true });
}
