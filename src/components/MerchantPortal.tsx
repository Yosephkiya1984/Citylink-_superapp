import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, Package, DollarSign, BarChart3,
  Settings, LogOut, PlusCircle, Image as ImageIcon,
  AlertTriangle, Trash2, Edit, MoreVertical, Search, Users, Menu,
  Wallet, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, ChevronRight, X
} from 'lucide-react';
import { useGlobalState } from './context/GlobalStateContext';
import { api } from '../services/api';
import MerchantOrdersView from './features/merchant/MerchantOrdersView';

const MerchantPortal: React.FC = () => {
  const { profile, setProfile, setUserRole } = useGlobalState();
  const [activeView, setActiveView] = useState('dashboard');
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ revenue: 0, customers: 0, escrowBalance: 0, totalWithdrawn: 0 });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [profile?.id]);

  const loadDashboardData = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const [merchantStats, merchantProducts, merchantOrders, recentTxs] = await Promise.all([
        api.getMerchantStats(profile.id),
        api.getMerchantProducts(profile.id),
        api.getMerchantOrders(profile.id),
        api.getTransactions(profile.id)
      ]);

      setProducts(merchantProducts);
      setOrders(merchantOrders);
      setStats({
        ...merchantStats,
        totalWithdrawn: merchantStats.withdrawals
      });
      
    } catch (error: any) {
      console.error("MerchantPortal: Failed to load portal data", error);
      if (error.message?.includes('fetch') || error.message?.includes('timed out')) {
        alert("Connection error: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (e) {
      console.error("Logout error:", e);
    }
    setProfile(null);
  };

  const renderContent = () => {
    if (loading && activeView === 'dashboard') {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
    }

    switch (activeView) {
      case 'dashboard':
        return <DashboardView stats={stats} orders={orders} products={products} setActiveView={setActiveView} setShowAddProductModal={setShowAddProductModal} />;
      case 'products':
        return <ProductsView products={products} setProducts={setProducts} showAddModal={showAddProductModal} setShowAddModal={setShowAddProductModal} />;
      case 'orders':
        return <MerchantOrdersView />;
      case 'finance':
        return <FinanceView stats={stats} profile={profile} onRefresh={loadDashboardData} />;
      case 'reports':
        return <ReportsView stats={stats} orders={orders} />;
      case 'settings':
        return <SettingsView profile={profile} />;
      default:
        return <DashboardView stats={stats} orders={orders} products={products} setActiveView={setActiveView} setShowAddProductModal={setShowAddProductModal} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col md:flex-row font-sans">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-6 bg-slate-900/50 border-b border-white/5 backdrop-blur-xl sticky top-0 z-50">
        <button onClick={() => setIsSidebarOpen(true)} className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 text-slate-950 rounded-lg flex items-center justify-center font-black text-xs">
            {profile?.merchant_name?.charAt(0)}
          </div>
          <span className="font-black text-xs uppercase tracking-widest">Merchant</span>
        </div>
        <button onClick={handleLogout} className="w-10 h-10 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center">
          <LogOut size={20} />
        </button>
      </div>

      <Sidebar 
        profile={profile} 
        activeView={activeView} 
        setActiveView={(v: string) => { setActiveView(v); setIsSidebarOpen(false); }} 
        handleLogout={handleLogout} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 p-6 md:p-12 overflow-y-auto max-w-7xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

const Sidebar: React.FC<any> = ({ profile, activeView, setActiveView, handleLogout, isOpen, onClose }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'products', label: 'Products', icon: <Package size={20} /> },
    { id: 'orders', label: 'Orders', icon: <DollarSign size={20} /> },
    { id: 'finance', label: 'Finance', icon: <Wallet size={20} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
  ];

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] md:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={`fixed md:sticky top-0 inset-y-0 left-0 z-[70] w-72 bg-slate-900/50 border-r border-white/5 flex flex-col transform transition-transform duration-500 ease-in-out md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500 text-slate-950 rounded-[1rem] flex items-center justify-center font-black text-xl shadow-lg shadow-emerald-500/20">
              {profile?.merchant_name?.charAt(0)}
            </div>
            <div className="min-w-0">
              <h2 className="font-black text-sm uppercase tracking-tight truncate">{profile?.merchant_name}</h2>
              <p className="text-[10px] text-slate-500 font-mono truncate opacity-60">ID: {profile?.id?.slice(0, 8)}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-2">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all group ${
                activeView === item.id 
                ? 'bg-emerald-500 text-slate-950 font-black shadow-xl shadow-emerald-500/10' 
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className={activeView === item.id ? 'text-slate-950' : 'text-slate-500 group-hover:text-emerald-500 transition-colors'}>
                {item.icon}
              </span>
              <span className="text-sm uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-4 p-4 rounded-2xl text-red-500 hover:bg-red-500/10 transition-all text-sm font-black uppercase tracking-widest"
          >
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

const DashboardView: React.FC<any> = ({ stats, orders, products, setActiveView, setShowAddProductModal }) => {
  const pendingOrders = orders.filter((o: any) => o.status === 'PAID' || o.status === 'SHIPPED' || o.status === 'DELIVERED').length;

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
        >
          <p className="text-emerald-500 font-mono text-[10px] uppercase tracking-[0.5em] mb-3">Merchant Intelligence</p>
          <h1 className="text-6xl font-black tracking-tighter uppercase leading-none">Command<br/>Center</h1>
        </motion.div>
        <div className="flex items-center gap-4">
          <div className="bg-slate-900/50 border border-white/5 px-8 py-4 rounded-3xl flex items-center gap-4 backdrop-blur-xl">
            <div className="relative">
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping absolute inset-0"></div>
              <div className="w-3 h-3 bg-emerald-500 rounded-full relative z-10"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Node Status</span>
              <span className="text-xs font-bold text-white uppercase tracking-tight">Active & Secure</span>
            </div>
          </div>
        </div>
      </header>

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-2">
          <StatCard 
            title="Total Revenue" 
            value={stats.revenue} 
            unit="ETB" 
            icon={<DollarSign size={28} />} 
            color="emerald" 
            trend="+12.5%"
            large
          />
        </div>
        <StatCard title="Escrow Vault" value={stats.escrowBalance} unit="ETB" icon={<ShieldCheck size={24} />} color="blue" />
        <StatCard title="Customers" value={stats.customers} icon={<Users size={24} />} color="purple" />
        <StatCard title="Pending Fulfillment" value={pendingOrders} icon={<Clock size={24} />} color="yellow" />
        <StatCard title="Inventory Items" value={products.length} icon={<Package size={24} />} color="slate" />
        <div className="md:col-span-2 bg-slate-900/30 border border-white/5 rounded-[2.5rem] p-8 flex items-center justify-between group hover:bg-slate-900/50 transition-all">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Quick Action</p>
            <h4 className="text-2xl font-black uppercase tracking-tight">Expand Your Catalog</h4>
            <p className="text-sm text-slate-500 font-medium">Add new products to reach more citizens.</p>
          </div>
          <button 
            onClick={() => {
              setActiveView('products');
              setShowAddProductModal(true);
            }}
            className="w-16 h-16 bg-emerald-500 text-slate-950 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-emerald-500/20 hover:scale-110 active:scale-95 transition-all"
          >
            <PlusCircle size={32} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-slate-900/30 border border-white/5 rounded-[3rem] p-10 space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-2xl font-black uppercase tracking-tight">Recent Activity</h3>
              <p className="text-xs text-slate-500 font-medium">Latest orders and status updates</p>
            </div>
            <button 
              onClick={() => setActiveView('orders')}
              className="px-6 py-2 bg-slate-950 border border-white/5 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
            >
              View Ledger
            </button>
          </div>
          <div className="space-y-4">
            {orders.slice(0, 5).map((order: any, idx: number) => (
              <motion.div 
                key={order.id} 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-6 p-5 bg-slate-950/50 border border-white/5 rounded-[2rem] group hover:border-emerald-500/30 transition-all"
              >
                <div className="relative">
                  <img src={order.product.imageUrl} className="w-16 h-16 rounded-2xl object-cover shadow-2xl" alt="" referrerPolicy="no-referrer" />
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 text-slate-950 rounded-full flex items-center justify-center text-[10px] font-black border-4 border-slate-950">
                    {order.quantity}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-lg uppercase tracking-tight truncate group-hover:text-emerald-400 transition-colors">{order.product.name}</p>
                  <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">REF: {order.id.slice(0, 8)}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-xl text-white">{order.totalAmount.toLocaleString()} <span className="text-[10px] font-normal opacity-40">ETB</span></p>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                    order.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500' :
                    order.status === 'CANCELLED' ? 'bg-red-500/10 text-red-500' :
                    'bg-blue-500/10 text-blue-500'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </motion.div>
            ))}
            {orders.length === 0 && (
              <div className="py-20 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-950 rounded-2xl flex items-center justify-center mx-auto text-slate-800 border border-white/5">
                  <Clock size={32} />
                </div>
                <p className="text-slate-600 font-black uppercase tracking-widest text-xs">Waiting for first order...</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-emerald-500 text-slate-950 p-10 rounded-[3rem] space-y-6 shadow-2xl shadow-emerald-500/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700"></div>
            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between">
                <Wallet size={32} />
                <ArrowUpRight size={24} className="opacity-40" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Payout Ready</p>
                <p className="text-5xl font-black tracking-tighter">{(stats.revenue - stats.totalWithdrawn).toLocaleString()}</p>
                <p className="text-xs font-bold uppercase tracking-widest opacity-60 mt-2">ETB Available</p>
              </div>
              <button 
                onClick={() => setActiveView('finance')}
                className="w-full bg-slate-950 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-2xl"
              >
                Initiate Withdrawal
              </button>
            </div>
          </div>

          <div className="bg-slate-900/30 border border-white/5 rounded-[3rem] p-10 space-y-6">
            <h3 className="text-xl font-black uppercase tracking-tight">Market Insights</h3>
            <div className="space-y-6">
              <InsightRow label="Conversion Rate" value="4.2%" trend="+0.8%" />
              <InsightRow label="Avg. Order Value" value="1,240 ETB" trend="-2%" />
              <InsightRow label="Return Rate" value="0.5%" trend="Stable" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InsightRow = ({ label, value, trend }: any) => (
  <div className="flex items-center justify-between">
    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{label}</p>
    <div className="text-right">
      <p className="font-black text-white">{value}</p>
      <p className={`text-[9px] font-black uppercase tracking-widest ${
        trend.includes('+') ? 'text-emerald-500' : trend.includes('-') ? 'text-red-500' : 'text-slate-500'
      }`}>{trend}</p>
    </div>
  </div>
);

const QuickAction = ({ icon, label, color, onClick }: any) => {
  const colorClasses: any = {
    emerald: 'bg-emerald-500/10 text-emerald-500',
    blue: 'bg-blue-500/10 text-blue-500',
    purple: 'bg-purple-500/10 text-purple-500',
    slate: 'bg-slate-500/10 text-slate-500'
  };

  return (
    <button 
      onClick={onClick}
      className="p-6 rounded-[2rem] border border-white/5 bg-slate-950/50 hover:bg-slate-900 transition-all group text-left space-y-4"
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colorClasses[color] || colorClasses.slate} group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <p className="text-xs font-black uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors">{label}</p>
    </button>
  );
};

const ProductsView: React.FC<any> = ({ products, setProducts, showAddModal, setShowAddModal }) => {
  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-emerald-500 font-mono text-[10px] uppercase tracking-[0.4em] mb-2">Inventory Management</p>
          <h1 className="text-5xl font-black tracking-tighter uppercase">Products</h1>
        </div>
        <button 
          onClick={() => setShowAddModal(true)} 
          className="bg-emerald-500 text-slate-950 font-black py-4 px-8 rounded-[1.5rem] flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20 hover:scale-105 transition-all active:scale-95 uppercase tracking-tighter w-full md:w-auto"
        >
          <PlusCircle size={20} />
          Add Product
        </button>
      </header>

      <div className="bg-slate-900/30 border border-white/5 rounded-[2.5rem] overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5">
                <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Product Details</th>
                <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Price</th>
                <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Inventory</th>
                <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Status</th>
                <th className="p-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {products.map((p: any) => (
                <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                  <td className="p-8">
                    <div className="flex items-center gap-6">
                      <img src={p.imageUrl} alt={p.name} className="w-16 h-16 rounded-2xl object-cover shadow-2xl" referrerPolicy="no-referrer" />
                      <div>
                        <p className="font-black text-lg uppercase tracking-tight text-white">{p.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-1">ID: {p.id.slice(0, 8)} | {p.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-8">
                    <p className="text-xl font-black text-emerald-500">{p.price.toLocaleString()} <span className="text-xs font-normal opacity-40">ETB</span></p>
                  </td>
                  <td className="p-8">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${p.stock > 10 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                      <p className="text-sm font-bold text-slate-300">{p.stock} Units</p>
                    </div>
                  </td>
                  <td className="p-8">
                    <span className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full ${
                      p.stock > 0 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                    }`}>
                      {p.stock > 0 ? 'Active' : 'Out of Stock'}
                    </span>
                  </td>
                  <td className="p-8 text-right">
                    <button className="w-10 h-10 rounded-xl bg-slate-950 border border-white/5 flex items-center justify-center text-slate-500 hover:text-white hover:border-white/20 transition-all">
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-white/5">
          {products.map((p: any) => (
            <div key={p.id} className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <img src={p.imageUrl} alt={p.name} className="w-16 h-16 rounded-2xl object-cover" referrerPolicy="no-referrer" loading="lazy" />
                <div className="flex-1 min-w-0">
                  <p className="font-black text-lg uppercase tracking-tight text-white truncate">{p.name}</p>
                  <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">{p.category}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Price</p>
                  <p className="text-xl font-black text-emerald-500">{p.price.toLocaleString()} ETB</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Stock</p>
                  <p className="text-sm font-bold text-slate-300">{p.stock} Units</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full ${
                  p.stock > 0 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                }`}>
                  {p.stock > 0 ? 'Active' : 'Out of Stock'}
                </span>
                <button className="p-2 text-slate-500">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {products.length === 0 && (
          <div className="p-20 text-center">
            <div className="w-20 h-20 bg-slate-950 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-slate-800 border border-white/5">
              <Package size={40} />
            </div>
            <p className="text-slate-500 font-bold uppercase tracking-widest">No products in your catalog</p>
          </div>
        )}
      </div>

      {showAddModal && <AddProductModal onClose={() => setShowAddModal(false)} setProducts={setProducts} />}
    </div>
  );
};

const AddProductModal: React.FC<any> = ({ onClose, setProducts }) => {
  const { profile } = useGlobalState();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [imageFile, setImageFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const categories = ['Electronics', 'Fashion', 'Home', 'Food', 'Beauty', 'Sports', 'Books', 'Other'];

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Basic size check
      if (file.size > 10 * 1024 * 1024) {
        alert("Image is too large. Please select an image under 10MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.src = reader.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG with 0.7 quality
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setImageFile(compressedDataUrl);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!name || !price || !stock) return;
    setLoading(true);
    try {
      const newProduct = await api.createProduct({
        merchantId: profile?.id,
        name,
        description,
        price: Number(price),
        stock: Number(stock),
        category,
        imageUrl: imageFile || `https://picsum.photos/seed/${name}/800/800`
      });
      setProducts((prev: any[]) => [...prev, newProduct]);
      onClose();
    } catch (error) {
      console.error("Failed to add product", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4 md:p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-slate-900 border border-white/10 rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 w-full max-w-2xl space-y-6 md:space-y-8 shadow-2xl max-h-[95vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase">New Product</h2>
          <button onClick={onClose} className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Product Image</label>
              <div 
                onClick={() => document.getElementById('product-image-input')?.click()}
                className="aspect-square bg-slate-950 border-2 border-dashed border-white/5 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500/50 transition-all overflow-hidden group relative"
              >
                {imageFile ? (
                  <>
                    <img src={imageFile} className="w-full h-full object-cover" alt="Preview" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <ImageIcon className="text-white" size={32} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-slate-700 group-hover:text-emerald-500 transition-colors mb-4">
                      <ImageIcon size={32} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Click to upload</p>
                  </>
                )}
                <input id="product-image-input" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Category</label>
              <select 
                value={category} 
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-white/5 p-5 rounded-2xl text-white focus:border-emerald-500 outline-none transition-all appearance-none"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Product Name</label>
              <input type="text" placeholder="e.g. Vintage Leather Bag" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-950 border border-white/5 p-5 rounded-2xl text-white focus:border-emerald-500 outline-none transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Description</label>
              <textarea placeholder="Tell your customers about this item..." value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-slate-950 border border-white/5 p-5 rounded-2xl h-32 text-white focus:border-emerald-500 outline-none transition-all resize-none"></textarea>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Price (ETB)</label>
                <input type="number" placeholder="0.00" value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-slate-950 border border-white/5 p-5 rounded-2xl text-white focus:border-emerald-500 outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Stock</label>
                <input type="number" placeholder="1" value={stock} onChange={e => setStock(e.target.value)} className="w-full bg-slate-950 border border-white/5 p-5 rounded-2xl text-white focus:border-emerald-500 outline-none transition-all" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 pt-4">
          <button onClick={onClose} className="order-2 md:order-1 flex-1 py-5 rounded-2xl font-black uppercase tracking-widest text-slate-500 hover:bg-white/5 transition-all">Cancel</button>
          <button 
            onClick={handleSubmit} 
            disabled={loading} 
            className="order-1 md:order-2 flex-1 bg-emerald-500 text-slate-950 font-black py-5 rounded-2xl shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 uppercase tracking-tighter"
          >
            {loading ? 'Publishing...' : 'Publish Product'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const FinanceView: React.FC<any> = ({ stats, profile, onRefresh }) => {
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTxs = async () => {
      if (!profile?.id) return;
      try {
        const data = await api.getTransactions(profile.id);
        setTransactions(data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadTxs();
  }, [profile?.id]);

  return (
    <div className="space-y-10">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-emerald-500 font-mono text-[10px] uppercase tracking-[0.4em] mb-2">Treasury & Payouts</p>
          <h1 className="text-5xl font-black tracking-tighter uppercase">Finance</h1>
        </div>
        <button 
          onClick={() => setShowWithdrawModal(true)} 
          className="bg-emerald-500 text-slate-950 font-black py-4 px-8 rounded-[1.5rem] flex items-center gap-3 shadow-xl shadow-emerald-500/20 hover:scale-105 transition-all active:scale-95 uppercase tracking-tighter"
        >
          <ArrowUpRight size={20} />
          Withdraw Funds
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-emerald-500 text-slate-950 p-10 rounded-[3rem] space-y-4 shadow-2xl shadow-emerald-500/20">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Available Balance</p>
          <p className="text-6xl font-black tracking-tighter">{(stats.revenue - stats.totalWithdrawn).toLocaleString()}</p>
          <p className="text-sm font-black uppercase tracking-widest opacity-60">ETB Total</p>
        </div>
        
        <div className="bg-blue-500 text-white p-10 rounded-[3rem] space-y-4 shadow-2xl shadow-blue-500/20">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Escrow Vault</p>
          <p className="text-6xl font-black tracking-tighter">{stats.escrowBalance.toLocaleString()}</p>
          <p className="text-sm font-black uppercase tracking-widest opacity-60">ETB Pending Release</p>
        </div>

        <div className="bg-slate-900/50 border border-white/5 p-10 rounded-[3rem] space-y-4">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Total Withdrawn</p>
          <p className="text-6xl font-black tracking-tighter text-white">{stats.totalWithdrawn.toLocaleString()}</p>
          <p className="text-sm font-black uppercase tracking-widest text-slate-500">ETB Lifetime</p>
        </div>
      </div>

      <div className="bg-slate-900/30 border border-white/5 rounded-[2.5rem] overflow-hidden">
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-xl font-black uppercase tracking-tight">Transaction History</h3>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-slate-950 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400">All</button>
            <button className="px-4 py-2 bg-transparent border border-transparent rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600">Payouts</button>
            <button className="px-4 py-2 bg-transparent border border-transparent rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600">Revenue</button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-950/30">
                <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Type</th>
                <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Date</th>
                <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Amount</th>
                <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {transactions.map((tx: any) => (
                <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-8">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        tx.type === 'WITHDRAWAL' ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        {tx.type === 'WITHDRAWAL' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                      </div>
                      <p className="font-bold text-sm uppercase tracking-tight">{tx.type}</p>
                    </div>
                  </td>
                  <td className="p-8">
                    <p className="text-sm font-bold text-slate-300">{new Date(tx.timestamp).toLocaleDateString()}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{new Date(tx.timestamp).toLocaleTimeString()}</p>
                  </td>
                  <td className="p-8">
                    <p className={`text-lg font-black ${tx.type === 'WITHDRAWAL' ? 'text-red-500' : 'text-emerald-500'}`}>
                      {tx.type === 'WITHDRAWAL' ? '-' : '+'}{Math.abs(tx.amount).toLocaleString()} ETB
                    </p>
                  </td>
                  <td className="p-8">
                    <span className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-20 text-center text-slate-600 font-bold uppercase tracking-widest">No transactions found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showWithdrawModal && (
        <WithdrawalModal 
          onClose={() => setShowWithdrawModal(false)} 
          balance={stats.revenue - stats.totalWithdrawn} 
          onSuccess={() => { onRefresh(); setShowWithdrawModal(false); }}
        />
      )}
    </div>
  );
};

const WithdrawalModal: React.FC<any> = ({ onClose, balance, onSuccess }) => {
  const { profile } = useGlobalState();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CBE');
  const [loading, setLoading] = useState(false);

  const handleWithdraw = async () => {
    if (!amount || Number(amount) <= 0 || Number(amount) > balance) return;
    setLoading(true);
    try {
      const res = await api.withdrawFunds(profile?.id || '', Number(amount), method, {
        accountNumber: 'MOCKED_ACCOUNT', // In a real app, this would come from a form
        accountName: profile?.name || profile?.merchant_name || 'Merchant'
      });
      if (res.success) {
        onSuccess();
      } else {
        alert(res.error || "Withdrawal failed");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-slate-900 border border-white/10 rounded-[3rem] p-10 w-full max-w-xl space-y-8 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-black tracking-tighter uppercase">Withdraw Funds</h2>
          <button onClick={onClose} className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="bg-emerald-500/5 border border-emerald-500/10 p-8 rounded-[2rem] text-center space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/60">Available for Payout</p>
          <p className="text-5xl font-black tracking-tighter text-emerald-500">{balance.toLocaleString()} ETB</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Withdrawal Amount</label>
            <input 
              type="number" 
              placeholder="0.00" 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              className="w-full bg-slate-950 border border-white/5 p-6 rounded-2xl text-3xl font-black text-white focus:border-emerald-500 outline-none transition-all text-center" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Payout Method</label>
            <div className="grid grid-cols-2 gap-4">
              {['CBE', 'Telebirr', 'Chapa', 'Abyssinia'].map(m => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`p-4 rounded-2xl border transition-all text-xs font-black uppercase tracking-widest ${
                    method === m ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-slate-950 text-slate-500 border-white/5 hover:border-white/10'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button 
          onClick={handleWithdraw}
          disabled={loading || !amount || Number(amount) > balance}
          className="w-full bg-emerald-500 text-slate-950 font-black py-6 rounded-2xl shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 uppercase tracking-tighter"
        >
          {loading ? 'Processing...' : 'Confirm Withdrawal'}
        </button>
      </motion.div>
    </div>
  );
};

const ReportsView: React.FC<any> = ({ stats, orders }) => {
  const monthlyRevenue = [
    { month: 'Jan', amount: stats.revenue * 0.4 },
    { month: 'Feb', amount: stats.revenue * 0.6 },
    { month: 'Mar', amount: stats.revenue },
  ];

  const topProducts = [
    { name: 'Leather Bag', sales: 45, revenue: 12500 },
    { name: 'Coffee Beans', sales: 32, revenue: 8400 },
    { name: 'Handmade Scarf', sales: 28, revenue: 5600 },
  ];

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-emerald-500 font-mono text-[10px] uppercase tracking-[0.4em] mb-2">Analytics & Insights</p>
          <h1 className="text-5xl font-black tracking-tighter uppercase">Reports</h1>
        </div>
        <div className="flex gap-2">
          <button className="px-6 py-3 bg-slate-900 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Export PDF</button>
          <button className="px-6 py-3 bg-slate-900 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Export CSV</button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-slate-900/30 border border-white/5 rounded-[2.5rem] p-10 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black uppercase tracking-tight">Revenue Growth</h3>
            <select className="bg-slate-950 border border-white/5 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl outline-none">
              <option>Last 3 Months</option>
              <option>Last 6 Months</option>
              <option>Last Year</option>
            </select>
          </div>
          <div className="h-64 flex items-end gap-6 pt-10">
            {monthlyRevenue.map((data, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                <div className="w-full relative">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${(data.amount / stats.revenue) * 100}%` }}
                    className="w-full bg-emerald-500 rounded-2xl transition-all group-hover:bg-emerald-400 shadow-xl shadow-emerald-500/10"
                  ></motion.div>
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white text-slate-950 text-[10px] font-black px-2 py-1 rounded pointer-events-none">
                    {data.amount.toLocaleString()}
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{data.month}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/30 border border-white/5 rounded-[2.5rem] p-10 space-y-8">
          <h3 className="text-xl font-black uppercase tracking-tight">Top Products</h3>
          <div className="space-y-6">
            {topProducts.map((product, i) => (
              <div key={i} className="flex items-center justify-between group">
                <div className="space-y-1">
                  <p className="text-sm font-black uppercase tracking-tight group-hover:text-emerald-500 transition-colors">{product.name}</p>
                  <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">{product.sales} Sales</p>
                </div>
                <p className="font-black text-white">{product.revenue.toLocaleString()} ETB</p>
              </div>
            ))}
          </div>
          <div className="pt-6 border-t border-white/5">
            <button className="w-full py-4 rounded-2xl bg-slate-950 border border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all">View Full Inventory Report</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ReportMiniCard label="Avg Order Value" value="450 ETB" trend="+12%" />
        <ReportMiniCard label="Conversion Rate" value="3.2%" trend="+0.5%" />
        <ReportMiniCard label="Customer Return" value="15%" trend="-2%" />
        <ReportMiniCard label="Active Listings" value="12" trend="0" />
      </div>
    </div>
  );
};

const ReportMiniCard = ({ label, value, trend }: any) => (
  <div className="bg-slate-900/30 border border-white/5 rounded-3xl p-6 space-y-2">
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
    <div className="flex items-end justify-between">
      <p className="text-2xl font-black tracking-tighter">{value}</p>
      {trend !== "0" && (
        <span className={`text-[10px] font-black ${trend.startsWith('+') ? 'text-emerald-500' : 'text-red-500'}`}>
          {trend}
        </span>
      )}
    </div>
  </div>
);

const SettingsView: React.FC<any> = ({ profile }) => {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }, 1500);
  };

  return (
    <div className="space-y-10">
      <header>
        <p className="text-emerald-500 font-mono text-[10px] uppercase tracking-[0.4em] mb-2">Store Configuration</p>
        <h1 className="text-5xl font-black tracking-tighter uppercase">Settings</h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-slate-900/30 border border-white/5 rounded-[2.5rem] p-10 space-y-8">
            <h3 className="text-xl font-black uppercase tracking-tight">General Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Store Name</label>
                <input type="text" defaultValue={profile?.merchant_name} className="w-full bg-slate-950 border border-white/5 p-5 rounded-2xl text-white focus:border-emerald-500 outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Business Email</label>
                <input type="email" defaultValue={profile?.email || 'contact@store.com'} className="w-full bg-slate-950 border border-white/5 p-5 rounded-2xl text-white focus:border-emerald-500 outline-none transition-all" />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Store Description</label>
                <textarea className="w-full bg-slate-950 border border-white/5 p-5 rounded-2xl h-32 text-white focus:border-emerald-500 outline-none transition-all resize-none" defaultValue="Premium quality goods from Addis Ababa."></textarea>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/30 border border-white/5 rounded-[2.5rem] p-10 space-y-8">
            <h3 className="text-xl font-black uppercase tracking-tight">Payout Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Preferred Bank</label>
                <select className="w-full bg-slate-950 border border-white/5 p-5 rounded-2xl text-white focus:border-emerald-500 outline-none transition-all appearance-none">
                  <option>Commercial Bank of Ethiopia (CBE)</option>
                  <option>Bank of Abyssinia</option>
                  <option>Dashen Bank</option>
                  <option>Telebirr</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Account Number</label>
                <input type="text" placeholder="1000..." className="w-full bg-slate-950 border border-white/5 p-5 rounded-2xl text-white focus:border-emerald-500 outline-none transition-all" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-slate-900/30 border border-white/5 rounded-[2.5rem] p-10 space-y-8">
            <h3 className="text-xl font-black uppercase tracking-tight">Store Status</h3>
            <div className="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Live & Active</span>
              </div>
              <button className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Pause Store</button>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">Your store is currently visible to all citizens in the marketplace. You can pause your store to temporarily hide your listings.</p>
          </div>

          <div className="space-y-4">
            <button 
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-emerald-500 text-slate-950 font-black py-6 rounded-2xl shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-tighter flex items-center justify-center gap-3"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : success ? (
                <CheckCircle2 size={20} />
              ) : null}
              {saving ? 'Saving...' : success ? 'Changes Saved' : 'Save Configuration'}
            </button>
            <button className="w-full py-6 rounded-2xl text-red-500 font-black uppercase tracking-widest text-xs hover:bg-red-500/10 transition-all">Delete Merchant Account</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const PlaceholderView: React.FC<{ title: string }> = ({ title }) => (
  <div className="text-center py-20 space-y-6">
    <div className="w-24 h-24 bg-slate-900 rounded-[2.5rem] flex items-center justify-center mx-auto text-slate-800 border border-white/5">
      <Settings size={48} />
    </div>
    <div>
      <h1 className="text-3xl font-black tracking-tighter uppercase text-slate-500">{title}</h1>
      <p className="text-slate-700 font-bold uppercase tracking-widest text-xs mt-2">This feature is currently being calibrated</p>
    </div>
  </div>
);

const StatCard: React.FC<any> = ({ title, value, unit, icon, color = 'emerald', trend, large }) => {
  const colorClasses: any = {
    emerald: 'bg-emerald-500/10 text-emerald-500',
    blue: 'bg-blue-500/10 text-blue-500',
    purple: 'bg-purple-500/10 text-purple-500',
    yellow: 'bg-yellow-500/10 text-yellow-500',
    slate: 'bg-slate-500/10 text-slate-500'
  };

  return (
    <div className={`bg-slate-900/30 border border-white/5 rounded-[2.5rem] p-8 space-y-6 hover:bg-slate-900/50 transition-all group relative overflow-hidden ${large ? 'md:p-10' : ''}`}>
      {large && <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2"></div>}
      <div className="flex items-center justify-between relative z-10">
        <div className={`${large ? 'w-16 h-16' : 'w-14 h-14'} rounded-2xl flex items-center justify-center ${colorClasses[color] || colorClasses.emerald} group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        {trend && (
          <span className={`text-[10px] font-black px-4 py-1.5 rounded-full ${trend.includes('+') ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-500 bg-red-500/10'}`}>
            {trend}
          </span>
        )}
      </div>
      <div className="relative z-10">
        <p className={`font-black uppercase tracking-[0.3em] text-slate-500 mb-2 ${large ? 'text-[11px]' : 'text-[10px]'}`}>{title}</p>
        <div className="flex items-baseline gap-2">
          <p className={`${large ? 'text-5xl' : 'text-3xl'} font-black tracking-tight text-white`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {unit && <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">{unit}</span>}
        </div>
      </div>
    </div>
  );
};

const ShieldCheck = ({ size, className }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export default MerchantPortal;
