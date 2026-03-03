import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Search, ShoppingCart, ChevronRight, 
  ShieldCheck, Package, AlertTriangle, CheckCircle2, X, MapPin, Clock, Truck
} from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import { api } from '../../../services/api';
import { Product, Order } from '../../../types';

const Marketplace: React.FC = () => {
  const { setView, profile, setProfile } = useGlobalState();
  const [view, setLocalView] = useState<'LIST' | 'PRODUCT' | 'ORDERS' | 'ORDER_DETAIL'>('LIST');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const [confirmationCode, setConfirmationCode] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [showDisputeInput, setShowDisputeInput] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');

  const categories = ['All', 'Electronics', 'Fashion', 'Home', 'Food', 'Beauty', 'Sports', 'Books', 'Other'];
  const districts = ['Bole', 'Arada', 'Kirkos', 'Gullele', 'Lideta', 'Yeka'];

  useEffect(() => {
    setConfirmationCode('');
    setDisputeReason('');
    setShowDisputeInput(false);
  }, [selectedOrder]);

  useEffect(() => {
    if (view === 'LIST') loadProducts();
    if (view === 'ORDERS') loadOrders();
  }, [view]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await api.getMarketplaceProducts();
      setProducts(data);
    } catch (err: any) {
      console.error("Marketplace: Failed to load products", err);
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const data = await api.getUserOrders(profile.id);
      setOrders(data);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setLocalView('PRODUCT');
  };

  const handleOrderSelect = (order: Order) => {
    setSelectedOrder(order);
    setLocalView('ORDER_DETAIL');
  };

  const handleBuy = async () => {
    if (!profile || !selectedProduct) return;
    
    if (!shippingAddress.trim()) {
      alert("Please enter a shipping address.");
      return;
    }

    if (profile.balance !== undefined && profile.balance < selectedProduct.price) {
      alert("Insufficient balance. Please top up your wallet.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.createOrder(profile.id, selectedProduct.id, 1, shippingAddress);
      if (res.success) {
        const updatedProfile = await api.getProfile(profile.id);
        setProfile({ ...updatedProfile, isLoggedIn: true });
        setLocalView('ORDERS');
      } else {
        alert(res.error || "Failed to place order.");
      }
    } catch (error) {
      console.error("Buy error:", error);
      alert("An error occurred.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!selectedOrder) return;
    if (!confirmationCode) {
      alert("Please enter the confirmation code sent by the merchant.");
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.confirmDelivery(selectedOrder.id, confirmationCode);
      if (res.success) {
        loadOrders();
        setLocalView('ORDERS');
      } else {
        alert(res.error || "Failed to confirm delivery. Please check the code.");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to confirm delivery.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispute = async () => {
    if (!selectedOrder) return;
    if (!showDisputeInput) {
      setShowDisputeInput(true);
      return;
    }
    if (!disputeReason) {
      alert("Please enter a reason for the dispute.");
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.raiseDispute(selectedOrder.id, disputeReason);
      if (res.success) {
        loadOrders();
        setLocalView('ORDERS');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const renderProductList = () => (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="space-y-10"
    >
      {/* Editorial Hero */}
      <div className="relative h-64 rounded-[3rem] overflow-hidden group shadow-2xl">
        <img 
          src="https://picsum.photos/seed/addis_market/1200/800" 
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
          alt="Addis Marketplace" 
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent flex flex-col justify-end p-10">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-6xl font-black tracking-tighter uppercase leading-[0.85]">City<br/>Market</h2>
            <div className="flex items-center gap-3 mt-4">
              <span className="text-emerald-400 font-mono text-[10px] uppercase tracking-[0.4em]">Escrow Protected</span>
              <div className="w-1 h-1 rounded-full bg-white/20"></div>
              <span className="text-white/40 font-mono text-[10px] uppercase tracking-[0.4em]">Verified Merchants</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Search & Categories */}
      <div className="space-y-6 sticky top-[88px] z-40 bg-slate-950/80 backdrop-blur-md py-2 -mx-2 px-2">
        <div className="relative group">
          <div className="absolute inset-0 bg-emerald-500/5 blur-xl group-focus-within:bg-emerald-500/10 transition-colors rounded-2xl"></div>
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={20} />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search the marketplace..."
            className="w-full bg-slate-900/40 border border-white/5 rounded-2xl py-5 pl-14 pr-6 outline-none focus:border-emerald-500/30 transition-all text-base backdrop-blur-sm relative z-10"
          />
        </div>
        
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                selectedCategory === cat 
                ? 'bg-white text-slate-950 shadow-xl shadow-white/10' 
                : 'bg-slate-900/50 text-slate-500 border border-white/5 hover:border-white/10 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
      
      {loading ? (
        <div className="grid grid-cols-2 gap-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="space-y-4 animate-pulse">
              <div className="aspect-square bg-slate-900 rounded-[2.5rem]"></div>
              <div className="h-4 bg-slate-900 rounded-full w-3/4"></div>
              <div className="h-3 bg-slate-900 rounded-full w-1/2"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-6 gap-y-10">
          {filteredProducts.map((p, idx) => (
            <motion.button 
              key={p.id} 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: (idx % 2) * 0.1 }}
              onClick={() => handleProductSelect(p)}
              className="text-left w-full space-y-4 group"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem] bg-slate-900 shadow-2xl">
                <img 
                  src={p.imageUrl} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                  alt={p.name} 
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="absolute top-5 right-5">
                  <div className="bg-slate-950/60 backdrop-blur-xl p-3 rounded-2xl border border-white/10 shadow-2xl">
                    <ShieldCheck size={18} className="text-emerald-500" />
                  </div>
                </div>
                <div className="absolute bottom-5 left-5 right-5 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                  <div className="bg-white text-slate-950 py-3 rounded-xl text-center font-black text-[10px] uppercase tracking-widest">View Details</div>
                </div>
              </div>
              <div className="px-2 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                      {districts[idx % districts.length]}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-600">NEW ARRIVAL</span>
                </div>
                <h3 className="font-black text-lg text-white leading-tight tracking-tight group-hover:text-emerald-400 transition-colors">{p.name}</h3>
                <div className="flex items-end justify-between">
                  <p className="text-2xl font-black text-white">{p.price?.toLocaleString()} <span className="text-[10px] font-normal opacity-40">ETB</span></p>
                </div>
              </div>
            </motion.button>
          ))}
          {filteredProducts.length === 0 && (
            <div className="col-span-2 py-32 text-center space-y-6">
              <div className="w-24 h-24 bg-slate-900 rounded-[2.5rem] flex items-center justify-center mx-auto text-slate-800 border border-white/5">
                <Search size={40} />
              </div>
              <div className="space-y-2">
                <p className="text-white font-black uppercase tracking-widest">No matches found</p>
                <p className="text-slate-500 text-sm">Try adjusting your filters or search terms</p>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );

  const renderProductDetail = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      className="space-y-8"
    >
      <div className="relative aspect-[4/5] rounded-[3rem] overflow-hidden shadow-2xl">
        <img src={selectedProduct?.imageUrl} className="w-full h-full object-cover" alt={selectedProduct?.name} referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
        <div className="absolute bottom-8 left-8 right-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full">In Stock</span>
            <span className="bg-white/10 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-white/10">Verified Seller</span>
          </div>
          <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">{selectedProduct?.name}</h2>
        </div>
      </div>
      
      <div className="px-2 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.3em] mb-1">Price</p>
            <p className="text-4xl font-black text-emerald-500">{selectedProduct?.price?.toLocaleString()} <span className="text-lg font-normal opacity-40">ETB</span></p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.3em] mb-1">Seller</p>
            <p className="text-lg font-bold text-white">{selectedProduct?.sellerName || 'Verified Merchant'}</p>
            <p className="text-xs text-slate-400 font-medium">{selectedProduct?.sellerLocation || 'Addis Ababa'}</p>
          </div>
        </div>

        <div className="h-px bg-white/5"></div>

        <div className="space-y-4">
          <h4 className="text-[10px] text-slate-500 uppercase font-black tracking-[0.3em]">Description</h4>
          <p className="text-slate-400 leading-relaxed text-lg">{selectedProduct?.description}</p>
        </div>

        <div className="space-y-4">
          <h4 className="text-[10px] text-slate-500 uppercase font-black tracking-[0.3em]">Shipping Address</h4>
          <textarea
            value={shippingAddress}
            onChange={(e) => setShippingAddress(e.target.value)}
            placeholder="Enter your full shipping address..."
            className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none h-24"
          />
        </div>

        {/* Escrow Visualizer */}
        <div className="bg-slate-900/50 border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full"></div>
          <div className="relative z-10 flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                <ShieldCheck className="text-emerald-500" size={32} />
              </div>
              <div>
                <h4 className="text-xl font-black tracking-tight text-white">Citylink Escrow</h4>
                <p className="text-emerald-500/60 text-xs font-mono uppercase tracking-widest">Secure Transaction Protocol</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="h-1.5 bg-emerald-500 rounded-full"></div>
              <div className="h-1.5 bg-slate-800 rounded-full"></div>
              <div className="h-1.5 bg-slate-800 rounded-full"></div>
            </div>

            <p className="text-sm text-slate-400 leading-relaxed">
              Your payment is held in our <span className="text-white font-bold">Secure Vault</span>. Funds are only released to the seller once you confirm receipt of the item.
            </p>
          </div>
        </div>

        <button 
          onClick={handleBuy}
          disabled={actionLoading}
          className="w-full bg-emerald-500 text-slate-950 font-black text-lg py-6 rounded-[2rem] flex items-center justify-center gap-3 shadow-2xl shadow-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-50 uppercase tracking-tighter"
        >
          {actionLoading ? <div className="w-6 h-6 border-3 border-slate-950 border-t-transparent rounded-full animate-spin"></div> : <ShoppingCart size={24} />}
          {actionLoading ? 'Securing Funds...' : 'Purchase with Escrow'}
        </button>
      </div>
    </motion.div>
  );

  const renderOrdersList = () => (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-3xl font-black tracking-tighter uppercase">My Orders</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">Track your active and past purchases</p>
        </div>
        <div className="bg-slate-900 border border-white/5 px-4 py-2 rounded-xl">
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">{orders.length} Orders</span>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Syncing Ledger...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-32 space-y-6">
          <div className="w-24 h-24 bg-slate-900/50 rounded-[2.5rem] flex items-center justify-center mx-auto text-slate-800 border border-white/5">
            <Package size={48} />
          </div>
          <div className="space-y-2">
            <p className="text-slate-500 font-black uppercase tracking-widest text-sm">No orders found</p>
            <p className="text-xs text-slate-700 max-w-[200px] mx-auto">Your purchase history will appear here once you make a transaction.</p>
          </div>
          <button 
            onClick={() => setLocalView('LIST')}
            className="text-emerald-500 font-black uppercase tracking-widest text-[10px] hover:underline"
          >
            Browse Marketplace
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order, idx) => (
            <motion.button 
              key={order.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05, type: 'spring', stiffness: 100 }}
              onClick={() => handleOrderSelect(order)}
              className="w-full bg-slate-900/30 border border-white/5 p-6 rounded-[2.5rem] flex items-center gap-6 hover:bg-slate-900/50 transition-all text-left group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-3xl rounded-full group-hover:bg-emerald-500/10 transition-colors"></div>
              
              <div className="relative">
                <img src={order.product.imageUrl} className="w-24 h-24 rounded-[1.5rem] object-cover shadow-2xl group-hover:scale-105 transition-transform" alt={order.product.name} referrerPolicy="no-referrer" />
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-500 text-slate-950 rounded-full flex items-center justify-center text-[10px] font-black border-4 border-slate-950 shadow-lg">
                  {order.quantity}
                </div>
              </div>
              
              <div className="flex-1 min-w-0 relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${
                    order.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                    order.status === 'DISPUTED' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                    order.status === 'PAID' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                    'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                  }`}>
                    {order.status}
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">
                    #{order.id.slice(0, 8)}
                  </span>
                </div>
                <h4 className="font-black text-white text-lg uppercase tracking-tight truncate mb-2 group-hover:text-emerald-400 transition-colors">{order.product.name}</h4>
                <div className="flex items-end justify-between">
                  <p className="text-2xl font-black text-emerald-500">{order.totalAmount.toLocaleString()} <span className="text-xs font-normal opacity-40">ETB</span></p>
                  <div className="w-10 h-10 rounded-xl bg-slate-950 border border-white/5 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all">
                    <ChevronRight size={20} />
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </motion.div>
  );

  const renderOrderDetail = () => {
    if (!selectedOrder) return null;
    
    const isDelivered = selectedOrder.status === 'DELIVERED';
    const isCompleted = selectedOrder.status === 'COMPLETED';
    const isDisputed = selectedOrder.status === 'DISPUTED';
    const isShipped = selectedOrder.status === 'SHIPPED';

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        className="space-y-10"
      >
        {/* Order Status Header */}
        <div className="bg-slate-900/50 border border-white/5 p-12 rounded-[3.5rem] text-center space-y-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center w-28 h-28 rounded-[2.5rem] bg-slate-950 border border-white/5 shadow-2xl relative"
          >
            <div className={`absolute inset-0 blur-2xl opacity-20 rounded-full ${
              isCompleted ? 'bg-emerald-500' : isDisputed ? 'bg-red-500' : 'bg-blue-500'
            }`}></div>
            {isCompleted ? <CheckCircle2 className="text-emerald-500 relative z-10" size={56} /> :
             isDisputed ? <AlertTriangle className="text-red-500 relative z-10" size={56} /> :
             isDelivered ? <Package className="text-blue-500 relative z-10" size={56} /> :
             isShipped ? <Truck className="text-yellow-500 relative z-10" size={56} /> :
             <Clock className="text-slate-400 relative z-10" size={56} />}
          </motion.div>
          <div>
            <h3 className="text-4xl font-black tracking-tighter uppercase leading-none">{selectedOrder.status}</h3>
            <p className="text-[10px] font-mono text-slate-500 mt-4 uppercase tracking-[0.3em]">TX-REF: {selectedOrder.id}</p>
          </div>
        </div>

        {/* Tracking Timeline */}
        <div className="bg-slate-900/30 border border-white/5 p-10 rounded-[3rem] space-y-10">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-500">Logistics Protocol</h4>
            <div className="px-3 py-1 bg-slate-950 border border-white/5 rounded-lg">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Real-time Sync</span>
            </div>
          </div>
          
          <div className="relative pl-12 space-y-12">
            <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-800"></div>
            
            <TimelineItem 
              active={true} 
              completed={true} 
              title="Order Secured" 
              desc="Funds held in Escrow Vault" 
            />
            <TimelineItem 
              active={isShipped || isDelivered || isCompleted} 
              completed={isShipped || isDelivered || isCompleted} 
              title="Dispatched" 
              desc="Merchant has shipped the item" 
              meta={selectedOrder.trackingNumber ? `TRACKING: ${selectedOrder.trackingNumber}` : undefined}
            />
            <TimelineItem 
              active={isDelivered || isCompleted} 
              completed={isDelivered || isCompleted} 
              title="Arrived" 
              desc="Item reached destination" 
            />
          </div>
        </div>

        {/* Product Summary */}
        <div className="bg-slate-900/50 border border-white/5 p-8 rounded-[2.5rem] flex gap-8 items-center group">
          <img src={selectedOrder.product.imageUrl} className="w-28 h-28 rounded-[1.5rem] object-cover shadow-2xl group-hover:scale-105 transition-transform" alt={selectedOrder.product.name} referrerPolicy="no-referrer" />
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2">Item Summary</p>
            <h4 className="font-black text-xl uppercase tracking-tight text-white leading-tight">{selectedOrder.product.name}</h4>
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Qty: <span className="text-white">{selectedOrder.quantity}</span></p>
              <p className="text-2xl font-black text-emerald-500">{selectedOrder.totalAmount.toLocaleString()} <span className="text-sm font-normal opacity-40">ETB</span></p>
            </div>
          </div>
        </div>

        {/* Action Panel */}
        {(isShipped || isDelivered) && !isCompleted && !isDisputed && (
          <div className="space-y-8">
            {!showDisputeInput ? (
              <>
                <div className="p-10 bg-blue-500/5 border border-blue-500/10 rounded-[3rem] space-y-8 text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full"></div>
                  <div>
                    <p className="text-[11px] text-blue-400 uppercase font-black tracking-[0.4em] mb-6">Verification Protocol</p>
                    <div className="flex justify-center gap-4">
                      {(selectedOrder.confirmationCode || '------').split('').map((char, i) => (
                        <motion.div 
                          key={i} 
                          initial={{ y: 10, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: i * 0.1 }}
                          className="w-12 h-16 bg-slate-950 border border-white/10 rounded-2xl flex items-center justify-center text-3xl font-black font-mono text-white shadow-2xl"
                        >
                          {char}
                        </motion.div>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-8 leading-relaxed max-w-[280px] mx-auto">
                      Provide this unique code to the merchant <span className="text-white font-bold">only after</span> you have inspected and received the item.
                    </p>
                  </div>
                  
                  <div className="h-px bg-white/5"></div>

                  <div className="space-y-6">
                    <p className="text-xs text-blue-400 font-black uppercase tracking-[0.2em]">Enter Code to Finalize</p>
                    <input
                      type="text"
                      value={confirmationCode}
                      onChange={(e) => setConfirmationCode(e.target.value)}
                      placeholder="000000"
                      className="w-full bg-slate-950 border border-white/10 rounded-3xl p-6 text-center text-4xl tracking-[0.5em] font-black font-mono focus:outline-none focus:border-emerald-500 transition-all shadow-2xl text-white placeholder:text-slate-800"
                      maxLength={6}
                    />
                  </div>
                </div>
                
                <button 
                  onClick={handleConfirmDelivery}
                  disabled={actionLoading || confirmationCode.length < 4}
                  className="w-full bg-emerald-500 text-slate-950 font-black text-xl py-7 rounded-[2.5rem] flex items-center justify-center gap-4 shadow-2xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 uppercase tracking-tighter"
                >
                  {actionLoading ? 'Authenticating...' : <><CheckCircle2 size={28} /> Release Funds</>}
                </button>
                
                <button 
                  onClick={() => setShowDisputeInput(true)}
                  disabled={actionLoading}
                  className="w-full bg-transparent text-red-500 font-black py-5 rounded-2xl flex items-center justify-center gap-3 border border-red-500/20 hover:bg-red-500/5 transition-all uppercase tracking-widest text-xs"
                >
                  <AlertTriangle size={20} /> Raise Arbitration Case
                </button>
              </>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-8 bg-slate-900 border border-red-500/20 p-10 rounded-[3rem] shadow-2xl"
              >
                <div className="flex items-center gap-4 text-red-500">
                  <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center">
                    <AlertTriangle size={28} />
                  </div>
                  <h4 className="text-2xl font-black tracking-tight uppercase">Arbitration Request</h4>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Please provide a comprehensive explanation for this dispute. Our city administrators will review the evidence and reach a resolution within 24-48 hours.
                </p>
                <textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Describe the issue in detail (e.g. item not as described, damaged, etc.)"
                  className="w-full bg-slate-950 border border-white/10 rounded-[2rem] p-6 text-base min-h-[200px] focus:outline-none focus:border-red-500 transition-all text-white placeholder:text-slate-700"
                />
                <div className="flex gap-4">
                  <button 
                    onClick={() => setShowDisputeInput(false)}
                    className="flex-1 py-5 rounded-2xl font-black uppercase tracking-widest text-xs text-slate-500 hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDispute}
                    disabled={actionLoading || !disputeReason}
                    className="flex-1 bg-red-500 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-600 transition-all disabled:opacity-50 shadow-xl shadow-red-500/20"
                  >
                    Submit Case
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {isCompleted && (
          <div className="p-8 bg-emerald-500/5 border border-emerald-500/10 rounded-[2.5rem] text-center space-y-2">
            <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-2" />
            <p className="text-lg text-emerald-500 font-black uppercase tracking-tighter">Transaction Finalized</p>
            <p className="text-sm text-slate-400 leading-relaxed">Funds have been successfully released to the merchant. Thank you for using Addis Marketplace.</p>
          </div>
        )}

        {isDisputed && (
          <div className="p-8 bg-red-500/5 border border-red-500/10 rounded-[2.5rem] text-center space-y-2">
            <AlertTriangle size={40} className="text-red-500 mx-auto mb-2" />
            <p className="text-lg text-red-500 font-black uppercase tracking-tighter">Under Arbitration</p>
            <p className="text-sm text-slate-400 leading-relaxed">A dispute has been filed. Funds are frozen in the Escrow Vault until an admin resolution is reached.</p>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-32">
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 p-6 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <button 
            onClick={() => {
              if (view === 'PRODUCT') setLocalView('LIST');
              else if (view === 'ORDER_DETAIL') setLocalView('ORDERS');
              else setView('home');
            }}
            className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center hover:bg-slate-800 transition-all active:scale-90"
          >
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-2xl font-black tracking-tighter uppercase">
            {view === 'LIST' || view === 'PRODUCT' ? 'Marketplace' : 'My Orders'}
          </h1>
        </div>
        
        {(view === 'LIST' || view === 'PRODUCT') && (
          <button 
            onClick={() => setLocalView('ORDERS')}
            className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center hover:bg-slate-800 transition-all relative active:scale-90"
          >
            <Package size={22} />
            {orders.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-4 border-slate-950"></span>
            )}
          </button>
        )}
      </header>

      <div className="p-6 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {view === 'LIST' && <motion.div key="list">{renderProductList()}</motion.div>}
          {view === 'PRODUCT' && <motion.div key="product">{renderProductDetail()}</motion.div>}
          {view === 'ORDERS' && <motion.div key="orders">{renderOrdersList()}</motion.div>}
          {view === 'ORDER_DETAIL' && <motion.div key="order_detail">{renderOrderDetail()}</motion.div>}
        </AnimatePresence>
      </div>
    </div>
  );
};

const TimelineItem = ({ active, completed, title, desc, meta }: any) => (
  <div className="relative">
    <div className={`absolute -left-[35px] w-8 h-8 rounded-xl flex items-center justify-center border-4 border-slate-950 transition-all duration-500 ${
      completed ? 'bg-emerald-500 scale-110' : active ? 'bg-blue-500 animate-pulse' : 'bg-slate-800'
    }`}>
      {completed ? <CheckCircle2 size={14} className="text-slate-950" /> : <div className="w-1.5 h-1.5 rounded-full bg-white/20"></div>}
    </div>
    <div className="space-y-1">
      <p className={`font-black text-sm uppercase tracking-tight ${active ? 'text-white' : 'text-slate-600'}`}>{title}</p>
      <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
      {meta && (
        <div className="mt-3 p-3 bg-slate-950 border border-white/5 rounded-xl inline-block">
          <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Tracking ID</p>
          <p className="text-xs font-mono text-white tracking-widest">{meta}</p>
        </div>
      )}
    </div>
  </div>
);

export default Marketplace;
