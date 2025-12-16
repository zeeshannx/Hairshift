import React, { useState } from 'react';
import { Scissors, Wand2, ArrowRight, RotateCcw, Download, Info, Layers, Sparkles, User, Lightbulb, ChevronLeft, ChevronRight, RefreshCw, Loader2, MessageSquare } from 'lucide-react';
import ImageUploader from './components/ImageUploader';
import ReferenceUploader from './components/ReferenceUploader';
import HairstyleGallery from './components/HairstyleGallery';
import PromptEditor from './components/PromptEditor';
import FeedbackModal from './components/FeedbackModal';
import { generateEditedImage, analyzeFace, generateAngleView } from './services/geminiService';
import { GenerationStatus, Hairstyle, FaceAnalysis, ViewAngle } from './types';

const App: React.FC = () => {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [maskImage, setMaskImage] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  
  // Views State: Stores map of Angle -> ImageURL
  const [views, setViews] = useState<Record<string, string>>({});
  const [activeView, setActiveView] = useState<ViewAngle>('Front');
  const [loadingViews, setLoadingViews] = useState<Record<string, boolean>>({});
  
  // Track the current prompt used for generation
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [isMaskingMode, setIsMaskingMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'preset' | 'reference' | 'custom'>('preset');

  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FaceAnalysis | null>(null);

  // Feedback State
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  const handleImageUpload = async (base64: string) => {
    setSourceImage(base64);
    setViews({});
    setActiveView('Front');
    setMaskImage(null);
    setStatus(GenerationStatus.IDLE);
    setErrorMsg(null);
    setAnalysisResult(null);

    // Trigger AI Face Analysis
    setIsAnalyzing(true);
    try {
      const result = await analyzeFace(base64);
      setAnalysisResult(result);
    } catch (err) {
      console.error("Analysis failed", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerate = async (basePrompt: string) => {
    if (!sourceImage) return;

    setStatus(GenerationStatus.LOADING);
    setErrorMsg(null);
    setViews({});
    setActiveView('Front');
    setIsMaskingMode(false);

    setCurrentPrompt(basePrompt);

    try {
      const resultBase64 = await generateEditedImage({
        sourceImage,
        prompt: basePrompt,
        maskImage,
        referenceImage: activeTab === 'reference' ? referenceImage : null
      });
      setViews({ Front: resultBase64 });
      setStatus(GenerationStatus.SUCCESS);
    } catch (error: any) {
      console.error(error);
      setStatus(GenerationStatus.ERROR);
      const msg = error?.message || '';
      if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
        setErrorMsg("High traffic volume (Quota Exceeded). Please wait a minute and try again.");
      } else {
        setErrorMsg("Failed to generate image. Please try again.");
      }
    }
  };

  const handleGenerateView = async (angle: ViewAngle) => {
    if (!sourceImage || !views['Front'] || !currentPrompt) return;
    
    // Prevent generation for video types if they still exist in types
    if (angle === '3D' || angle === 'Physics') return;

    setLoadingViews(prev => ({ ...prev, [angle]: true }));
    try {
      const viewResult = await generateAngleView(
        sourceImage, 
        views['Front'], 
        currentPrompt, 
        angle
      );
      setViews(prev => ({ ...prev, [angle]: viewResult }));
      setActiveView(angle);
    } catch (error: any) {
      console.error(`Failed to generate ${angle} view`, error);
      const msg = error?.message || '';
      if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
        setErrorMsg("Quota Exceeded. Please wait a moment.");
      } else {
        setErrorMsg(`Failed to generate ${angle} view. Please try again.`);
      }
      setStatus(GenerationStatus.ERROR);
    } finally {
      setLoadingViews(prev => ({ ...prev, [angle]: false }));
    }
  };

  const handleViewChange = (angle: ViewAngle) => {
    if (status === GenerationStatus.ERROR) {
        setStatus(GenerationStatus.SUCCESS); // Clear error on new attempt
        setErrorMsg(null);
    }
    
    if (views[angle]) {
      setActiveView(angle);
    } else {
      handleGenerateView(angle);
    }
  };

  const handleStyleSelect = (style: Hairstyle) => {
    handleGenerate(style.prompt);
  };

  const handleSuggestionClick = (description: string) => {
    handleGenerate(description);
  };

  const handleReferenceGenerate = () => {
    if (!referenceImage) return;
    handleGenerate("Change the hairstyle to match the reference image.");
  };

  const handleReset = () => {
    setViews({});
    setStatus(GenerationStatus.IDLE);
    setErrorMsg(null);
  };

  const currentGeneratedContent = views[activeView];

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-brand-100 selection:text-brand-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-brand-600 p-2 rounded-lg text-white">
              <Scissors className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-none">HairShift AI</h1>
              <p className="text-xs text-slate-500 font-medium">Powered by Nano Banana</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsFeedbackOpen(true)}
              className="text-sm text-slate-500 hover:text-brand-600 transition-colors flex items-center gap-2 font-medium"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Feedback</span>
            </button>
            <a href="https://ai.google.dev" target="_blank" rel="noreferrer" className="text-sm text-slate-500 hover:text-brand-600 transition-colors hidden sm:block">
              Learn more about Gemini
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left Column: Input */}
          <div className="lg:col-span-4 space-y-8">
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-sm">1</span>
                Upload Selfie
              </h2>
              <ImageUploader 
                currentImage={sourceImage}
                onImageUpload={handleImageUpload}
                onMaskChange={setMaskImage}
                disabled={status === GenerationStatus.LOADING}
                isMaskingMode={isMaskingMode}
                toggleMaskingMode={() => setIsMaskingMode(!isMaskingMode)}
              />
            </section>

            {sourceImage && (
              <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 animate-in slide-in-from-bottom-4 duration-500 fade-in">
                <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-sm">2</span>
                  Select Style
                </h2>

                {/* AI Analysis Section */}
                <div className="mb-6">
                  {isAnalyzing ? (
                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-3 animate-pulse">
                       <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center">
                         <Sparkles className="w-4 h-4 text-indigo-600 animate-spin" />
                       </div>
                       <div className="flex-1">
                         <div className="h-4 bg-indigo-200 rounded w-2/3 mb-2"></div>
                         <div className="h-3 bg-indigo-200 rounded w-1/2"></div>
                       </div>
                    </div>
                  ) : analysisResult ? (
                    <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl animate-in fade-in slide-in-from-top-2 duration-500">
                      <div className="flex items-start gap-3 mb-3">
                         <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center flex-shrink-0 text-indigo-600 mt-1">
                           <User className="w-4 h-4" />
                         </div>
                         <div>
                           <h4 className="font-semibold text-slate-800 text-sm">Face Shape Detected: <span className="text-indigo-600">{analysisResult.faceShape}</span></h4>
                           <p className="text-xs text-slate-500 leading-relaxed mt-1">{analysisResult.features}</p>
                         </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
                           <Lightbulb className="w-3 h-3 text-amber-500" />
                           Recommended Styles
                        </div>
                        <div className="grid gap-2">
                          {analysisResult.suggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSuggestionClick(suggestion.description)}
                              disabled={status === GenerationStatus.LOADING}
                              className="text-left p-2.5 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg transition-all text-xs group"
                            >
                              <span className="font-semibold text-slate-700 group-hover:text-indigo-700 block mb-0.5">{suggestion.name}</span>
                              <span className="text-slate-500 line-clamp-1">{suggestion.description}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
                
                {/* Tabs */}
                <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
                  <button
                    onClick={() => setActiveTab('preset')}
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all ${activeTab === 'preset' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Presets
                  </button>
                  <button
                    onClick={() => setActiveTab('reference')}
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all ${activeTab === 'reference' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Upload
                  </button>
                  <button
                    onClick={() => setActiveTab('custom')}
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all ${activeTab === 'custom' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Custom
                  </button>
                </div>

                <div className="space-y-6">
                   {activeTab === 'preset' && (
                     <div className="animate-in fade-in duration-300">
                        <p className="text-xs text-slate-500 mb-4">Choose a predefined style to apply to your photo.</p>
                        <HairstyleGallery 
                          onSelect={handleStyleSelect} 
                          disabled={status === GenerationStatus.LOADING}
                        />
                     </div>
                   )}

                   {activeTab === 'reference' && (
                     <div className="animate-in fade-in duration-300 space-y-4">
                        <p className="text-xs text-slate-500">Upload a photo of a hairstyle you love, and the AI will fuse it onto your selfie.</p>
                        <ReferenceUploader 
                          referenceImage={referenceImage}
                          onUpload={setReferenceImage}
                          onClear={() => setReferenceImage(null)}
                          disabled={status === GenerationStatus.LOADING}
                        />
                        <button
                          onClick={handleReferenceGenerate}
                          disabled={!referenceImage || status === GenerationStatus.LOADING}
                          className="w-full py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center gap-2"
                        >
                          <Layers className="w-5 h-5" />
                          Fuse Styles
                        </button>
                     </div>
                   )}

                   {activeTab === 'custom' && (
                     <div className="animate-in fade-in duration-300">
                        <PromptEditor 
                          onGenerate={handleGenerate}
                          disabled={status === GenerationStatus.LOADING}
                        />
                     </div>
                   )}
                </div>
              </section>
            )}
          </div>

          {/* Right Column: Output */}
          <div className="lg:col-span-8 flex flex-col h-full gap-6">
             <section className={`
                flex-1 min-h-[500px] rounded-3xl border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden transition-all
                ${currentGeneratedContent ? 'bg-slate-900 border-transparent' : 'bg-slate-100/50 border-slate-300'}
             `}>
               
               {!sourceImage && (
                 <div className="text-center p-8 max-w-md">
                   <div className="w-20 h-20 bg-slate-200 rounded-full mx-auto mb-6 flex items-center justify-center text-slate-400">
                     <Wand2 className="w-10 h-10" />
                   </div>
                   <h3 className="text-xl font-bold text-slate-700 mb-2">Ready to Transform?</h3>
                   <p className="text-slate-500">Upload a selfie on the left to get started.</p>
                 </div>
               )}

               {sourceImage && !currentGeneratedContent && status !== GenerationStatus.LOADING && (
                 <div className="text-center p-8 max-w-md animate-in fade-in zoom-in duration-300">
                   <div className="w-20 h-20 bg-white rounded-full mx-auto mb-6 flex items-center justify-center text-brand-500 shadow-md">
                     <ArrowRight className="w-10 h-10" />
                   </div>
                   <h3 className="text-xl font-bold text-slate-700 mb-2">Select a Style</h3>
                   <p className="text-slate-500">
                     {activeTab === 'preset' && "Pick a hairstyle from the gallery."}
                     {activeTab === 'reference' && "Upload a reference photo to fuse styles."}
                     {activeTab === 'custom' && "Type a custom prompt to edit your look."}
                   </p>
                 </div>
               )}

               {/* Loading Overlay */}
               {(status === GenerationStatus.LOADING || loadingViews[activeView]) && (
                 <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-10 p-8">
                   <div className="relative w-24 h-24 mb-6">
                     <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
                     <div className="absolute inset-0 border-4 border-brand-500 rounded-full border-t-transparent animate-spin"></div>
                     <div className="absolute inset-0 flex items-center justify-center">
                        <Scissors className="w-8 h-8 text-brand-500 animate-pulse" />
                     </div>
                   </div>
                   <h3 className="text-xl font-bold text-slate-800 mb-2">
                      {loadingViews[activeView] ? `Generating ${activeView} View...` : 'Designing New Look...'}
                   </h3>
                   <p className="text-slate-500 text-center max-w-xs">
                     Using Gemini to process your image.
                   </p>
                 </div>
               )}

               {status === GenerationStatus.ERROR && (
                 <div className="text-center p-8 max-w-md bg-red-50 rounded-xl border border-red-100 m-4">
                   <div className="w-12 h-12 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center text-red-600">
                     <Info className="w-6 h-6" />
                   </div>
                   <h3 className="text-lg font-bold text-red-800 mb-2">Oops!</h3>
                   <p className="text-red-600 mb-4">{errorMsg}</p>
                   <button 
                     onClick={handleReset}
                     className="px-4 py-2 bg-white border border-red-200 text-red-700 rounded-lg hover:bg-red-50 text-sm font-medium transition-colors"
                   >
                     Try Again
                   </button>
                 </div>
               )}

               {currentGeneratedContent && !loadingViews[activeView] && (
                 <div className="relative w-full h-full flex items-center justify-center bg-black animate-in fade-in duration-700">
                      <img 
                        src={currentGeneratedContent} 
                        alt={`Generated ${activeView} View`} 
                        className="max-w-full max-h-full object-contain"
                      />
                    
                    {/* Floating Action Buttons */}
                    <div className="absolute bottom-6 right-6 flex gap-3">
                       <a 
                         href={currentGeneratedContent} 
                         download={`hairshift-${activeView.toLowerCase()}.png`}
                         className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-full transition-colors border border-white/20"
                         title="Download"
                       >
                         <Download className="w-5 h-5" />
                       </a>
                       <button 
                         onClick={handleReset}
                         className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-full transition-colors border border-white/20"
                         title="Start Over"
                       >
                         <RotateCcw className="w-5 h-5" />
                       </button>
                    </div>
                 </div>
               )}
             </section>

             {/* Angle Selector Bar */}
             {views['Front'] && status !== GenerationStatus.LOADING && (
               <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-300 flex-wrap gap-2">
                 <div className="flex items-center gap-4 w-full sm:w-auto">
                   <h4 className="text-sm font-semibold text-slate-700 hidden sm:block">View Angles:</h4>
                   <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
                      {(['Front', 'Left', 'Right', 'Back'] as ViewAngle[]).map((angle) => {
                        // Skip Physics or 3D if they are still in ViewAngle type
                        if (angle === 'Physics' || angle === '3D') return null;

                        const isGenerated = !!views[angle];
                        const isActive = activeView === angle;
                        const isLoading = loadingViews[angle];

                        let Icon = User;
                        if (angle === 'Left') Icon = ChevronLeft;
                        if (angle === 'Right') Icon = ChevronRight;
                        if (angle === 'Back') Icon = RefreshCw; 

                        return (
                          <button
                            key={angle}
                            onClick={() => handleViewChange(angle)}
                            disabled={isLoading}
                            className={`
                              flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap
                              ${isActive 
                                ? 'bg-brand-600 text-white shadow-md ring-2 ring-brand-200' 
                                : isGenerated 
                                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
                                  : 'bg-white border border-slate-200 text-slate-400 hover:border-brand-300 hover:text-brand-600 border-dashed'}
                            `}
                          >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                            <span>{angle}</span>
                            {!isGenerated && !isLoading && <Sparkles className="w-3 h-3 ml-1 opacity-50" />}
                          </button>
                        );
                      })}
                   </div>
                 </div>
               </section>
             )}
          </div>
        </div>
      </main>

      <FeedbackModal 
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
      />
    </div>
  );
};

export default App;