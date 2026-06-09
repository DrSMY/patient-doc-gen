import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { enhanceText } from '@/lib/geminiService';
import { AIAssistProps } from '@/lib/types';

export const AIAssistButton: React.FC<AIAssistProps> = ({ currentText, onReplace, context }) => {
  const [loading, setLoading] = useState(false);

  const handleEnhance = async () => {
    if (!currentText || currentText.trim().length < 5) return;
    setLoading(true);
    try {
      const improved = await enhanceText(currentText, context);
      if (improved && improved !== currentText) {
        onReplace(improved);
      } else if (improved === currentText) {
        alert("AI suggests no changes for this text.");
      } else {
        alert("AI could not enhance this text. Please try again.");
      }
    } catch (e) {
      console.error("Failed to enhance text", e);
      alert("AI enhancement failed. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute right-3 top-3 z-10">
      <div className={`relative ${loading ? 'animate-pulse' : ''}`}>
        {/* Glow effect */}
        {!loading && currentText && currentText.trim().length > 5 && (
            <div className="absolute inset-0 bg-indigo-500/20 blur-lg rounded-full animate-pulse"></div>
        )}
        
        <button
          onClick={handleEnhance}
          disabled={loading || !currentText || currentText.trim().length < 5}
          type="button"
          className="relative p-2 bg-white text-indigo-600 border border-indigo-100 hover:border-indigo-200 hover:shadow-lg rounded-xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed group active:scale-90"
          title="Polish with Gemini AI"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className={`w-4 h-4 ${currentText ? 'fill-indigo-50' : ''}`} />
          )}
          <span className="sr-only">Enhance with AI</span>
          
          {/* Tooltip on hover */}
          <span className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Gemini Polish
          </span>
        </button>
      </div>
    </div>
  );
};