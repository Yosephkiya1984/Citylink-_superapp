import React from 'react';
import { motion } from 'motion/react';
import { 
  CheckCircle2, Download, Share2, ArrowLeft, 
  Calendar, Hash, CreditCard, Building2, User,
  Printer, ShieldCheck
} from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';

const PaymentReceipt: React.FC = () => {
  const { selectedTransaction, setView } = useGlobalState();

  if (!selectedTransaction) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-slate-500">
        <p>No transaction found</p>
        <button 
          onClick={() => setView('home')}
          className="mt-4 text-emerald-500 font-bold"
        >
          Go Back Home
        </button>
      </div>
    );
  }

  const tx = selectedTransaction;

  const handleDownload = () => {
    // In a real app, this would generate a PDF
    alert('Downloading receipt PDF...');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Citylink Payment Receipt',
        text: `Receipt for ${tx.description} - ETB ${tx.amount}`,
        url: window.location.href
      }).catch(console.error);
    } else {
      alert('Sharing is not supported on this browser');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-screen bg-slate-50 pb-20"
    >
      <div className="max-w-xl mx-auto px-6 pt-8">
        <button 
          onClick={() => setView('home')}
          className="flex items-center text-slate-500 hover:text-slate-800 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </button>

        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
          {/* Receipt Header */}
          <div className="bg-slate-900 p-10 text-center relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12, delay: 0.2 }}
              className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/40"
            >
              <CheckCircle2 size={40} />
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-1">Payment Successful</h2>
            <p className="text-slate-400 text-sm">Thank you for using Addis Ababa Citylink</p>
          </div>

          {/* Receipt Body */}
          <div className="p-8 space-y-8">
            <div className="text-center">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Amount Paid</p>
              <h3 className="text-5xl font-black text-slate-900 tracking-tight">
                ETB {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-slate-50">
                <div className="flex items-center gap-3 text-slate-500">
                  <Hash size={18} />
                  <span className="text-sm font-medium">Transaction ID</span>
                </div>
                <span className="text-sm font-mono font-bold text-slate-900">{tx.id}</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-slate-50">
                <div className="flex items-center gap-3 text-slate-500">
                  <Calendar size={18} />
                  <span className="text-sm font-medium">Date & Time</span>
                </div>
                <span className="text-sm font-bold text-slate-900">
                  {new Date(tx.timestamp).toLocaleString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-slate-50">
                <div className="flex items-center gap-3 text-slate-500">
                  <CreditCard size={18} />
                  <span className="text-sm font-medium">Payment Type</span>
                </div>
                <span className="text-sm font-bold text-slate-900 uppercase tracking-wider">{tx.type}</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-slate-50">
                <div className="flex items-center gap-3 text-slate-500">
                  <Building2 size={18} />
                  <span className="text-sm font-medium">Merchant/Source</span>
                </div>
                <span className="text-sm font-bold text-slate-900">{tx.merchantId}</span>
              </div>

              <div className="pt-4">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Description</p>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-slate-700 text-sm leading-relaxed font-medium">
                    {tx.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Verification Footer */}
            <div className="flex items-center justify-center gap-2 py-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Digitally Verified by Citylink Authority</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
            <button 
              onClick={handleDownload}
              className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-100 transition-all active:scale-95"
            >
              <Download size={20} /> Download
            </button>
            <button 
              onClick={handleShare}
              className="flex-1 bg-slate-900 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-900/10"
            >
              <Share2 size={20} /> Share
            </button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <button 
            onClick={() => window.print()}
            className="text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-2 mx-auto text-sm font-medium"
          >
            <Printer size={16} /> Print this receipt
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default PaymentReceipt;
