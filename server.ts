import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import { initDb, get, query, run } from './db.ts';

declare module 'express-session' {
  interface SessionData {
    user: {
      id: number;
      username: string;
      role: 'admin' | 'reseller';
    };
  }
}

async function startServer() {
  await initDb();
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(session({
    secret: 'premiumin-plus-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: false, // Set to true if using HTTPS
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Logging Middleware
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
    });
    next();
  });

  // --- Auth Routes ---
  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
      const user = await get('SELECT * FROM users WHERE username = ?', [username]);
      if (!user) {
        return res.status(401).json({ message: 'Hubungi Admin' });
      }

      const isValid = bcrypt.compareSync(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: 'Username atau Password salah' });
      }

      req.session.user = {
        id: user.id,
        username: user.username,
        role: user.role
      };

      // Log activity
      await run('INSERT INTO activity_log (user_id, activity, ip_address) VALUES (?, ?, ?)', [
        user.id,
        'login',
        req.ip || 'unknown'
      ]);
      console.log(`[LOGIN] User ${username} logged in`);

      res.json({ user: req.session.user });
    } catch (err) {
      console.error('[ERROR]', err);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });

  app.post('/api/auth/logout', async (req, res) => {
    if (req.session.user) {
      await run('INSERT INTO activity_log (user_id, activity, ip_address) VALUES (?, ?, ?)', [
        req.session.user.id,
        'logout',
        req.ip || 'unknown'
      ]);
      console.log(`[LOGIN] User ${req.session.user.username} logged out`);
    }
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get('/api/auth/me', (req, res) => {
    if (req.session.user) {
      res.json({ user: req.session.user });
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  });

  // --- Middleware ---
  const isAuthenticated = (req: any, res: any, next: any) => {
    if (req.session.user) return next();
    res.status(401).json({ message: 'Unauthorized' });
  };

  const isAdmin = (req: any, res: any, next: any) => {
    if (req.session.user?.role === 'admin') return next();
    res.status(403).json({ message: 'Forbidden: Admin access only' });
  };

  // --- User Routes ---
  app.get('/api/user/saldo', isAuthenticated, async (req, res) => {
    const user = await get('SELECT saldo, markup_percent FROM users WHERE id = ?', [req.session.user!.id]);
    res.json({ saldo: user.saldo, markup_percent: user.markup_percent });
  });

  app.get('/api/user/stats', isAuthenticated, async (req, res) => {
    const userId = req.session.user!.id;
    const totalBelanja = await get('SELECT SUM(harga_beli) as total FROM transaksi WHERE user_id = ? AND status = "sukses"', [userId]);
    const totalPendapatan = await get('SELECT SUM(keuntungan) as total FROM transaksi WHERE user_id = ? AND status = "sukses"', [userId]);
    const totalPesanan = await get('SELECT COUNT(*) as count FROM transaksi WHERE user_id = ?', [userId]);
    
    res.json({
      saldo_keluar: totalBelanja.total || 0,
      total_pendapatan: totalPendapatan.total || 0,
      total_pesanan: totalPesanan.count
    });
  });

  app.post('/api/user/markup', isAuthenticated, async (req, res) => {
    const { markup } = req.body;
    await run('UPDATE users SET markup_percent = ? WHERE id = ?', [markup, req.session.user!.id]);
    res.json({ success: true });
  });

  app.get('/api/user/withdraws', isAuthenticated, async (req, res) => {
    const wds = await query('SELECT * FROM withdraw WHERE user_id = ? ORDER BY created_at DESC', [req.session.user!.id]);
    res.json(wds);
  });

  app.post('/api/user/withdraw', isAuthenticated, async (req, res) => {
    const { amount } = req.body;
    const userId = req.session.user!.id;

    // Check if enough total_pendapatan? Or just any balance?
    // Let's check available profit
    const totalPendapatan = await get('SELECT SUM(keuntungan) as total FROM transaksi WHERE user_id = ? AND status = "sukses"', [userId]);
    const totalWithdrawn = await get('SELECT SUM(amount) as total FROM withdraw WHERE user_id = ? AND status = "approved"', [userId]);
    const available = (totalPendapatan.total || 0) - (totalWithdrawn.total || 0);

    if (amount > available) {
      return res.status(400).json({ message: 'Saldo pendapatan tidak mencukupi' });
    }

    await run('INSERT INTO withdraw (user_id, amount, status) VALUES (?, ?, ?)', [userId, amount, 'pending']);
    console.log(`[WD] Withdraw request from ${req.session.user!.username}: Rp ${amount}`);
    res.json({ success: true });
  });

  app.get('/api/user/transaksi', isAuthenticated, async (req, res) => {
    const txs = await query('SELECT * FROM transaksi WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', [req.session.user!.id]);
    res.json(txs);
  });

  // --- Products API ---
  app.get('/api/products', isAuthenticated, async (req, res) => {
    const products = await query('SELECT * FROM products');
    res.json(products);
  });

  app.post('/api/order', isAuthenticated, async (req, res) => {
    const { productId } = req.body;
    const userId = req.session.user!.id;

    try {
      const product = await get('SELECT * FROM products WHERE id = ?', [productId]);
      if (!product || product.stok <= 0) {
        return res.status(400).json({ message: 'Produk tidak tersedia atau stok habis' });
      }

      const user = await get('SELECT saldo, markup_percent FROM users WHERE id = ?', [userId]);
      const adminPrice = product.harga_dasar + Math.round((product.harga_dasar * product.margin) / 100);
      const resellerMarkup = Math.round((adminPrice * user.markup_percent) / 100);
      const finalPrice = adminPrice + resellerMarkup;

      if (user.saldo < adminPrice) {
        return res.status(400).json({ message: 'Saldo tidak mencukupi' });
      }

      // Start transaction logic
      await run('UPDATE users SET saldo = saldo - ? WHERE id = ?', [adminPrice, userId]);
      await run('UPDATE products SET stok = stok - 1 WHERE id = ?', [productId]);
      await run('INSERT INTO transaksi (user_id, produk, harga_beli, harga_jual, keuntungan, status) VALUES (?, ?, ?, ?, ?, ?)', [
        userId,
        product.name,
        adminPrice,
        finalPrice,
        resellerMarkup,
        'sukses'
      ]);

      console.log(`[ORDER] Order success for ${req.session.user!.username}. Order: ${product.name}`);
      res.json({ success: true, message: 'Pesanan berhasil' });
    } catch (err) {
      console.error('[ERROR] Transaction failed', err);
      res.status(500).json({ message: 'Terjadi kesalahan saat memproses pesanan' });
    }
  });

  // --- Admin Routes ---
  app.get('/api/admin/users', isAuthenticated, isAdmin, async (req, res) => {
    const users = await query('SELECT id, username, role, saldo, markup_percent, created_at FROM users');
    res.json(users);
  });

  app.post('/api/admin/users', isAuthenticated, isAdmin, async (req, res) => {
    const { username, password, role, saldo } = req.body;
    const hashedPass = bcrypt.hashSync(password, 10);
    try {
      await run('INSERT INTO users (username, password, role, saldo) VALUES (?, ?, ?, ?)', [username, hashedPass, role, saldo]);
      console.log(`[ADMIN] User created: ${username}`);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: 'Username sudah digunakan' });
    }
  });

  app.get('/api/admin/logs', isAuthenticated, isAdmin, async (req, res) => {
    const logs = await query('SELECT l.*, u.username FROM activity_log l JOIN users u ON l.user_id = u.id ORDER BY l.created_at DESC LIMIT 100');
    res.json(logs);
  });

  app.get('/api/admin/settings', isAuthenticated, isAdmin, async (req, res) => {
    const settings = await query('SELECT * FROM settings');
    res.json(settings);
  });

  app.post('/api/admin/settings', isAuthenticated, isAdmin, async (req, res) => {
    const { key, value } = req.body;
    await run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
    res.json({ success: true });
  });

  app.get('/api/admin/all-transaksi', isAuthenticated, isAdmin, async (req, res) => {
    const txs = await query('SELECT t.*, u.username FROM transaksi t JOIN users u ON t.user_id = u.id ORDER BY t.created_at DESC');
    res.json(txs);
  });

  // Admin Withdraw Management
  app.get('/api/admin/withdraws', isAuthenticated, isAdmin, async (req, res) => {
    const wds = await query('SELECT w.*, u.username FROM withdraw w JOIN users u ON w.user_id = u.id ORDER BY w.created_at DESC');
    res.json(wds);
  });

  app.post('/api/admin/withdraws/:id/status', isAuthenticated, isAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    await run('UPDATE withdraw SET status = ? WHERE id = ?', [status, id]);
    console.log(`[WD] Withdraw request ${id} ${status}`);
    res.json({ success: true });
  });

  // Admin Product Management
  app.post('/api/admin/products', isAuthenticated, isAdmin, async (req, res) => {
    const { name, harga_dasar, margin, stok } = req.body;
    await run('INSERT INTO products (name, harga_dasar, margin, stok) VALUES (?, ?, ?, ?)', [name, harga_dasar, margin, stok]);
    res.json({ success: true });
  });

  // --- Vite / Static ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
