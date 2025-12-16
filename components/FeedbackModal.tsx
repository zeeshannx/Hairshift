import React, { useState } from 'react';
import { X, Star, MessageSquare, Bug, Lightbulb, ThumbsUp, Loader2 } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FeedbackType = 'general' | 'bug' | 'feature';

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const [rating, setRating] = useState<number>(0);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('general');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate network request
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log('Feedback submitted:', { rating, feedbackType, comment });
    setIsSubmitting(false);
    setSubmitted(true);
    
    // Reset and close after a delay
    setTimeout(() => {
        setSubmitted(false);
        setRating(0);
        setComment('');
        setFeedbackType('general');
        onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-brand-500" />
            Send Feedback
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
            <div className="p-12 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 animate-in zoom-in duration-300">
                    <ThumbsUp className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-bold text-slate-800 mb-2">Thank You!</h4>
                <p className="text-slate-500">Your feedback helps us improve HairShift AI.</p>
            </div>
        ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
            
            {/* Rating */}
            <div className="space-y-3 text-center">
                <label className="text-sm font-medium text-slate-700 block">How was your experience?</label>
                <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110 focus:outline-none group"
                    >
                    <Star 
                        className={`w-8 h-8 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 group-hover:text-amber-200'}`} 
                    />
                    </button>
                ))}
                </div>
            </div>

            {/* Type */}
            <div className="space-y-3">
                <label className="text-sm font-medium text-slate-700 block">Feedback Type</label>
                <div className="grid grid-cols-3 gap-3">
                    <button
                        type="button"
                        onClick={() => setFeedbackType('general')}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-xs font-medium transition-all ${feedbackType === 'general' ? 'bg-brand-50 border-brand-200 text-brand-700 shadow-sm' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                    >
                        <MessageSquare className="w-5 h-5" />
                        General
                    </button>
                    <button
                        type="button"
                        onClick={() => setFeedbackType('bug')}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-xs font-medium transition-all ${feedbackType === 'bug' ? 'bg-brand-50 border-brand-200 text-brand-700 shadow-sm' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                    >
                        <Bug className="w-5 h-5" />
                        Bug
                    </button>
                    <button
                        type="button"
                        onClick={() => setFeedbackType('feature')}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-xs font-medium transition-all ${feedbackType === 'feature' ? 'bg-brand-50 border-brand-200 text-brand-700 shadow-sm' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                    >
                        <Lightbulb className="w-5 h-5" />
                        Feature
                    </button>
                </div>
            </div>

            {/* Comment */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 block">Comments</label>
                <textarea
                    required
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Tell us what you think..."
                    className="w-full h-32 p-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none resize-none text-slate-700 placeholder:text-slate-400 bg-slate-50 focus:bg-white transition-colors"
                />
            </div>

            {/* Submit */}
            <button
                type="submit"
                disabled={isSubmitting || !comment || rating === 0}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-semibold shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2"
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Sending...
                    </>
                ) : (
                    'Submit Feedback'
                )}
            </button>
            </form>
        )}
      </div>
    </div>
  );
};

export default FeedbackModal;