// ============================================================
// ExiledLife Rádió – telefon webapp
// ============================================================

const API_KEY    = 'AIzaSyAO70WEbLxgnOL5UmaymzUaPlyImPZpXBo';
const WORKER_URL = 'https://radio-relay.akilaci6999.workers.dev';

// ============================================================

const params  = new URLSearchParams(location.search);
const token   = params.get('t');

const statusEl  = document.getElementById('status');
const formEl    = document.getElementById('search-form');
const inputEl   = document.getElementById('search-input');
const resultsEl = document.getElementById('results');

function setStatus(text, isError) {
    statusEl.textContent = text || '';
    statusEl.classList.toggle('error', !!isError);
}

if (!token) {
    setStatus('Hiányzó kód a linkből. Olvasd be újra a QR kódot a játékban.', true);
    formEl.style.display = 'none';
}

formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = inputEl.value.trim();
    if (!q) return;

    setStatus('Keresés...');
    resultsEl.innerHTML = '';

    try {
        const url = 'https://www.googleapis.com/youtube/v3/search'
            + '?part=snippet&type=video&maxResults=10'
            + '&q=' + encodeURIComponent(q)
            + '&key=' + API_KEY;

        const res  = await fetch(url);
        const data = await res.json();

        if (data.error) {
            setStatus('Hiba a YouTube keresésben.', true);
            return;
        }

        if (!data.items || data.items.length === 0) {
            setStatus('Nincs eredmény.');
            return;
        }

        setStatus('');
        data.items.forEach((item) => {
            const videoId = item.id.videoId;
            const title   = item.snippet.title;
            const thumb   = item.snippet.thumbnails && item.snippet.thumbnails.default
                ? item.snippet.thumbnails.default.url
                : '';

            const card = document.createElement('button');
            card.type      = 'button';
            card.className = 'result-card';

            const img = document.createElement('img');
            img.src = thumb;
            img.alt = '';

            const titleSpan = document.createElement('span');
            titleSpan.className   = 'result-title';
            titleSpan.textContent = title;

            card.appendChild(img);
            card.appendChild(titleSpan);
            card.addEventListener('click', () => sendToGame(videoId, title, card));
            resultsEl.appendChild(card);
        });
    } catch (err) {
        setStatus('Hiba történt a keresés közben.', true);
    }
});

async function sendToGame(videoId, title, cardEl) {
    // Kijelölés vizuális visszajelzés
    document.querySelectorAll('.result-card').forEach(c => c.classList.remove('selected'));
    if (cardEl) cardEl.classList.add('selected');

    setStatus('Küldés a játékba...');

    try {
        const res = await fetch(WORKER_URL, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ token, videoId, title }),
        });
        const data = await res.json();

        if (data.ok) {
            setStatus('🎵 Lejátszva: ' + title);
        } else if (data.error === 'invalid_token') {
            setStatus('A QR kód lejárt. Olvasd be újra a játékban!', true);
        } else {
            setStatus('Érvénytelen vagy lejárt kód. Olvasd be újra a QR-t a játékban.', true);
        }
    } catch (err) {
        setStatus('Nem sikerült elérni a szervert.', true);
    }
}
