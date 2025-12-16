import React, { useRef, useState, useEffect } from 'react';
import { Upload, Camera, Image as ImageIcon, Brush, Eraser, Trash2, Check, Circle, Minus, Plus, Wand2, Loader2 } from 'lucide-react';
import { generateHairMask } from '../services/geminiService';

interface ImageUploaderProps {
  currentImage: string | null;
  onImageUpload: (base64: string) => void;
  onMaskChange: (base64: string | null) => void;
  disabled: boolean;
  isMaskingMode: boolean;
  toggleMaskingMode: () => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  currentImage, 
  onImageUpload, 
  onMaskChange,
  disabled, 
  isMaskingMode,
  toggleMaskingMode
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Masking State
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  const [brushSize, setBrushSize] = useState(30); // 1-100 scale
  const [isAutoMasking, setIsAutoMasking] = useState(false);

  // Initialize canvas when image loads or mode changes
  useEffect(() => {
    if (currentImage && imgRef.current && canvasRef.current) {
      const img = imgRef.current;
      const canvas = canvasRef.current;
      
      // Match canvas resolution to actual image resolution
      if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
      }
    }
  }, [currentImage, isMaskingMode]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageUpload(reader.result as string);
        clearMask(); // Reset mask on new upload
      };
      reader.readAsDataURL(file);
    }
  };

  const clearMask = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      onMaskChange(null);
    }
  };

  const updateMask = () => {
    // Export mask
    if (canvasRef.current) {
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = canvasRef.current.width;
      exportCanvas.height = canvasRef.current.height;
      const ctx = exportCanvas.getContext('2d');
      if (ctx) {
          ctx.fillStyle = 'black';
          ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
          ctx.drawImage(canvasRef.current, 0, 0);
          onMaskChange(exportCanvas.toDataURL('image/png'));
      }
    }
  };

  const handleAutoMask = async () => {
    if (!currentImage || disabled) return;
    setIsAutoMasking(true);
    try {
      const maskBase64 = await generateHairMask(currentImage);
      
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear existing mask to ensure clean state from auto-select
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Process pixels to make black transparent and white opaque
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;

        // Draw the fetched mask image scaled to canvas size
        tempCtx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // Simple threshold for white/light gray
          if (r > 100 && g > 100 && b > 100) {
            // Keep white, ensure full opacity
            data[i] = 255;
            data[i+1] = 255;
            data[i+2] = 255;
            data[i+3] = 255; // Alpha
          } else {
            // Make transparent
            data[i+3] = 0;
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
        updateMask();
        setIsAutoMasking(false);
      };
      img.src = maskBase64;
    } catch (e) {
      console.error("Auto mask failed", e);
      setIsAutoMasking(false);
    }
  };

  // Drawing Logic
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return null;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isMaskingMode || disabled || isAutoMasking) return;
    e.preventDefault(); // Prevent scrolling on touch
    setIsDrawing(true);
    
    const coords = getCoordinates(e);
    if (coords && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        // Calculate dynamic line width based on image size
        const imageWidth = canvasRef.current.width;
        const widthFactor = (brushSize / 100) * 0.15; // Max 15% of image width
        const pixelSize = Math.max(5, imageWidth * widthFactor); // Min 5px

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = pixelSize;
        ctx.strokeStyle = 'white';
        ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';

        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
      }
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !isMaskingMode || disabled || isAutoMasking) return;
    e.preventDefault();
    
    const coords = getCoordinates(e);
    if (coords && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      updateMask();
    }
  };

  const triggerUpload = () => {
    if (!disabled && !isMaskingMode) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="space-y-4">
      <div 
        className={`
          relative w-full max-w-sm mx-auto overflow-hidden rounded-2xl border-2 border-dashed transition-all
          ${currentImage ? 'border-transparent' : 'border-slate-300 bg-slate-100 aspect-[3/4]'}
          ${disabled ? 'cursor-not-allowed opacity-75' : ''}
          ${!currentImage && !disabled ? 'cursor-pointer hover:border-brand-400 hover:bg-slate-50' : ''}
        `}
        onClick={!currentImage ? triggerUpload : undefined}
      >
        {currentImage ? (
          <div className="relative group">
            <img 
              ref={imgRef}
              src={currentImage} 
              alt="Uploaded Selfie" 
              className="w-full h-auto block"
            />
            
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 w-full h-full touch-none transition-opacity ${isMaskingMode ? 'opacity-80 cursor-crosshair' : 'opacity-0 pointer-events-none'}`}
              style={{ backgroundColor: 'transparent' }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            
            {/* Auto Masking Loader Overlay */}
            {isAutoMasking && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-30 animate-in fade-in">
                    <Loader2 className="w-10 h-10 text-white animate-spin mb-2" />
                    <p className="text-white font-medium text-sm text-center">Detecting Hair...</p>
                </div>
            )}

            {/* Masking Tools Overlay */}
            {isMaskingMode && (
              <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-slate-200 p-3 z-20 animate-in slide-in-from-bottom-2 fade-in duration-200">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    {/* Tool Toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button 
                        onClick={() => setTool('brush')}
                        className={`p-2 rounded-md transition-all ${tool === 'brush' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        title="Brush"
                      >
                        <Brush className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => setTool('eraser')}
                        className={`p-2 rounded-md transition-all ${tool === 'eraser' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        title="Eraser"
                      >
                        <Eraser className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Size Slider */}
                    <div className="flex-1 flex items-center gap-2 px-2">
                      <Circle className="w-2 h-2 text-slate-400" />
                      <input 
                        type="range" 
                        min="1" 
                        max="100" 
                        value={brushSize} 
                        onChange={(e) => setBrushSize(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-500"
                        title="Brush Size"
                      />
                      <Circle className="w-5 h-5 text-slate-400" />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                     <div className="flex gap-2">
                        <button 
                           onClick={clearMask}
                           className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors"
                           title="Clear Mask"
                        >
                           <Trash2 className="w-4 h-4" />
                        </button>
                        <button 
                           onClick={handleAutoMask}
                           disabled={isAutoMasking}
                           className="p-2 rounded-lg text-brand-600 hover:bg-brand-50 bg-brand-50/50 transition-colors flex items-center gap-1.5"
                           title="Auto Select Hair"
                        >
                           <Wand2 className="w-4 h-4" />
                           <span className="text-xs font-semibold">Smart Select</span>
                        </button>
                     </div>
                     <button
                        onClick={toggleMaskingMode}
                        className="text-xs font-bold bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 flex items-center gap-1.5 shadow-sm transition-colors"
                     >
                       <Check className="w-3.5 h-3.5" /> Done
                     </button>
                  </div>
                </div>
              </div>
            )}

            {!isMaskingMode && !disabled && (
              <div 
                onClick={triggerUpload}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
              >
                <span className="bg-white/90 text-slate-900 px-4 py-2 rounded-full font-medium text-sm flex items-center gap-2 shadow-lg">
                  <Camera className="w-4 h-4" />
                  Change Photo
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
            <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 text-brand-500">
              <Upload className="w-8 h-8" />
            </div>
            <p className="font-semibold text-slate-600 text-lg mb-1">Upload Selfie</p>
            <p className="text-sm">Click to browse or drop a photo here</p>
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
      
      {currentImage && (
        <div className="flex items-center justify-center gap-2">
           {!isMaskingMode && (
             <button
              onClick={toggleMaskingMode}
              disabled={disabled}
              className={`
                flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all shadow-sm
                bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-brand-300 hover:text-brand-600
              `}
             >
               <Brush className="w-4 h-4" />
               Paint Hair Mask
             </button>
           )}
           
           {currentImage && !isMaskingMode && (
              <p className="w-full text-center text-[10px] text-slate-400 mt-2 absolute -bottom-6">
                Paint over hair for better results
              </p>
           )}
        </div>
      )}
    </div>
  );
};

export default ImageUploader;