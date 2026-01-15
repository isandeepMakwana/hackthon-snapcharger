import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Check, Loader2, Sparkles, Image as ImageIcon } from 'lucide-react';
import { analyzeChargerImage } from '../services/geminiService';
import { GeminiAnalysisResult, Station } from '../types';

interface AddStationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStation: (stationData: Partial<Station>) => void;
  initialData?: Station; // New prop for editing
}

type Step = 'upload' | 'analyzing' | 'review';

const AddStationModal: React.FC<AddStationModalProps> = ({ isOpen, onClose, onAddStation, initialData }) => {
  const [step, setStep] = useState<Step>('upload');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<GeminiAnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    connectorType: '',
    powerOutput: '',
    pricePerHour: '150'
  });

  // Handle Edit Mode or Reset
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          title: initialData.title,
          description: initialData.description,
          connectorType: initialData.connectorType,
          powerOutput: initialData.powerOutput,
          pricePerHour: String(initialData.pricePerHour)
        });
        setSelectedImage(initialData.image);
        setStep('review'); // Skip upload/analysis for edit
        setAnalysisData(null); // Clear analysis data since we are editing manually
      } else {
        // Reset for new entry
        setFormData({
            title: '',
            description: '',
            connectorType: '',
            powerOutput: '',
            pricePerHour: '150'
        });
        setSelectedImage(null);
        setAnalysisData(null);
        setStep('upload');
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 1. Show preview
      const reader = new FileReader();
      reader.onload = (ev) => setSelectedImage(ev.target?.result as string);
      reader.readAsDataURL(file);

      // 2. Move to analyzing step
      setStep('analyzing');

      // 3. Call AI Service
      const result = await analyzeChargerImage(file);
      
      // 4. Populate Form
      setAnalysisData(result);
      setFormData(prev => ({
        ...prev,
        connectorType: result.connectorType,
        powerOutput: result.powerOutput,
        title: result.suggestedTitle,
        description: result.suggestedDescription
      }));
      setStep('review');
    }
  };

  const handleSubmit = () => {
    onAddStation({
      id: initialData?.id, // Pass ID if editing
      title: formData.title,
      description: formData.description,
      connectorType: formData.connectorType,
      powerOutput: formData.powerOutput,
      pricePerHour: parseInt(formData.pricePerHour),
      image: selectedImage || '',
    });
    // Reset and close
    onClose();
  };

  const getConfidenceLevel = (score: number) => {
    if (score >= 0.8) return { label: 'High Confidence', color: 'bg-emerald-500', text: 'text-emerald-700' };
    if (score >= 0.5) return { label: 'Medium Confidence', color: 'bg-yellow-500', text: 'text-yellow-700' };
    return { label: 'Low Confidence', color: 'bg-red-500', text: 'text-red-700' };
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            {step === 'upload' ? 'Add New Station' : 
             step === 'analyzing' ? 'AI Analysis' : 
             initialData ? 'Edit Station' : 'Review Details'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          
          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="flex flex-col items-center justify-center space-y-6 py-8">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-48 border-2 border-dashed border-emerald-300 rounded-2xl bg-emerald-50/50 flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-50 transition-colors group"
              >
                <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform">
                  <Camera size={32} className="text-emerald-500" />
                </div>
                <p className="font-semibold text-emerald-800">Upload Photo of Charger</p>
                <p className="text-xs text-emerald-600 mt-1">We'll detect specs automatically</p>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange} 
              />
              
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Sparkles size={14} />
                <span>Powered by Google Gemini Vision</span>
              </div>
            </div>
          )}

          {/* STEP 2: ANALYZING */}
          {step === 'analyzing' && (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <div className="relative">
                 <div className="w-20 h-20 rounded-full border-4 border-emerald-100 border-t-emerald-500 animate-spin"></div>
                 <div className="absolute inset-0 flex items-center justify-center">
                   <Sparkles size={24} className="text-emerald-500 animate-pulse" />
                 </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Analyzing Charger...</h3>
                <p className="text-slate-500 text-sm mt-1">Identifying connector type & power output</p>
              </div>
              {selectedImage && (
                 <img src={selectedImage} alt="Preview" className="w-24 h-24 rounded-lg object-cover mt-4 opacity-50 grayscale" />
              )}
            </div>
          )}

          {/* STEP 3: REVIEW / EDIT */}
          {step === 'review' && (
            <div className="space-y-4">
              {/* AI Success Banner (Only show if we actually have analysis data) */}
              {analysisData && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="bg-emerald-100 p-1.5 rounded-full mt-0.5">
                      <Sparkles size={14} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">Specs Auto-Detected!</p>
                      <p className="text-xs text-emerald-600">Gemini identified {analysisData.connectorType}</p>
                    </div>
                  </div>
                  
                  {/* Confidence Bar */}
                  <div className="ml-9">
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-[10px] font-bold uppercase ${getConfidenceLevel(analysisData.confidence).text}`}>
                        {getConfidenceLevel(analysisData.confidence).label}
                      </span>
                      <span className="text-[10px] text-slate-400">{Math.round(analysisData.confidence * 100)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${getConfidenceLevel(analysisData.confidence).color}`} 
                        style={{ width: `${analysisData.confidence * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Connector</label>
                  <input 
                    value={formData.connectorType}
                    onChange={(e) => setFormData({...formData, connectorType: e.target.value})}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Output</label>
                  <input 
                    value={formData.powerOutput}
                    onChange={(e) => setFormData({...formData, powerOutput: e.target.value})}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Listing Title</label>
                <input 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Description</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Price per Hour (₹)</label>
                <input 
                  type="number"
                  value={formData.pricePerHour}
                  onChange={(e) => setFormData({...formData, pricePerHour: e.target.value})}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none" 
                />
              </div>

              {/* Image Preview Thumbnail */}
              {selectedImage && (
                <div className="flex gap-2 items-center text-xs text-slate-400 pt-2">
                   <ImageIcon size={14} />
                   <span className="truncate max-w-[200px]">{initialData ? 'Using current image' : 'Based on uploaded image'}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {step === 'review' && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
             {/* Only show 'Retake' if not editing an existing item (simplification) */}
            {!initialData && (
              <button 
                onClick={() => setStep('upload')}
                className="px-4 py-2 text-slate-600 font-medium hover:text-slate-800 text-sm"
              >
                Retake
              </button>
            )}
            <button 
              onClick={handleSubmit}
              className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center gap-2"
            >
              <Check size={18} />
              {initialData ? 'Save Changes' : 'Publish Listing'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddStationModal;