import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  ShoppingCart, 
  History, 
  Settings as SettingsIcon, 
  LogOut, 
  Activity, 
  Plus, 
  Search, 
  Wallet, 
  TrendingUp, 
  TrendingDown,
  Info,
  Package,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Utility for Tailwind class merging */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Context & Types ---
interface User {
  id: number;
  username: string;
  role: 'admin' | 'reseller';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

// --- Components ---

const Button = ({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button 
    className={cn(
      "px-4 py-2 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
      "cursor-pointer",
      className
    )} 
    {...props} 
  />
);

const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input 
    className={cn(
      "w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:ring-2 focus:ring-brand-pink outline-none transition-all text-white",
      className
    )}
    {...props}
  />
);

const Card = ({ children, className, ...props }: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("bg-zinc-950/50 backdrop-blur-md border border-zinc-900 rounded-xl p-6 shadow-xl", className)} {...props}>
    {children}
  </div>
);

// --- Auth Provider ---

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.user) setUser(data.user);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const login = async (username: string, pass: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: pass })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Login failed');
    }
    const data = await res.json();
    setUser(data.user);
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// --- Layout & Navigation ---

const DashboardLayout = ({ children, title }: { children: React.ReactNode; title: string }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/', roles: ['admin', 'reseller'] },
    { name: 'Order Produk', icon: ShoppingCart, path: '/order', roles: ['reseller'] },
    { name: 'Transaksi', icon: History, path: '/transactions', roles: ['reseller'] },
    { name: 'Tarik Saldo', icon: Wallet, path: '/withdraw', roles: ['reseller'] },
    { name: 'Admin Panel', icon: Users, path: '/admin/users', roles: ['admin'] },
    { name: 'Semua Transaksi', icon: Activity, path: '/admin/transactions', roles: ['admin'] },
    { name: 'Withdraws', icon: Wallet, path: '/admin/withdraws', roles: ['admin'] },
    { name: 'Logs', icon: Info, path: '/admin/logs', roles: ['admin'] },
    { name: 'Settings', icon: Key, path: '/admin/settings', roles: ['admin'] },
  ];

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-900 bg-zinc-950 flex flex-col hidden md:flex">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-pink rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-brand-pink/20">P+</div>
          <span className="font-bold text-lg tracking-tight">Premiumin Plus</span>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.filter(item => item.roles.includes(user?.role || '')).map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
                window.location.pathname === item.path 
                  ? "bg-brand-pink/10 text-brand-pink font-medium" 
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900"
              )}
            >
              <item.icon className={cn("w-5 h-5", window.location.pathname === item.path ? "text-brand-pink" : "text-zinc-500 group-hover:text-zinc-400")} />
              {item.name}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-900">
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold uppercase">
              {user?.username[0]}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.username}</p>
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest">{user?.role}</p>
            </div>
            <button onClick={logout} className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-red-400 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-auto">
        <header className="h-16 border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-sm flex items-center justify-between px-8 sticky top-0 z-10">
          <h1 className="text-xl font-semibold">{title}</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] uppercase font-bold text-green-500 tracking-wider">System Online</span>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={window.location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

// --- Pages ---

const LoginPage = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-brand-pink/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative"
      >
        <Card className="p-10 border-zinc-800 bg-zinc-950/80">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-brand-pink rounded-2xl flex items-center justify-center font-bold text-3xl shadow-2xl shadow-brand-pink/20 mb-4">P+</div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Premiumin Plus</h2>
            <p className="text-zinc-500 text-sm mt-1">✨ Solusi Produk Digital Terbaik ✨</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-1.5 block">Username</label>
              <Input 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                placeholder="Masukkan username Anda" 
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-1.5 block">Password</label>
              <Input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="Masukkan password Anda" 
                required
              />
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded-lg flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {error}
              </motion.div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-brand-pink hover:bg-brand-pink-glow text-white py-3 shadow-lg shadow-brand-pink/20 disabled:opacity-70 mt-2"
              disabled={loading}
            >
              {loading ? 'Sedang Masuk...' : 'Masuk Dashboard'}
            </Button>

            <div className="text-center text-xs text-zinc-600 mt-6 pt-6 border-t border-zinc-900 flex flex-col gap-2">
              <span className="font-semibold text-zinc-400">Premiumin Plus</span>
              <span className="text-[10px] text-zinc-700">Made With ♥ Premiumin Plus</span>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
};

const DashboardHome = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ saldo: 0, saldo_keluar: 0, total_pendapatan: 0, total_pesanan: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [markup, setMarkup] = useState(0);

  useEffect(() => {
    if (user?.role === 'reseller') {
      fetch('/api/user/saldo').then(r => r.json()).then(d => {
        setStats(prev => ({ ...prev, saldo: d.saldo }));
        setMarkup(d.markup_percent);
      });
      fetch('/api/user/stats').then(r => r.json()).then(d => setStats(prev => ({ ...prev, ...d })));
      fetch('/api/user/transaksi').then(r => r.json()).then(setTransactions);
    }
  }, [user]);

  const updateMarkup = async () => {
    await fetch('/api/user/markup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markup })
    });
    alert('Markup updated');
  };

  if (user?.role === 'admin') return <AdminDashboard />;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-brand-pink to-brand-pink-glow border-none relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Wallet className="w-24 h-24" />
          </div>
          <p className="text-white/70 text-xs font-bold uppercase tracking-widest">Saldo Tersedia</p>
          <h3 className="text-3xl font-bold text-white mt-2">Rp {stats.saldo.toLocaleString()}</h3>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-white/50 text-[10px] uppercase font-bold">Realtime</span>
            <Button className="bg-white/10 hover:bg-white/20 text-white text-[10px] px-3 py-1 rounded-full border border-white/10">Isi Saldo</Button>
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Saldo Keluar</p>
              <div className="p-2 bg-red-500/10 rounded-lg"><TrendingDown className="w-4 h-4 text-red-500" /></div>
            </div>
            <h3 className="text-2xl font-bold text-white mt-2">Rp {stats.saldo_keluar.toLocaleString()}</h3>
          </div>
          <div className="mt-4 h-1 bg-zinc-900 rounded-full overflow-hidden">
            <div className="h-full bg-red-500/30 w-1/2" />
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Total Pendapatan</p>
              <div className="p-2 bg-green-500/10 rounded-lg"><TrendingUp className="w-4 h-4 text-green-500" /></div>
            </div>
            <h3 className="text-2xl font-bold text-white mt-2">Rp {stats.total_pendapatan.toLocaleString()}</h3>
          </div>
          <p className="text-[10px] text-zinc-600 mt-4 uppercase font-bold tracking-widest">Profit Reseller</p>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Total Pesanan</p>
              <div className="p-2 bg-blue-500/10 rounded-lg"><Package className="w-4 h-4 text-blue-500" /></div>
            </div>
            <h3 className="text-2xl font-bold text-white mt-2">{stats.total_pesanan}</h3>
          </div>
          <p className="text-[10px] text-zinc-600 mt-4 uppercase font-bold tracking-widest">Transaksi Berhasil</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="p-0 overflow-hidden">
            <div className="p-6 border-b border-zinc-900 flex items-center justify-between">
              <h4 className="font-bold flex items-center gap-2"><History className="w-4 h-4 text-brand-pink" /> Riwayat Terakhir</h4>
              <Button onClick={() => window.location.href='/transactions'} className="text-xs text-zinc-400 hover:text-zinc-200">Lihat Semua</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <tbody className="divide-y divide-zinc-900">
                  {transactions.slice(0, 8).map(tx => (
                    <tr key={tx.id} className="hover:bg-zinc-900/30 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-zinc-200">{tx.produk}</p>
                        <p className="text-[10px] text-zinc-600">{new Date(tx.created_at).toLocaleString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-zinc-400 font-mono">Beli: Rp {tx.harga_beli.toLocaleString()}</p>
                        <p className="text-xs text-green-500 font-mono font-bold">Profit: Rp {tx.keuntungan.toLocaleString()}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-green-500/10 text-green-500 tracking-wider">sukses</span>
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr><td className="px-6 py-12 text-center text-zinc-600 italic text-sm">Belum ada transaksi</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-8">
          <Card>
            <h4 className="font-bold flex items-center gap-2 mb-6 text-brand-pink"><TrendingUp className="w-4 h-4" /> Markup Harga (%)</h4>
            <p className="text-[10px] text-zinc-500 mb-6 leading-relaxed uppercase font-bold tracking-widest">Atur keuntungan Anda untuk setiap produk yang dijual.</p>
            <div className="flex gap-2">
              <Input type="number" value={markup} onChange={e => setMarkup(parseInt(e.target.value))} />
              <Button onClick={updateMarkup} className="bg-brand-pink hover:bg-brand-pink-glow text-white">Update</Button>
            </div>
            <p className="text-[9px] text-zinc-700 mt-4">Keuntungan = Harga Panel * {markup}%</p>
          </Card>

          <Card>
            <h4 className="font-bold flex items-center gap-2 mb-6 text-brand-pink"><Info className="w-4 h-4" /> Informasi Panel</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">System Version</span>
                <span className="text-xs font-mono text-zinc-300">V1.0.0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Server Time</span>
                <span className="text-xs font-mono text-zinc-300">{new Date().toLocaleTimeString()}</span>
              </div>
              <div className="pt-4 border-t border-zinc-900">
                <Button className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs">Hubungi Support</Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

const OrderPage = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(d => { setProducts(d); setLoading(false); });
  }, []);

  const handleOrder = async (p: any) => {
    if (!confirm(`Konfirmasi pembelian ${p.name} seharga Rp ${(p.harga_dasar + Math.round(p.harga_dasar * p.margin / 100)).toLocaleString()}?`)) return;
    setOrdering(p.id);
    try {
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: p.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      alert('Pesanan berhasil!');
      // Refresh balance or products if needed
    } catch (err: any) {
      alert(err.message);
    } finally {
      setOrdering(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {loading ? (
        <div className="col-span-full py-20 text-center text-zinc-500">Memuat produk...</div>
      ) : products.length === 0 ? (
        <div className="col-span-full py-20 text-center text-zinc-500 italic">Belum ada produk tersedia. Silakan hubungi admin.</div>
      ) : products.map(p => {
        const finalPrice = p.harga_dasar + Math.round((p.harga_dasar * p.margin) / 100);
        return (
          <Card key={p.id} className="group hover:border-pink-900/50 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className={cn(
                  "text-[10px] font-bold uppercase px-2 py-1 rounded-full",
                  p.stok > 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                )}>
                  {p.stok > 0 ? 'Ready Stok' : 'Stok Habis'}
                </span>
                <span className="text-zinc-500 text-[10px]">ID: #{p.id}</span>
              </div>
              <h3 className="text-lg font-bold group-hover:text-pink-500 transition-colors uppercase tracking-tight">{p.name}</h3>
              <p className="text-zinc-600 text-xs mt-1">Sisa Stok: {p.stok}</p>
            </div>
            
            <div className="mt-8 pt-6 border-t border-zinc-900">
              <div className="flex items-center justify-between mb-4">
                <span className="text-zinc-500 text-xs font-medium">Beli Sekarang</span>
                <span className="text-xl font-mono font-bold text-white">Rp {finalPrice.toLocaleString()}</span>
              </div>
              <Button 
                onClick={() => handleOrder(p)}
                disabled={p.stok <= 0 || ordering === p.id}
                className={cn(
                  "w-full py-3 text-sm tracking-widest uppercase",
                  p.stok > 0 ? "bg-pink-600 hover:bg-pink-700 text-white" : "bg-zinc-900 text-zinc-700 cursor-not-allowed"
                )}
              >
                {ordering === p.id ? 'Memproses...' : 'Order Now'}
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

const AdminDashboard = () => {
  const [stats, setStats] = useState({ total_users: 0, total_tx: 0, total_saldo: 0, pending_wd: 0, total_revenue: 0 });
  const [usersList, setUsersList] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/admin/users').then(r => r.json()).then(d => {
      setUsersList(d);
      setStats(prev => ({
        ...prev,
        total_users: d.length,
        total_saldo: d.reduce((acc: number, u: any) => acc + u.saldo, 0)
      }));
    });
    fetch('/api/admin/withdraws').then(r => r.json()).then(d => {
      setStats(prev => ({ ...prev, pending_wd: d.filter((w: any) => w.status === 'pending').length }));
    });
    fetch('/api/admin/all-transaksi').then(r => r.json()).then(d => {
      setStats(prev => ({ 
        ...prev, 
        total_tx: d.length,
        total_revenue: d.reduce((acc: number, tx: any) => acc + tx.harga_beli, 0)
      }));
    });
  }, []);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { name: 'Total Users', val: stats.total_users, icon: Users, color: 'text-blue-500' },
          { name: 'Total Omset', val: `Rp ${stats.total_revenue.toLocaleString()}`, icon: TrendingUp, color: 'text-green-500' },
          { name: 'Pending WD', val: stats.pending_wd, icon: Wallet, color: 'text-brand-pink' },
          { name: 'Total Pesanan', val: stats.total_tx, icon: ShoppingCart, color: 'text-pink-500' },
        ].map((s, i) => (
          <Card key={i} className="p-5 border-zinc-900/50">
            <div className="flex items-center gap-3 mb-2">
              <s.icon className={cn("w-4 h-4", s.color)} />
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{s.name}</span>
            </div>
            <p className="text-xl font-bold text-white">{s.val}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <AddUserForm />
        <AddProductForm />
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-6 border-b border-zinc-900 flex items-center justify-between">
          <h4 className="font-bold flex items-center gap-2"><Users className="w-4 h-4 text-brand-pink" /> Daftar Reseller</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-900/50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Username</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Saldo</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">Markup</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {usersList.map((u: any) => (
                <tr key={u.id} className="hover:bg-zinc-900/10 text-sm">
                  <td className="px-6 py-4 font-bold text-zinc-200">{u.username}</td>
                  <td className="px-6 py-4 uppercase text-[10px] font-bold text-zinc-500 tracking-widest">{u.role}</td>
                  <td className="px-6 py-4 font-mono">Rp {u.saldo.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right font-mono">{u.markup_percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="p-6 border-b border-zinc-900 flex items-center justify-between">
          <h4 className="font-bold flex items-center gap-2"><Key className="w-4 h-4 text-brand-pink" /> API Settings</h4>
        </div>
        <div className="p-6">
           <AdminSettings />
        </div>
      </Card>
    </div>
  );
};

const AddUserForm = () => {
  const [form, setForm] = useState({ username: '', password: '', role: 'reseller', saldo: 0 });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error('Failed to create user');
      alert('User berhasil dibuat');
      setForm({ username: '', password: '', role: 'reseller', saldo: 0 });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <h4 className="font-bold flex items-center gap-2 mb-6"><Plus className="w-4 h-4 text-pink-500" /> Tambah User Baru</h4>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Username</label>
          <Input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
        </div>
        <div>
          <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Password</label>
          <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
        </div>
        <div>
          <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Role</label>
          <select 
            className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white"
            value={form.role} onChange={e => setForm({ ...form, role: e.target.value as any })}
          >
            <option value="reseller">Reseller</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Saldo Awal</label>
          <Input type="number" value={form.saldo} onChange={e => setForm({ ...form, saldo: parseInt(e.target.value) })} />
        </div>
        <Button disabled={loading} className="col-span-2 bg-pink-600 hover:bg-pink-700 text-white mt-2">
          {loading ? 'Menyimpan...' : 'Tambah User'}
        </Button>
      </form>
    </Card>
  );
};

const AddProductForm = () => {
  const [form, setForm] = useState({ name: '', harga_dasar: 0, margin: 10, stok: 100 });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    alert('Produk berhasil ditambah');
    setForm({ name: '', harga_dasar: 0, margin: 10, stok: 100 });
  };

  return (
    <Card>
      <h4 className="font-bold flex items-center gap-2 mb-6"><Plus className="w-4 h-4 text-pink-500" /> Tambah Produk Baru</h4>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Nama Produk</label>
          <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Harga Dasar (IDR)</label>
          <Input type="number" value={form.harga_dasar} onChange={e => setForm({ ...form, harga_dasar: parseInt(e.target.value) })} required />
        </div>
        <div>
          <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Margin (%)</label>
          <Input type="number" value={form.margin} onChange={e => setForm({ ...form, margin: parseInt(e.target.value) })} required />
        </div>
        <div className="col-span-2">
          <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Stok Tersedia</label>
          <Input type="number" value={form.stok} onChange={e => setForm({ ...form, stok: parseInt(e.target.value) })} required />
        </div>
        <Button className="col-span-2 bg-brand-pink hover:bg-brand-pink-glow text-white mt-2">Tambah Produk</Button>
      </form>
    </Card>
  );
};

const AdminSettings = () => {
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(d => {
      const api = d.find((s: any) => s.key === 'API_KEY');
      if (api) setApiKey(api.value);
    });
  }, []);

  const handleUpdate = async () => {
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'API_KEY', value: apiKey })
    });
    alert('API Key updated');
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-zinc-500 block mb-2 font-medium">Integration API Key</label>
        <div className="flex gap-2">
          <Input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="API_SECRET_KEY..." />
          <Button onClick={handleUpdate} className="bg-pink-600 hover:bg-pink-700 text-white px-6 whitespace-nowrap">Save API Key</Button>
        </div>
      </div>
    </div>
  );
};

const LogsPage = () => {
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => {
    fetch('/api/admin/logs').then(r => r.json()).then(setLogs);
  }, []);

  return (
    <Card className="p-0 overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-zinc-900/50">
          <tr>
            <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">User</th>
            <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Activity</th>
            <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">IP Address</th>
            <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-900">
          {logs.map(log => (
            <tr key={log.id} className="hover:bg-zinc-900/10 text-sm">
              <td className="px-6 py-4 font-medium">{log.username}</td>
              <td className="px-6 py-4 capitalize">
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                  log.activity === 'login' ? "text-green-500" : "text-zinc-500"
                )}>
                  {log.activity}
                </span>
              </td>
              <td className="px-6 py-4 font-mono text-xs text-zinc-600">{log.ip_address}</td>
              <td className="px-6 py-4 text-right text-zinc-500">{new Date(log.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

const UserTransactions = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  useEffect(() => {
    fetch('/api/user/transaksi').then(r => r.json()).then(setTransactions);
  }, []);

  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-6 border-b border-zinc-900 flex items-center justify-between">
        <h4 className="font-bold flex items-center gap-2"><History className="w-4 h-4 text-brand-pink" /> Riwayat Transaksi</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-zinc-900/30">
              <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Produk</th>
              <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Detail Harga</th>
              <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-10 text-center text-zinc-600 text-sm italic">Belum ada transaksi</td>
              </tr>
            ) : transactions.map(tx => (
              <tr key={tx.id} className="hover:bg-zinc-900/30 transition-colors text-sm">
                <td className="px-6 py-4">
                  <p className="font-medium text-zinc-200">{tx.produk}</p>
                  <p className="text-[10px] text-zinc-600 font-mono">#{tx.id} • {new Date(tx.created_at).toLocaleString()}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <p className="text-[11px] text-zinc-400">Total: <span className="font-mono">Rp {tx.harga_jual.toLocaleString()}</span></p>
                    <p className="text-[11px] text-green-500 font-bold">Profit: <span className="font-mono">Rp {tx.keuntungan.toLocaleString()}</span></p>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-green-500/10 text-green-500 tracking-wider">sukses</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

const AdminTransactions = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  useEffect(() => {
    fetch('/api/admin/all-transaksi').then(r => r.json()).then(setTransactions);
  }, []);

  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-6 border-b border-zinc-900 flex items-center justify-between">
        <h4 className="font-bold flex items-center gap-2"><History className="w-4 h-4 text-brand-pink" /> Semua Transaksi</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-zinc-900/50">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">User</th>
              <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Produk</th>
              <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Harga Beli</th>
              <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {transactions.map(tx => (
              <tr key={tx.id} className="hover:bg-zinc-900/10 text-sm">
                <td className="px-6 py-4">
                  <p className="font-bold text-zinc-200">{tx.username}</p>
                  <p className="text-[10px] text-zinc-600">{new Date(tx.created_at).toLocaleDateString()}</p>
                </td>
                <td className="px-6 py-4">{tx.produk}</td>
                <td className="px-6 py-4 font-mono font-bold text-zinc-400">Rp {tx.harga_beli.toLocaleString()}</td>
                <td className="px-6 py-4 text-right">
                  <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-green-500/10 text-green-500 tracking-wider">
                    {tx.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

const UserWithdraws = () => {
  const [withdraws, setWithdraws] = useState<any[]>([]);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchWds = () => fetch('/api/user/withdraws').then(r => r.json()).then(setWithdraws);

  useEffect(() => { fetchWds(); }, []);

  const handleWD = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/user/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseInt(amount) })
      });
      if (!res.ok) throw new Error((await res.json()).message);
      alert('WD request sent');
      setAmount('');
      fetchWds();
    } catch (err: any) { alert(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Card>
        <h4 className="font-bold flex items-center gap-2 mb-6 text-brand-pink"><Wallet className="w-4 h-4" /> Tarik Pendapatan</h4>
        <form onSubmit={handleWD} className="space-y-4">
          <div>
            <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Jumlah Withdraw (IDR)</label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>
          <Button disabled={loading} className="w-full bg-brand-pink hover:bg-brand-pink-glow text-white">
            {loading ? 'Processing...' : 'Request Withdraw'}
          </Button>
          <p className="text-[10px] text-zinc-600 text-center uppercase tracking-widest font-bold">Dana akan dikirim ke nomor yang terdaftar di sistem.</p>
        </form>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="p-6 border-b border-zinc-900">
          <h4 className="font-bold">Status Withdraw</h4>
        </div>
        <table className="w-full text-left">
          <tbody className="divide-y divide-zinc-900">
            {withdraws.map(w => (
              <tr key={w.id} className="text-sm">
                <td className="px-6 py-4 font-mono font-bold">Rp {w.amount.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                    w.status === 'approved' ? "bg-green-500/10 text-green-500" :
                    w.status === 'pending' ? "bg-yellow-500/10 text-yellow-500" : "bg-red-500/10 text-red-500"
                  )}>
                    {w.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-zinc-600 text-xs">{new Date(w.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

const AdminWithdraws = () => {
  const [withdraws, setWithdraws] = useState<any[]>([]);

  const fetchWds = () => fetch('/api/admin/withdraws').then(r => r.json()).then(setWithdraws);
  useEffect(() => { fetchWds(); }, []);

  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/admin/withdraws/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    fetchWds();
  };

  return (
    <Card className="p-0 overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-zinc-900/50">
          <tr>
            <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">User</th>
            <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Amount</th>
            <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Status</th>
            <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-900">
          {withdraws.map(w => (
            <tr key={w.id} className="hover:bg-zinc-900/10 text-sm">
              <td className="px-6 py-4 font-bold">{w.username}</td>
              <td className="px-6 py-4 font-mono">Rp {w.amount.toLocaleString()}</td>
              <td className="px-6 py-4 capitalize">
                <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                    w.status === 'approved' ? "text-green-500" :
                    w.status === 'pending' ? "text-yellow-500" : "text-red-500"
                  )}>
                  {w.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right space-x-2">
                {w.status === 'pending' && (
                  <>
                    <Button onClick={() => updateStatus(w.id, 'approved')} className="bg-green-600/20 text-green-500 text-[10px] uppercase font-bold py-1 px-3">Approve</Button>
                    <Button onClick={() => updateStatus(w.id, 'rejected')} className="bg-red-600/20 text-red-500 text-[10px] uppercase font-bold py-1 px-3">Reject</Button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
};

// --- Main App ---


const AppContent = () => {
  const { user, loading } = useAuth();
  
  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-pink-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return <LoginPage />;

  return (
    <Routes>
      <Route path="/" element={<DashboardLayout title="Ringkasan Panel"><DashboardHome /></DashboardLayout>} />
      <Route path="/order" element={<DashboardLayout title="Beli Produk Digital"><OrderPage /></DashboardLayout>} />
      <Route path="/transactions" element={<DashboardLayout title="Riwayat Pesanan"><UserTransactions /></DashboardLayout>} />
      <Route path="/withdraw" element={<DashboardLayout title="Tarik Pendapatan"><UserWithdraws /></DashboardLayout>} />
      
      {/* Admin Specific */}
      {user.role === 'admin' && (
        <>
          <Route path="/admin/users" element={<DashboardLayout title="Manajemen User"><div className="space-y-8"><AdminDashboard /></div></DashboardLayout>} />
          <Route path="/admin/transactions" element={<DashboardLayout title="Semua Transaksi Pelanggan"><AdminTransactions /></DashboardLayout>} />
          <Route path="/admin/withdraws" element={<DashboardLayout title="Manajemen Penarikan"><AdminWithdraws /></DashboardLayout>} />
          <Route path="/admin/logs" element={<DashboardLayout title="Log Aktivitas Sistem"><LogsPage /></DashboardLayout>} />
          <Route path="/admin/settings" element={<DashboardLayout title="Pengaturan Lanjutan"><AdminSettings /></DashboardLayout>} />
        </>
      )}
      
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}
