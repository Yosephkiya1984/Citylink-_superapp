import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Zap, Bus, Heart, GraduationCap, Landmark, 
  Droplets, Car, Filter, ChevronRight, Star, Clock,
  ArrowLeft, AlertTriangle
} from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import { CityService } from '../../../types';
import { api } from '../../../services/api';

const ServicesPage: React.FC = () => {
  const { setView, setSelectedService } = useGlobalState();
  const [services, setServices] = useState<CityService[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const categories = [
    { id: 'utility', name: 'Utilities', icon: Zap },
    { id: 'transport', name: 'Transport', icon: Bus },
    { id: 'health', name: 'Health', icon: Heart },
    { id: 'education', name: 'Education', icon: GraduationCap },
    { id: 'government', name: 'Gov Services', icon: Landmark },
  ];

  const iconMap: Record<string, any> = {
    Zap, Bus, Heart, GraduationCap, Landmark, Droplets, Car
  };

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    setLoading(true);
    try {
      const data = await api.getServices();
      setServices(data);
    } catch (e) {
      console.error('Failed to load services', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = services.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         s.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory ? s.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  const handleServiceClick = (service: CityService) => {
    if (service.id === 'trans_bus') {
      setView('transport_hub');
      return;
    }
    if (service.id === 'edu_fees') {
      setView('school_fees');
      return;
    }
    setSelectedService(service);
    setView('service_detail');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-slate-950 text-white pb-24"
    >
      {/* Header */}
      <div className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-xl border-bottom border-white/5 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setView('home')}
              className="p-2 bg-slate-900 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-2xl font-bold tracking-tight">City Services</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Star size={16} />
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text"
            placeholder="Search for bills, transport, permits..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-2xl py-4 pl-12 pr-5 outline-none focus:border-emerald-500 transition-all text-sm"
          />
        </div>

        {/* Categories Horizontal Scroll */}
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          <button 
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all ${!selectedCategory ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-400 border border-white/5'}`}
          >
            All
          </button>
          {categories.map(cat => (
            <button 
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest whitespace-nowrap flex items-center gap-2 transition-all ${selectedCategory === cat.id ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-400 border border-white/5'}`}
            >
              <cat.icon size={14} />
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Services List */}
      <div className="p-6 space-y-8">
        {/* Recently Used */}
        {!searchQuery && !selectedCategory && (
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Recently Used</h3>
            <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
              {services.slice(0, 3).map(service => {
                const Icon = iconMap[service.icon] || Zap;
                return (
                  <button 
                    key={`recent-${service.id}`}
                    onClick={() => handleServiceClick(service)}
                    className="flex-shrink-0 w-32 bg-slate-900/40 border border-white/5 p-4 rounded-2xl flex flex-col items-center gap-3 hover:bg-slate-900 transition-all"
                  >
                    <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                      <Icon size={20} />
                    </div>
                    <span className="text-[10px] font-bold text-center truncate w-full">{service.name}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">
            {selectedCategory ? `${categories.find(c => c.id === selectedCategory)?.name} Services` : 'All Services'}
          </h3>
          {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 text-sm font-medium">Loading City Services...</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto text-slate-600">
              <Search size={32} />
            </div>
            <p className="text-slate-500">No services found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredServices.map((service, idx) => {
              const Icon = iconMap[service.icon] || Zap;
              return (
                <motion.button
                  key={service.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => handleServiceClick(service)}
                  className="group bg-slate-900/40 border border-white/5 p-5 rounded-3xl flex items-center justify-between hover:bg-slate-900 hover:border-emerald-500/30 transition-all text-left"
                >
                  <div className="flex items-center gap-5">
                    <div className="p-4 bg-slate-800 rounded-2xl text-slate-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all shadow-lg">
                      <Icon size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-white group-hover:text-emerald-500 transition-colors">{service.name}</h3>
                      <p className="text-slate-500 text-xs line-clamp-1">{service.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 bg-slate-800 px-2 py-0.5 rounded-md">
                          {service.category}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold">
                          <Clock size={10} />
                          Instant
                        </div>
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-700 group-hover:text-emerald-500 transition-colors" />
                </motion.button>
              );
            })}
          </div>
        )}
      </section>
    </div>

      {/* Featured Banner */}
      {!loading && !selectedCategory && !searchQuery && (
        <div className="px-6 mt-4">
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-6 relative overflow-hidden shadow-xl shadow-amber-500/20">
            <div className="absolute -right-4 -bottom-4 p-4 opacity-10">
              <AlertTriangle size={120} />
            </div>
            <div className="relative z-10 space-y-2">
              <h4 className="text-xl font-bold">See Something? Say Something.</h4>
              <p className="text-amber-100 text-sm max-w-[200px]">Report city issues like potholes or safety concerns directly.</p>
              <button 
                onClick={() => setView('city_report')}
                className="mt-4 bg-white text-amber-600 px-6 py-2 rounded-xl font-bold text-sm shadow-lg"
              >
                Report Now
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ServicesPage;
