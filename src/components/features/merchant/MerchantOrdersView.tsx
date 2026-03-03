import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Package, CheckCircle2, Truck, AlertTriangle, Clock, ChevronRight, X } from 'lucide-react';
import { api } from '../../../services/api';
import { Order } from '../../../types';
import { useGlobalState } from '../../context/GlobalStateContext';

const MerchantOrdersView: React.FC = () => {
  const { profile } = useGlobalState();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    setTrackingNumber('');
  }, [selectedOrder]);

  const loadOrders = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const data = await api.getMerchantOrders(profile.id);
      setOrders(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      let res;
      if (status === 'SHIPPED') {
        res = await api.shipOrder(selectedOrder.id, trackingNumber);
      } else {
        res = await api.updateOrderStatus(selectedOrder.id, status);
      }
      
      if (res.success) {
        loadOrders();
        setSelectedOrder(null);
        setTrackingNumber('');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-emerald-500 font-mono text-[10px] uppercase tracking-[0.4em] mb-2">Order Fulfillment</p>
          <h1 className="text-5xl font-black tracking-tighter uppercase">Orders</h1>
        </div>
        <div className="flex gap-2">
          <div className="bg-slate-900/50 border border-white/5 px-6 py-3 rounded-2xl flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{orders.length} Total Orders</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {orders.map((order, idx) => (
          <motion.button 
            key={order.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05, type: 'spring', stiffness: 100 }}
            onClick={() => setSelectedOrder(order)}
            className="bg-slate-900/30 border border-white/5 rounded-[3rem] p-8 text-left hover:bg-slate-900/50 transition-all flex flex-col gap-8 group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full group-hover:bg-emerald-500/10 transition-colors"></div>
            
            <div className="flex items-start justify-between w-full relative z-10">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <img src={order.product.imageUrl} className="w-20 h-20 rounded-[1.5rem] object-cover shadow-2xl group-hover:scale-105 transition-transform" alt={order.product.name} referrerPolicy="no-referrer" loading="lazy" />
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-slate-950 border-4 border-slate-900 rounded-full flex items-center justify-center text-[10px] font-black">
                    {order.quantity}
                  </div>
                </div>
                <div>
                  <h4 className="font-black text-xl uppercase tracking-tight text-white truncate max-w-[140px] group-hover:text-emerald-400 transition-colors">{order.product.name}</h4>
                  <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-1">ID: {order.id.slice(0, 8)}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between w-full pt-8 border-t border-white/5 relative z-10">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.4em] mb-2">Revenue</p>
                <p className="text-3xl font-black text-emerald-500">{order.totalAmount.toLocaleString()} <span className="text-sm font-normal opacity-40">ETB</span></p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border ${
                  order.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                  order.status === 'DISPUTED' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                  order.status === 'PAID' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                  'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                }`}>
                  {order.status}
                </span>
                <div className="w-10 h-10 rounded-xl bg-slate-950 border border-white/5 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all">
                  <ChevronRight size={20} />
                </div>
              </div>
            </div>

            {order.status === 'PAID' && (
              <div className="absolute bottom-0 left-0 w-full h-1.5 bg-blue-500/50">
                <motion.div 
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                  className="w-1/2 h-full bg-blue-400"
                />
              </div>
            )}
          </motion.button>
        ))}
        
        {orders.length === 0 && (
          <div className="col-span-full py-32 text-center space-y-6">
            <div className="w-24 h-24 bg-slate-900 rounded-[2.5rem] flex items-center justify-center mx-auto text-slate-800 border border-white/5">
              <Package size={48} />
            </div>
            <p className="text-slate-500 font-black uppercase tracking-widest">No orders currently in queue</p>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-slate-900 border border-white/10 rounded-[3rem] w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl"
            >
              <header className="p-8 border-b border-white/5 flex items-center justify-between bg-slate-950/30">
                <div>
                  <h3 className="text-2xl font-black tracking-tighter uppercase">Order Details</h3>
                  <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-1">Ref: {selectedOrder.id}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 hover:text-white transition-all">
                  <X size={24} />
                </button>
              </header>
              
              <div className="p-10 overflow-y-auto space-y-10">
                <div className="flex items-center gap-8">
                  <img src={selectedOrder.product.imageUrl} className="w-32 h-32 rounded-[2rem] object-cover shadow-2xl" alt={selectedOrder.product.name} referrerPolicy="no-referrer" />
                  <div className="space-y-2">
                    <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-emerald-500/20">
                      {selectedOrder.status}
                    </span>
                    <h4 className="text-3xl font-black tracking-tighter uppercase text-white">{selectedOrder.product.name}</h4>
                    <p className="text-sm text-slate-500">Customer ID: <span className="text-white font-mono">{selectedOrder.buyerId.slice(0, 12)}...</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-slate-950 p-8 rounded-[2rem] border border-white/5 space-y-2">
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.3em]">Total Revenue</p>
                    <p className="text-4xl font-black text-emerald-500">{selectedOrder.totalAmount.toLocaleString()} <span className="text-lg font-normal opacity-40">ETB</span></p>
                  </div>
                  <div className="bg-slate-950 p-8 rounded-[2rem] border border-white/5 space-y-2">
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.3em]">Escrow Status</p>
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${selectedOrder.escrowStatus === 'RELEASED' ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse'}`}></div>
                      <p className={`text-xl font-black uppercase tracking-tight ${selectedOrder.escrowStatus === 'RELEASED' ? 'text-emerald-500' : 'text-blue-500'}`}>
                        {selectedOrder.escrowStatus}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedOrder.shippingAddress && (
                  <div className="bg-slate-950 p-8 rounded-[2rem] border border-white/5 space-y-4">
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.3em]">Shipping Address</p>
                    <p className="text-sm text-white leading-relaxed">{selectedOrder.shippingAddress}</p>
                  </div>
                )}

                {/* Status Actions */}
                <div className="space-y-8 pt-10 border-t border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-6 bg-emerald-500 rounded-full"></div>
                    <h4 className="text-xl font-black tracking-tight uppercase">Fulfillment Actions</h4>
                  </div>
                  
                  {selectedOrder.status === 'PAID' && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Logistics Tracking ID</label>
                        <input 
                          type="text" 
                          value={trackingNumber}
                          onChange={(e) => setTrackingNumber(e.target.value)}
                          placeholder="Enter carrier tracking number..."
                          className="w-full bg-slate-950 border border-white/5 rounded-2xl p-6 text-white placeholder:text-slate-700 focus:outline-none focus:border-emerald-500 transition-all font-mono tracking-widest"
                        />
                      </div>
                      <button 
                        onClick={() => handleUpdateStatus('SHIPPED')}
                        disabled={actionLoading}
                        className="w-full bg-blue-500 text-white font-black text-lg py-6 rounded-[2rem] flex items-center justify-center gap-3 shadow-2xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 uppercase tracking-tighter"
                      >
                        {actionLoading ? 'Updating...' : <><Truck size={24} /> Dispatch Order</>}
                      </button>
                    </div>
                  )}

                  {selectedOrder.status === 'SHIPPED' && (
                    <div className="space-y-6">
                      <div className="p-8 bg-yellow-500/5 border border-yellow-500/10 rounded-[2.5rem] text-center space-y-2">
                        <p className="text-sm text-yellow-500 font-black uppercase tracking-widest">In Transit</p>
                        <p className="text-xs text-slate-500 leading-relaxed">Mark as delivered once the item has reached the customer's district.</p>
                      </div>
                      <button 
                        onClick={() => handleUpdateStatus('DELIVERED')}
                        disabled={actionLoading}
                        className="w-full bg-yellow-500 text-slate-950 font-black text-lg py-6 rounded-[2rem] flex items-center justify-center gap-3 shadow-2xl shadow-yellow-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 uppercase tracking-tighter"
                      >
                        {actionLoading ? 'Updating...' : <><Package size={24} /> Mark as Delivered</>}
                      </button>
                    </div>
                  )}

                  {selectedOrder.status === 'DELIVERED' && (
                    <div className="p-10 bg-blue-500/5 border border-blue-500/10 rounded-[3rem] text-center space-y-6">
                      <div className="w-20 h-20 bg-slate-950 border border-white/5 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl">
                        <Clock size={40} className="text-blue-500 animate-spin-slow" />
                      </div>
                      <div>
                        <p className="text-xl font-black uppercase tracking-tight text-blue-400">Awaiting Verification</p>
                        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                          The customer must enter their verification code to release the funds from the Escrow Vault.
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedOrder.status === 'COMPLETED' && (
                    <div className="p-10 bg-emerald-500/5 border border-emerald-500/10 rounded-[3rem] text-center space-y-6">
                      <div className="w-20 h-20 bg-slate-950 border border-white/5 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl">
                        <CheckCircle2 size={40} className="text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-xl font-black uppercase tracking-tight text-emerald-500">Transaction Finalized</p>
                        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                          Funds have been successfully released to your merchant balance.
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedOrder.status === 'DISPUTED' && (
                    <div className="p-10 bg-red-500/5 border border-red-500/10 rounded-[3rem] text-center space-y-6">
                      <div className="w-20 h-20 bg-slate-950 border border-white/5 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl">
                        <AlertTriangle size={40} className="text-red-500" />
                      </div>
                      <div>
                        <p className="text-xl font-black uppercase tracking-tight text-red-500">Dispute Active</p>
                        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                          This order is under review by our arbitration team. Funds are frozen in escrow.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MerchantOrdersView;
