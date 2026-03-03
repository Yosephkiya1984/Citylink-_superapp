import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, Search, Filter, Download } from 'lucide-react';
import { Transaction, ViewState } from '../../../types';
import { api } from '../../../services/api';
import { useGlobalState } from '../../context/GlobalStateContext';

interface Props {
  setView: (view: ViewState) => void;
  onSelectTransaction: (tx: Transaction) => void;
  isMainTab?: boolean;
}

const TransactionHistory: React.FC<Props> = ({ setView, onSelectTransaction, isMainTab }) => {
  const { profile } = useGlobalState();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchTransactions = async () => {
      if (profile) {
        try {
          const txs = await api.getTransactions(profile.id);
          setTransactions(Array.isArray(txs) ? txs : []);
        } catch (error) {
          console.error("Failed to fetch transactions", error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchTransactions();
  }, [profile]);

  const filteredTxs = transactions.filter(tx => 
    tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 pb-24">
      {/* Header */}
      {!isMainTab && (
        <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-white/10 p-4 flex items-center gap-4">
          <button 
            onClick={() => setView('home')}
            className="p-2 bg-slate-900 rounded-full hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold flex-1">Transaction History</h1>
          <button className="p-2 bg-slate-900 rounded-full hover:bg-slate-800 transition-colors text-emerald-500">
            <Download size={20} />
          </button>
        </header>
      )}

      <div className={`p-4 space-y-6 ${isMainTab ? 'pt-8' : ''}`}>
        {isMainTab && (
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Wallet & History</h1>
            <button className="p-2 bg-slate-900 rounded-full hover:bg-slate-800 transition-colors text-emerald-500">
              <Download size={20} />
            </button>
          </div>
        )}
        {/* Search & Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:border-emerald-500 outline-none"
            />
          </div>
          <button className="p-3 bg-slate-900 border border-white/10 rounded-xl hover:bg-slate-800 transition-colors">
            <Filter size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Transactions List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading transactions...</div>
          ) : filteredTxs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No transactions found</div>
          ) : (
            filteredTxs.map((tx) => (
              <div 
                key={tx.id} 
                onClick={() => onSelectTransaction(tx)}
                className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:bg-slate-900 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${tx.type === 'DEPOSIT' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-400'}`}>
                    {tx.type === 'DEPOSIT' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                  </div>
                  <div>
                    <h4 className="text-white font-semibold text-sm">{tx.description || 'Transaction'}</h4>
                    <p className="text-slate-500 text-[10px]">{tx.timestamp ? new Date(tx.timestamp).toLocaleString() : ''}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${tx.type === 'DEPOSIT' ? 'text-emerald-500' : 'text-white'}`}>
                    {tx.type === 'DEPOSIT' ? '+' : '-'}{tx.amount.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">ETB</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionHistory;
