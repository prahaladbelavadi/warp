import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import QRCode from 'qrcode';
import { state } from './state';

const PASSWORD = process.env.QR_PAGE_PASSWORD ?? '';
const COOKIE_NAME = 'warp_auth';
const COOKIE_SECRET = process.env.WEBHOOK_SECRET ?? 'warp-dev-secret';

export function startServer(port = 3000): void {
  if (!PASSWORD) {
    console.warn('[WARP Server] QR_PAGE_PASSWORD not set — QR page disabled');
    return;
  }

  const app = express();
  app.use(cookieParser());
  app.use(express.urlencoded({ extended: false }));

  // Auth middleware
  function requireAuth(req: Request, res: Response, next: NextFunction): void {
    if (req.cookies[COOKIE_NAME] === COOKIE_SECRET) return next();
    res.redirect('/login');
  }

  // Login page
  app.get('/login', (_req: Request, res: Response) => {
    res.send(loginPage());
  });

  app.post('/login', (req: Request, res: Response) => {
    if (req.body.password === PASSWORD) {
      res.cookie(COOKIE_NAME, COOKIE_SECRET, {
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      res.redirect('/');
    } else {
      res.send(loginPage('Incorrect password.'));
    }
  });

  app.get('/logout', (_req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME);
    res.redirect('/login');
  });

  // QR as PNG data URL (polled by browser)
  app.get('/qr.png', requireAuth, async (_req: Request, res: Response) => {
    if (state.ready) {
      res.json({ status: 'ready' });
      return;
    }
    if (!state.qr) {
      res.status(503).json({ status: 'waiting' });
      return;
    }
    const dataUrl = await QRCode.toDataURL(state.qr, { width: 320, margin: 2 });
    res.json({ status: 'pending', qr: dataUrl });
  });

  // Main QR page
  app.get('/', requireAuth, (_req: Request, res: Response) => {
    res.send(qrPage());
  });

  app.listen(port, () => {
    console.log(`[WARP Server] QR page available on port ${port}`);
  });
}

function loginPage(error = ''): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>WARP — Login</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0f0f0f;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #e5e5e5;
    }
    .card {
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 12px;
      padding: 40px;
      width: 360px;
    }
    h1 { font-size: 1.4rem; font-weight: 600; margin-bottom: 6px; }
    p.sub { font-size: 0.85rem; color: #888; margin-bottom: 28px; }
    label { display: block; font-size: 0.8rem; color: #aaa; margin-bottom: 6px; }
    input[type=password] {
      width: 100%;
      padding: 10px 14px;
      background: #111;
      border: 1px solid #333;
      border-radius: 8px;
      color: #e5e5e5;
      font-size: 0.95rem;
      outline: none;
      margin-bottom: 16px;
    }
    input[type=password]:focus { border-color: #555; }
    button {
      width: 100%;
      padding: 10px;
      background: #25d366;
      border: none;
      border-radius: 8px;
      color: #000;
      font-weight: 600;
      font-size: 0.95rem;
      cursor: pointer;
    }
    button:hover { background: #20c05c; }
    .error { color: #f87171; font-size: 0.82rem; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>WARP</h1>
    <p class="sub">WhatsApp session manager</p>
    <form method="POST" action="/login">
      <label for="pw">Password</label>
      <input id="pw" type="password" name="password" autofocus autocomplete="current-password">
      ${error ? `<p class="error">${error}</p>` : ''}
      <button type="submit">Sign in</button>
    </form>
  </div>
</body>
</html>`;
}

function qrPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>WARP — Scan QR</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0f0f0f;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #e5e5e5;
    }
    .card {
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 12px;
      padding: 40px;
      text-align: center;
      width: 400px;
    }
    h1 { font-size: 1.4rem; font-weight: 600; margin-bottom: 6px; }
    p.sub { font-size: 0.85rem; color: #888; margin-bottom: 28px; }
    #status {
      font-size: 0.82rem;
      color: #888;
      margin-bottom: 20px;
      min-height: 1.2em;
    }
    #qr-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 320px;
    }
    #qr-wrap img {
      border-radius: 8px;
      background: #fff;
      padding: 12px;
    }
    .spinner {
      width: 40px; height: 40px;
      border: 3px solid #333;
      border-top-color: #25d366;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .ready-icon { font-size: 3rem; margin-bottom: 12px; }
    .ready-text { font-size: 1rem; color: #25d366; font-weight: 600; }
    a.logout {
      display: inline-block;
      margin-top: 24px;
      font-size: 0.78rem;
      color: #555;
      text-decoration: none;
    }
    a.logout:hover { color: #888; }
  </style>
</head>
<body>
  <div class="card">
    <h1>WARP</h1>
    <p class="sub">Scan with WhatsApp → Linked Devices → Link a Device</p>
    <p id="status">Connecting…</p>
    <div id="qr-wrap"><div class="spinner"></div></div>
    <a class="logout" href="/logout">Sign out</a>
  </div>

  <script>
    const wrap = document.getElementById('qr-wrap');
    const status = document.getElementById('status');

    async function poll() {
      try {
        const res = await fetch('/qr.png');
        const data = await res.json();

        if (data.status === 'ready') {
          wrap.innerHTML = '<div><div class="ready-icon">✅</div><p class="ready-text">WhatsApp connected!</p></div>';
          status.textContent = 'Session is active. You can close this page.';
          return; // stop polling
        }

        if (data.status === 'pending') {
          let img = wrap.querySelector('img');
          if (!img) {
            wrap.innerHTML = '<img alt="QR code">';
            img = wrap.querySelector('img');
          }
          img.src = data.qr;
          status.textContent = 'QR refreshes automatically — scan quickly.';
        } else {
          status.textContent = 'Waiting for WhatsApp QR…';
        }
      } catch {
        status.textContent = 'Connection error — retrying…';
      }
      setTimeout(poll, 4000);
    }

    poll();
  </script>
</body>
</html>`;
}
