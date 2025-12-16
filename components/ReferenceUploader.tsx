import React, { useRef } from 'react';
import { Upload, X } from 'lucide-react';

interface ReferenceUploaderProps {
  referenceImage: string | null;
  onUpload: (base64: string) => void;
  onClear: () => void;
  disabled: boolean;
}

const ReferenceUploader: React.FC<ReferenceUploaderProps> = ({ 
  referenceImage, 
  onUpload, 
  onClear,
  disabled 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpload(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-700">Reference Hairstyle (Optional)</h3>
      
      {!referenceImage ? (
        <div 
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`
            border-2 border-dashed border-slate-300 rounded-xl p-6 
            flex flex-col items-center justify-center text-slate-500
            transition-all bg-slate-50
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-brand-400 hover:bg-brand-50/50'}
          `}
        >
          <Upload className="w-6 h-6 mb-2" />
          <span className="text-xs font-medium">Upload Hairstyle Photo</span>
          <span className="text-[10px] text-slate-400 mt-1">Use this style on your selfie</span>
        </div>
      ) : (
        <div className="relative group rounded-xl overflow-hidden border border-slate-200">
          <img 
            src={referenceImage} 
            alt="Reference Style" 
            className="w-full h-32 object-cover bg-slate-100"
          />
          <button
            onClick={onClear}
            disabled={disabled}
            className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <input 
        ref={fileInputRef}
        type="file" 
        accept="image/*" 
        onChange={handleFileChange}
        className="hidden" 
        disabled={disabled}
      />
    </div>
  );
};

export default ReferenceUploader;
