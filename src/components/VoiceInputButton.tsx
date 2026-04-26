'use client';

import { useState, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  currentValue: string;
}

export default function VoiceInputButton({ onTranscript, currentValue }: VoiceInputButtonProps) {
  const [listening, setListening] = useState(false);
  const recogRef = useRef<any>(null);

  const toggle = () => {
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert('Voice input requires Chrome or Edge browser.');
      return;
    }
    if (listening) {
      recogRef.current?.stop();
      return;
    }
    const recog = new SR();
    recog.continuous = false;
    recog.interimResults = false;
    recog.lang = 'en-UG';
    recog.onresult = (e: any) => {
      const t = e.results[0][0].transcript;
      onTranscript(currentValue ? `${currentValue} ${t}` : t);
    };
    recog.onend = () => setListening(false);
    recog.onerror = () => setListening(false);
    recog.start();
    recogRef.current = recog;
    setListening(true);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={listening ? 'Tap to stop recording' : 'Tap to dictate'}
      className={`p-2 rounded-full transition-all flex-shrink-0 ${
        listening
          ? 'bg-red-500 animate-pulse'
          : 'bg-zinc-700 hover:bg-zinc-600'
      } text-white`}
    >
      {listening ? <MicOff size={15} /> : <Mic size={15} />}
    </button>
  );
}
