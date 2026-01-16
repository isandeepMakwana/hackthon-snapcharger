import { useEffect, useRef, useState } from 'react';
import { Camera, Check, Sparkles, X } from 'lucide-react';
import { analyzeChargerImage } from '@/services/geminiService';
import { analyzeHostPhoto } from '@/services/hostService';
import type { GeminiAnalysisResult, Station } from '@/types';

interface AddStationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStation: (stationData: Partial<Station>) => void;
  initialData?: Station;
}

type Step = 'upload' | 'analyzing' | 'review';

const AddStationModal = ({
  isOpen,
  onClose,
  onAddStation,
  initialData,
}: AddStationModalProps) => {
  const [step, setStep] = useState<Step>('upload');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<GeminiAnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    connectorType: '',
    powerOutput: '',
    pricePerHour: '150',
  });

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setFormData({
        title: initialData.title,
        description: initialData.description,
        connectorType: initialData.connectorType,
        powerOutput: initialData.powerOutput,
        pricePerHour: String(initialData.pricePerHour),
      });
      setSelectedImage(initialData.image);
      setStep('review');
      setAnalysisData(null);
    } else {
      setFormData({
        title: '',
        description: '',
        connectorType: '',
        powerOutput: '',
        pricePerHour: '150',
      });
      setSelectedImage(null);
      setAnalysisData(null);
      setStep('upload');
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const mapBackendResultToGemini = (backendResult: any): GeminiAnalysisResult => {
    const connectorMap: Record<string, string> = {
      SOCKET_16A_3PIN: '16A 3-pin',
      TYPE_2_AC: 'Type 2 (AC)',
      CCS_2_DC: 'CCS2 (DC)',
      UNKNOWN: 'Unknown',
    };

    const socketType = backendResult.socket_type as string | undefined;
    const connectorType = socketType ? connectorMap[socketType] || socketType : 'Unknown';

    const powerKw = typeof backendResult.power_kw === 'number' ? backendResult.power_kw : 0;
    const powerOutput = powerKw > 0 ? `${powerKw}kW` : '';

    const description =
      typeof backendResult.marketing_description === 'string'
        ? backendResult.marketing_description
        : 'AI analysis completed for this charger.';

    return {
      connectorType,
      powerOutput,
      suggestedTitle: connectorType ? `${connectorType} charger` : 'EV charger',
      suggestedDescription: description,
      confidence: 0.9,
    };
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => setSelectedImage(ev.target?.result as string);
    reader.readAsDataURL(file);

    setStep('analyzing');
    let result: GeminiAnalysisResult | null = null;

    try {
      const backendJson = await analyzeHostPhoto(file);
      if (backendJson && backendJson.ai_data) {
        result = mapBackendResultToGemini(backendJson.ai_data);
      } else {
        result = mapBackendResultToGemini(backendJson);
      }
    } catch (error) {
      console.error('Backend AI analysis failed, falling back to direct Gemini:', error);
    }

    if (!result) {
      result = await analyzeChargerImage(file);
    }

    setAnalysisData(result);
    setFormData((prev) => ({
      ...prev,
      connectorType: result.connectorType,
      powerOutput: result.powerOutput,
      title: result.suggestedTitle,
      description: result.suggestedDescription,
    }));
    setStep('review');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onAddStation({
      id: initialData?.id,
      title: formData.title,
      description: formData.description,
      connectorType: formData.connectorType,
      powerOutput: formData.powerOutput,
      pricePerHour: Number(formData.pricePerHour),
      image: selectedImage || '',
    });
    onClose();
  };

  const getConfidenceLevel = (score: number) => {
    if (score >= 0.8) return { label: 'High Confidence', color: 'bg-accent', text: 'text-accent' };
    if (score >= 0.5) return { label: 'Medium Confidence', color: 'bg-warning', text: 'text-warning' };
    return { label: 'Low Confidence', color: 'bg-danger', text: 'text-danger' };
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-surface-strong shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-semibold text-ink">
            {step === 'upload'
              ? 'Add New Station'
              : step === 'analyzing'
                ? 'AI Analysis'
                : initialData
                  ? 'Edit Station'
                  : 'Review Details'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted transition hover:bg-surface"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-6">
          {step === 'upload' && (
            <div className="flex flex-col items-center justify-center space-y-6 py-8">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group flex h-48 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-accent/40 bg-accent/5 transition hover:bg-accent/10"
              >
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-surface-strong shadow-soft transition group-hover:scale-105">
                  <Camera size={28} className="text-accent" />
                </div>
                <p className="text-sm font-semibold text-ink">Upload a charger photo</p>
                <p className="text-xs text-muted">AI will detect specs automatically</p>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
              <div className="flex items-center gap-2 text-xs text-muted">
                <Sparkles size={14} /> Powered by Gemini Vision
              </div>
            </div>
          )}

          {step === 'analyzing' && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="relative mb-4">
                <div className="h-20 w-20 animate-spin rounded-full border-4 border-accent/10 border-t-accent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles size={24} className="text-accent" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-ink">Analyzing Charger...</h3>
              <p className="text-sm text-muted">Identifying connector type & power output</p>
              {selectedImage && (
                <img
                  src={selectedImage}
                  alt="Preview"
                  className="mt-4 h-24 w-24 rounded-lg object-cover opacity-60"
                />
              )}
            </div>
          )}

          {step === 'review' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {analysisData && (
                <div className="rounded-xl border border-accent/20 bg-accent/10 p-3">
                  <div className="mb-2 flex items-start gap-3">
                    <div className="rounded-full bg-surface p-1.5 text-accent">
                      <Sparkles size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">Specs auto-detected</p>
                      <p className="text-xs text-muted">Gemini identified {analysisData.connectorType}</p>
                    </div>
                  </div>
                  <div className="ml-9">
                    <div className="mb-1 flex items-center justify-between text-[10px]">
                      <span className={`font-semibold uppercase ${getConfidenceLevel(analysisData.confidence).text}`}>
                        {getConfidenceLevel(analysisData.confidence).label}
                      </span>
                      <span className="text-muted">{Math.round(analysisData.confidence * 100)}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-border">
                      <div
                        className={`h-full rounded-full ${getConfidenceLevel(analysisData.confidence).color}`}
                        style={{ width: `${analysisData.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase text-muted" htmlFor="connectorType">
                    Connector
                  </label>
                  <input
                    id="connectorType"
                    value={formData.connectorType}
                    onChange={(event) => setFormData({ ...formData, connectorType: event.target.value })}
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-muted" htmlFor="powerOutput">
                    Output
                  </label>
                  <input
                    id="powerOutput"
                    value={formData.powerOutput}
                    onChange={(event) => setFormData({ ...formData, powerOutput: event.target.value })}
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-muted" htmlFor="listingTitle">
                  Listing Title
                </label>
                <input
                  id="listingTitle"
                  value={formData.title}
                  onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-muted" htmlFor="description">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                  rows={3}
                  className="mt-1 w-full resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-muted" htmlFor="pricePerHour">
                  Price per hour (₹)
                </label>
                <input
                  id="pricePerHour"
                  type="number"
                  min="0"
                  value={formData.pricePerHour}
                  onChange={(event) => setFormData({ ...formData, pricePerHour: event.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold"
                />
              </div>

              {selectedImage && (
                <div className="text-xs text-muted">
                  {initialData ? 'Using current image' : 'Based on uploaded image'}
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-border pt-4">
                {!initialData && (
                  <button
                    type="button"
                    onClick={() => setStep('upload')}
                    className="px-4 py-2 text-sm font-semibold text-muted"
                  >
                    Retake
                  </button>
                )}
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-accent-strong"
                >
                  <Check size={18} /> {initialData ? 'Save Changes' : 'Publish Listing'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddStationModal;
