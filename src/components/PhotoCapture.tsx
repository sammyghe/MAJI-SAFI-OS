'use client';

import { useRef, useState } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PhotoCaptureProps {
  userId: string;
  onUploaded: (urls: string[]) => void;
  maxPhotos?: number;
}

export default function PhotoCapture({ userId, onUploaded, maxPhotos = 3 }: PhotoCaptureProps) {
  const [urls, setUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const safeName = file.name.replace(/[^a-z0-9.]/gi, '_');
    const path = `${userId}/${Date.now()}-${safeName}`;
    const { data, error } = await supabase.storage.from('worker-captures').upload(path, file, { upsert: false });
    if (!error && data) {
      const { data: { publicUrl } } = supabase.storage.from('worker-captures').getPublicUrl(data.path);
      const next = [...urls, publicUrl];
      setUrls(next);
      onUploaded(next);
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const remove = (url: string) => {
    const next = urls.filter((u) => u !== url);
    setUrls(next);
    onUploaded(next);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {urls.map((url, i) => (
        <div key={i} className="relative flex-shrink-0">
          <img src={url} alt="" className="w-12 h-12 rounded object-cover border border-slate-200" />
          <button
            type="button"
            onClick={() => remove(url)}
            className="absolute -top-1 -right-1 bg-red-500 rounded-full w-4 h-4 flex items-center justify-center"
          >
            <X size={9} className="text-white" />
          </button>
        </div>
      ))}
      {urls.length < maxPhotos && (
        <label className={`p-2 rounded bg-zinc-700 hover:bg-zinc-600 text-white cursor-pointer transition-colors flex-shrink-0 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFile}
            disabled={uploading}
          />
        </label>
      )}
    </div>
  );
}
