"use client";

import { useState } from "react";
import { Plus, Tag, X } from "lucide-react";

interface CategoryManagerProps {
  categories: string[];
  onAdd: (category: string) => void;
  onRemove: (category: string) => void;
}

export default function SupplierCategoryManager({ categories, onAdd, onRemove }: CategoryManagerProps) {
  const [newCategory, setNewCategory] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleAdd = () => {
    if (newCategory.trim()) {
      onAdd(newCategory.trim());
      setNewCategory("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black text-brand-steel uppercase tracking-widest flex items-center gap-2">
          <Tag className="w-3 h-3" />
          Raw Material Vectors
        </h3>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 px-3 rounded-xl bg-brand-sky/10 text-brand-sky border border-brand-sky/20 hover:bg-brand-sky/20 transition-all text-[10px] font-black uppercase tracking-widest"
        >
          {isOpen ? 'Close' : 'Manage Categories'}
        </button>
      </div>

      {isOpen && (
        <div className="p-5 rounded-3xl bg-brand-navy/30 border border-white/5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <span 
                key={cat} 
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-brand-navy border border-white/10 text-[10px] font-black text-brand-pale uppercase tracking-widest group"
              >
                {cat}
                <button 
                  onClick={() => onRemove(cat)}
                  className="text-brand-steel hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="e.g. Seals"
              className="flex-1 bg-brand-deep/50 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder:text-brand-steel focus:outline-none focus:border-brand-sky/50 transition-all"
            />
            <button
              onClick={handleAdd}
              className="p-2 px-4 rounded-xl bg-brand-sky text-brand-deep font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
