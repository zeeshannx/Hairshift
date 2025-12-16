import React, { useState } from 'react';
import { Hairstyle } from '../types';
import { Sparkles, Filter, Star } from 'lucide-react';

interface HairstyleGalleryProps {
  onSelect: (hairstyle: Hairstyle) => void;
  disabled: boolean;
}

type Category = 'All' | 'Famous' | 'Short' | 'Long' | 'Creative';

const CATEGORIES: Category[] = ['All', 'Famous', 'Short', 'Long', 'Creative'];

// Pre-curated styles with optimized prompts and high-fidelity preview images of PEOPLE wearing the styles
const HAIRSTYLES: (Hairstyle & { category: Category })[] = [
  // --- FAMOUS / ICONIC ---
  {
    id: 'f1',
    name: 'The Rachel',
    category: 'Famous',
    prompt: "Change the hairstyle to the iconic 90s 'The Rachel' cut. Shoulder-length with heavy, bouncy layers, face-framing highlights, and a voluminous blowout. Maintain the original face and lighting.",
    previewUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&h=600&fit=crop&q=80',
  },
  {
    id: 'f2',
    name: 'The Marilyn',
    category: 'Famous',
    prompt: "Change the hairstyle to a retro 1950s platinum blonde curly bob, styled like Marilyn Monroe. High glamour, soft glossy waves. Keep the face identical.",
    previewUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&h=600&fit=crop&q=80',
  },
  {
    id: 'f3',
    name: 'The Pompadour',
    category: 'Famous',
    prompt: "Change the hairstyle to a classic high-volume Pompadour. Slicked back sides with a tall, rolled top. Rockabilly style with a modern edge. Keep the face identical.",
    previewUrl: 'https://images.unsplash.com/photo-1503443207922-dff7d543fd0e?w=500&h=600&fit=crop&q=80',
  },
  {
    id: 'f4',
    name: 'The Farrah',
    category: 'Famous',
    prompt: "Change the hairstyle to 70s feathered layers, massive volume, and flipped-out wings style like Farrah Fawcett. Golden blonde highlights. Keep the face identical.",
    previewUrl: 'https://images.unsplash.com/photo-1588669527685-61848525b64c?w=500&h=600&fit=crop&q=80',
  },
  {
    id: 'f5',
    name: 'The Beehive',
    category: 'Famous',
    prompt: "Change the hairstyle to a massive 60s Beehive updo. High volume, elegant, retro styling with a smooth finish. Keep the face identical.",
    previewUrl: 'https://images.unsplash.com/photo-1596706059278-f2b70c3606f5?w=500&h=600&fit=crop&q=80',
  },
  {
    id: 'f6',
    name: 'Finger Waves',
    category: 'Famous',
    prompt: "Change the hairstyle to 1920s glossy finger waves. Vintage flapper style, sculpted close to the head with a wet-look finish. Keep the face identical.",
    previewUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&h=600&fit=crop&q=80',
  },
  {
    id: 'f7',
    name: 'The Shag',
    category: 'Famous',
    prompt: "Change the hairstyle to a 70s rock 'n roll shag cut. Choppy layers, bangs, messy texture, and shoulder length. Keep the face identical.",
    previewUrl: 'https://images.unsplash.com/photo-1506307185386-a5180f2d9396?w=500&h=600&fit=crop&q=80',
  },

  // --- SHORT ---
  {
    id: 's1',
    name: 'French Bob',
    category: 'Short',
    prompt: "Change the hairstyle to a chic, chin-length French bob with blunt bangs. Glossy texture, Parisian style. Keep the face identical.",
    previewUrl: 'https://images.unsplash.com/photo-1595769829871-29472e3a131f?w=500&h=600&fit=crop&q=80',
  },
  {
    id: 's2',
    name: 'Textured Pixie',
    category: 'Short',
    prompt: "Change the hairstyle to a short, textured pixie cut with soft, wispy bangs. Modern, edgy, and layered. Keep the face identical.",
    previewUrl: 'https://images.unsplash.com/photo-1606822360431-7557d34d284a?w=500&h=600&fit=crop&q=80',
  },
  {
    id: 's3',
    name: 'Buzz Cut',
    category: 'Short',
    prompt: "Change the hairstyle to a modern military buzz cut. Very short length, uniform fade, clean hairline. Keep the face identical.",
    previewUrl: 'https://images.unsplash.com/photo-1618077360395-f3068be8e001?w=500&h=600&fit=crop&q=80',
  },

  // --- LONG ---
  {
    id: 'l1',
    name: 'Sleek & Straight',
    category: 'Long',
    prompt: "Change the hairstyle to waist-length, liquid-smooth straight hair with a center part. Glass hair trend, high shine. Keep the face identical.",
    previewUrl: 'https://images.unsplash.com/photo-1518599818809-a78b40813958?w=500&h=600&fit=crop&q=80',
  },
  {
    id: 'l2',
    name: 'Curtain Bangs',
    category: 'Long',
    prompt: "Change the hairstyle to long wavy layers with trendy curtain bangs framing the face. Soft, romantic, and voluminous. Keep the face identical.",
    previewUrl: 'https://images.unsplash.com/photo-1606132742915-0599119c4d2d?w=500&h=600&fit=crop&q=80',
  },
  {
    id: 'l3',
    name: 'Beach Waves',
    category: 'Long',
    prompt: "Change the hairstyle to long, tousled beach waves with sun-kissed highlights. Salt spray texture, natural look. Keep the face identical.",
    previewUrl: 'https://images.unsplash.com/photo-1592305021288-75c1d63640b7?w=500&h=600&fit=crop&q=80',
  },

  // --- CREATIVE ---
  {
    id: 'cr1',
    name: 'The Mullet',
    category: 'Creative',
    prompt: "Change the hairstyle to a modern wolf cut / mullet. Short and choppy on top, long and textured in the back. Edgy fashion style. Keep the face identical.",
    previewUrl: 'https://images.unsplash.com/photo-1541814736606-d52f9c313f83?w=500&h=600&fit=crop&q=80',
  },
  {
    id: 'cr2',
    name: 'Viking Braids',
    category: 'Creative',
    prompt: "Change the hairstyle to intricate, warrior-style Viking braids. Detailed plating, shaved sides, and rugged texture. Keep the face identical.",
    previewUrl: 'https://images.unsplash.com/photo-1616091216791-a5360b5fc78a?w=500&h=600&fit=crop&q=80',
  },
  {
    id: 'cr3',
    name: 'Pastel Pink',
    category: 'Creative',
    prompt: "Change the hairstyle to a soft pastel pink wavy bob. Cotton candy color, dreamy aesthetic. Keep the face identical.",
    previewUrl: 'https://images.unsplash.com/photo-1582095133179-bfd08e2fc6b3?w=500&h=600&fit=crop&q=80',
  },
  {
    id: 'cr4',
    name: 'The Afro',
    category: 'Creative',
    prompt: "Change the hairstyle to a large, perfectly round, voluminous natural Afro. Define the tight coils, proud silhouette. Keep the face identical.",
    previewUrl: 'https://images.unsplash.com/photo-1509967419530-322706c582c9?w=500&h=600&fit=crop&q=80',
  }
];

const HairstyleGallery: React.FC<HairstyleGalleryProps> = ({ onSelect, disabled }) => {
  const [activeCategory, setActiveCategory] = useState<Category>('All');

  const filteredStyles = activeCategory === 'All' 
    ? HAIRSTYLES 
    : HAIRSTYLES.filter(s => s.category === activeCategory);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-500" />
          Style Library
        </h3>
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Filter className="w-3 h-3" />
          <span>{filteredStyles.length} styles</span>
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            disabled={disabled}
            className={`
              px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5
              ${activeCategory === cat 
                ? 'bg-brand-600 text-white border-brand-600 shadow-md' 
                : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300 hover:text-brand-600'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {cat === 'Famous' && <Star className="w-3 h-3 fill-current" />}
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {filteredStyles.map((style) => (
          <button
            key={style.id}
            onClick={() => onSelect(style)}
            disabled={disabled}
            className={`
              group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100 transition-all duration-300
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-xl hover:scale-[1.02]'}
            `}
          >
            <div className="aspect-[3/4] w-full relative">
             <img 
               src={style.previewUrl} 
               alt={style.name} 
               className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
             />
             <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
             
             {/* Text Overlay */}
             <div className="absolute bottom-0 left-0 right-0 p-3 text-left transform transition-transform duration-300 translate-y-1 group-hover:translate-y-0">
               <span className="text-[10px] uppercase tracking-wider text-brand-200 font-bold mb-0.5 block opacity-90">
                 {style.category}
               </span>
               <span className="text-white font-bold text-sm leading-tight drop-shadow-md block">
                 {style.name}
               </span>
             </div>
             
             {/* "Select" Overlay Icon */}
             <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform scale-50 group-hover:scale-100 border border-white/30">
               <Sparkles className="w-4 h-4 text-white" />
             </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default HairstyleGallery;