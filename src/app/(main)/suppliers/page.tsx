"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Truck, 
  Plus, 
  Search, 
  MoreVertical, 
  ShieldCheck, 
  AlertCircle, 
  Phone, 
  Mail, 
  Package, 
  Clock, 
  ChevronRight,
  TrendingUp,
  User,
  ArrowUpRight,
  Filter,
  X,
  Tag
} from "lucide-react";
import { format } from "date-fns";
import { sendTelegramAlert, sendEmailNotification } from "@/lib/telegram";
import SupplierCategoryManager from "@/components/SupplierCategoryManager";

interface Supplier {
  id: number;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  product_type: string;
  lead_time_days: number;
  min_order_quantity: number;
  status: string;
  created_at: string;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnboard, setShowOnboard] = useState(false);
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState(["Labels", "Empty Bottle", "Caps", "Seals"]);
  
  const [formData, setFormData] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    product_type: "Labels",
    lead_time_days: 7,
    min_order_quantity: 100
  });

  const [tgId, setTgId] = useState<string>("");
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setTgId(params.get('tgId') || "");
    }
  }, []);

  const isFounder = tgId === '6868392834' || tgId === '8457004704';

  const fetchSuppliers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name');
    
    if (data) setSuppliers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { data, error } = await supabase
      .from('suppliers')
      .insert([formData])
      .select();

    if (!error) {
      // Send alerts
      await sendTelegramAlert('supplier_added', `New Supplier Onboarded: *${formData.name}* (${formData.product_type})`);
      await sendEmailNotification(
        `Procurement: New Supplier Registered - ${formData.name}`,
        `A new supply chain vector has been established.\nSupplier: ${formData.name}\nResource: ${formData.product_type}\nContact: ${formData.contact_person}`
      );
      
      setFormData({
        name: "",
        contact_person: "",
        phone: "",
        email: "",
        product_type: "Labels",
        lead_time_days: 7,
        min_order_quantity: 100
      });
      setShowOnboard(false);
      fetchSuppliers();
    }
    setLoading(false);
  };

  const toggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await supabase.from('suppliers').update({ status: newStatus }).eq('id', id);
    fetchSuppliers();
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.product_type.toLowerCase().includes(search.toLowerCase())
  );

  if (!isFounder) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="p-6 rounded-full bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-16 h-16 text-red-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-white uppercase italic">Access Restricted</h2>
          <p className="text-brand-steel font-bold uppercase tracking-widest text-xs">This sector requires Founder-level clearance.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-brand-sky/20 text-brand-sky border border-brand-sky/10">
              <Truck className="w-6 h-6" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">
              Supply <span className="text-brand-sky">Chain</span>
            </h1>
          </div>
          <p className="text-brand-steel font-bold tracking-widest uppercase text-xs">Vector Hub for Raw Materials & Logistics</p>
        </div>

        <button 
          onClick={() => setShowOnboard(true)}
          className="group relative flex items-center gap-3 px-8 py-3.5 rounded-[1.5rem] bg-brand-sky text-brand-deep font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-brand-sky/20 overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          <Plus className="w-4 h-4" />
          Onboard Supplier
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Sidebar: Controls & Stats */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-6 rounded-[2rem] bg-brand-navy/30 border border-white/5 space-y-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-steel" />
              <input 
                type="text" 
                placeholder="Search Vectors..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-brand-deep/50 border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-sm text-white focus:outline-none focus:border-brand-sky/30 transition-all font-bold placeholder:text-brand-steel"
              />
            </div>

            <SupplierCategoryManager 
              categories={categories}
              onAdd={(cat) => setCategories([...categories, cat])}
              onRemove={(cat) => setCategories(categories.filter(c => c !== cat))}
            />

            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex justify-between items-end">
                <p className="text-[10px] font-black text-brand-steel uppercase tracking-widest italic">Operational Partners</p>
                <p className="text-2xl font-black text-white leading-none">{suppliers.length}</p>
              </div>
              <div className="h-1.5 w-full bg-brand-deep/50 rounded-full overflow-hidden">
                <div className="h-full bg-brand-sky w-2/3 shadow-[0_0_10px_rgba(193,232,255,0.4)]" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Area: Supplier List */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="h-96 flex flex-col items-center justify-center space-y-4">
              <Truck className="w-12 h-12 text-brand-sky animate-bounce" />
              <p className="text-[10px] font-black text-brand-steel uppercase tracking-widest animate-pulse">Scanning Global Vectors...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSuppliers.map((supplier) => (
                <div key={supplier.id} className="group relative glass-panel p-6 rounded-[2rem] bg-brand-deep/30 border border-white/5 hover:border-brand-sky/30 transition-all duration-500">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 rounded-2xl bg-brand-navy/50 text-brand-sky border border-brand-sky/10 group-hover:scale-110 transition-transform duration-500">
                      <Package className="w-5 h-5" />
                    </div>
                    <button 
                      onClick={() => toggleStatus(supplier.id, supplier.status)}
                      className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
                        supplier.status === 'active' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}
                    >
                      {supplier.status}
                    </button>
                  </div>

                  <div className="space-y-1 mb-6">
                    <h3 className="text-xl font-black text-white italic uppercase">{supplier.name}</h3>
                    <div className="flex items-center gap-2">
                      <Tag className="w-3 h-3 text-brand-steel" />
                      <p className="text-[10px] font-bold text-brand-steel uppercase tracking-[0.2em]">{supplier.product_type}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                      <p className="text-[9px] font-black text-brand-steel uppercase tracking-widest mb-1">Lead Time</p>
                      <p className="text-xs font-black text-white italic">{supplier.lead_time_days} DAYS</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                      <p className="text-[9px] font-black text-brand-steel uppercase tracking-widest mb-1">Min Order</p>
                      <p className="text-xs font-black text-white italic">{supplier.min_order_quantity} UNITS</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-navy flex items-center justify-center border border-white/10">
                        <User className="w-4 h-4 text-brand-sky" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-white uppercase truncate">{supplier.contact_person}</p>
                        <p className="text-[9px] text-brand-steel font-bold truncate">{supplier.phone}</p>
                      </div>
                    </div>
                    <a href={`mailto:${supplier.email}`} className="p-2 rounded-xl bg-brand-sky/20 text-brand-sky opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                      <Mail className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
              
              {filteredSuppliers.length === 0 && (
                <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
                  <Truck className="w-16 h-16 text-brand-navy mx-auto mb-4 opacity-20" />
                  <p className="text-brand-steel font-black text-xs uppercase tracking-widest italic">No matching supply vectors found.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Onboarding Modal */}
      {showOnboard && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-brand-deep/80 backdrop-blur-xl" onClick={() => setShowOnboard(false)} />
          <div className="relative w-full max-w-xl glass-panel p-10 rounded-[3rem] bg-brand-navy/90 border border-brand-sky/20 shadow-[0_0_100px_rgba(193,232,255,0.1)] animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setShowOnboard(false)}
              className="absolute top-8 right-8 p-3 rounded-2xl hover:bg-white/10 transition-all text-brand-steel"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="space-y-8">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-brand-sky text-brand-deep">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h2 className="text-3xl font-black text-white italic uppercase tracking-tight">Onboard Vector</h2>
                </div>
                <p className="text-brand-steel font-bold uppercase tracking-widest text-xs">Establish a new operational supply chain</p>
              </div>

              <form onSubmit={handleOnboard} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-steel uppercase tracking-widest ml-2">Supplier Name</label>
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. Acme Labels Ltd"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-brand-deep/50 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:border-brand-sky/50 transition-all placeholder:text-brand-steel"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-steel uppercase tracking-widest ml-2">Contact Person</label>
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. John Doe"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                      className="w-full bg-brand-deep/50 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:border-brand-sky/50 transition-all placeholder:text-brand-steel"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-steel uppercase tracking-widest ml-2">Phone</label>
                    <input 
                      required
                      type="text" 
                      placeholder="+256..."
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full bg-brand-deep/50 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:border-brand-sky/50 transition-all placeholder:text-brand-steel"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-steel uppercase tracking-widest ml-2">Email</label>
                    <input 
                      required
                      type="email" 
                      placeholder="procurement@acme.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-brand-deep/50 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:border-brand-sky/50 transition-all placeholder:text-brand-steel"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-steel uppercase tracking-widest ml-2">Product Vector</label>
                  <select 
                    value={formData.product_type}
                    onChange={(e) => setFormData({...formData, product_type: e.target.value})}
                    className="w-full bg-brand-deep/50 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:border-brand-sky/50 transition-all"
                  >
                    {categories.map(cat => <option key={cat} value={cat}>{cat.toUpperCase()}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-steel uppercase tracking-widest ml-2">Lead Time (Days)</label>
                    <input 
                      type="number" 
                      value={formData.lead_time_days}
                      onChange={(e) => setFormData({...formData, lead_time_days: parseInt(e.target.value)})}
                      className="w-full bg-brand-deep/50 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:border-brand-sky/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-steel uppercase tracking-widest ml-2">Min Order Qty</label>
                    <input 
                      type="number" 
                      value={formData.min_order_quantity}
                      onChange={(e) => setFormData({...formData, min_order_quantity: parseInt(e.target.value)})}
                      className="w-full bg-brand-deep/50 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:border-brand-sky/50 transition-all"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-5 rounded-[1.5rem] bg-brand-sky text-brand-deep font-black uppercase tracking-[0.3em] text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-brand-sky/30 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {loading ? (
                    <Clock className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4" />
                      Verify & Establish Pipeline
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
