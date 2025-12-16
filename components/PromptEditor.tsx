import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Lightbulb, Loader2, TrendingUp } from 'lucide-react';
import { getHairstyleSuggestions, getTrendingHairstyles } from '../services/geminiService';

interface PromptEditorProps {
  onGenerate: (prompt: string) => void;
  disabled: boolean;
}

const PromptEditor: React.FC<PromptEditorProps> = ({ onGenerate, disabled }) => {
  const [prompt, setPrompt] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [trendingStyles, setTrendingStyles] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const debounceTimerRef = useRef<any>(null);

  // Load trending styles on mount
  useEffect(() => {
    getTrendingHairstyles().then(setTrendingStyles);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setPrompt(value);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (value.length > 3) {
      setIsSuggesting(true);
      // Debounce API call
      debounceTimerRef.current = setTimeout(async () => {
        const results = await getHairstyleSuggestions(value);
        setSuggestions(results);
        setIsSuggesting(false);
      }, 800);
    } else {
      setSuggestions([]);
      setIsSuggesting(false);
    }
  };

  const handleApplySuggestion = (suggestion: string) => {
    setPrompt(suggestion);
    setSuggestions([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onGenerate(prompt);
      setSuggestions([]); // Clear suggestions on submit
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-500" />
          Custom Edit
        </h3>
      </div>
      
      <form onSubmit={handleSubmit} className="relative">
        <textarea
          value={prompt}
          onChange={handleInputChange}
          disabled={disabled}
          placeholder="e.g. 'Add a retro filter', 'Make the background a beach', 'Turn hair green'..."
          className="w-full h-32 p-4 pr-12 rounded-xl border border-slate-200 bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none resize-none transition-all text-slate-700 placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
        />
        <button
          type="submit"
          disabled={disabled || !prompt.trim()}
          className="absolute bottom-3 right-3 p-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors shadow-sm"
          title="Generate"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>

      {/* Suggestions Area */}
      <div className="min-h-[2rem]">
        {isSuggesting ? (
          <div className="flex items-center gap-2 text-slate-400 text-xs px-1 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" />
            Thinking of ideas...
          </div>
        ) : suggestions.length > 0 ? (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 px-1">
              <Lightbulb className="w-3 h-3 text-amber-500" />
              AI Suggestions
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleApplySuggestion(s)}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm rounded-full transition-colors border border-indigo-100 text-left"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : !prompt && trendingStyles.length > 0 ? (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
             <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 px-1">
               <TrendingUp className="w-3 h-3 text-brand-500" />
               Trending Now
             </div>
             <div className="flex flex-wrap gap-2">
               {trendingStyles.map((s, i) => (
                 <button
                   key={i}
                   type="button"
                   onClick={() => handleApplySuggestion(s)}
                   className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm rounded-full transition-colors border border-rose-100 text-left"
                 >
                   {s}
                 </button>
               ))}
             </div>
          </div>
        ) : (
          !prompt && (
            <p className="text-xs text-slate-500 px-1">
              Describe exactly what you want to change. Start typing for AI suggestions.
            </p>
          )
        )}
      </div>
    </div>
  );
};

export default PromptEditor;
