
import React from 'react';
import { Ruler, Minus, Plus } from 'lucide-react';

interface HairLengthSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
}

const LABELS = [
  { val: 0, label: 'Pixie' },
  { val: 25, label: 'Short' },
  { val: 50, label: 'Medium' },
  { val: 75, label: 'Long' },
  { val: 100, label: 'Max' },
];

const HairLengthSlider: React.FC<HairLengthSliderProps> = ({ value, onChange, disabled }) => {
  const getLabel = (v: number) => {
    if (v < 15) return "Pixie / Buzz";
    if (v < 35) return "Short / Bob";
    if (v < 65) return "Shoulder Length";
    if (v < 85) return "Mid-Back";
    return "Waist Length";
  };

  return (
    <div className={`space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 transition-opacity ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Ruler className="w-4 h-4 text-brand-500" />
          <span>Adjust Length</span>
        </div>
        <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-md border border-brand-100 min-w-[80px] text-center">
          {getLabel(value)}
        </span>
      </div>

      <div className="relative pt-2 pb-1">
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        <div className="flex justify-between mt-2 px-1">
          {LABELS.map((item) => (
            <div 
              key={item.label} 
              className="flex flex-col items-center cursor-pointer group"
              onClick={() => !disabled && onChange(item.val)}
            >
              <div className={`w-1 h-1 rounded-full mb-1 ${Math.abs(value - item.val) < 10 ? 'bg-brand-500 scale-150' : 'bg-slate-300'}`} />
              <span className={`text-[10px] ${Math.abs(value - item.val) < 10 ? 'text-brand-700 font-bold' : 'text-slate-400 group-hover:text-slate-600'}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HairLengthSlider;
