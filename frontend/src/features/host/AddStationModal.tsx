import { useEffect, useRef, useState } from 'react';
import { Camera, Check, Info, Sparkles, X } from 'lucide-react';
import { analyzeChargerImage } from '@/services/geminiService';
import { analyzeHostPhoto } from '@/services/hostService';
import type { GeminiAnalysisResult, Station } from '@/types';

interface AddStationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStation: (stationData: Partial<Station>) => void;
  initialData?: Station;
  timeSlots: string[];
}

type Step = 'upload' | 'analyzing' | 'review';

const AddStationModal = ({
  isOpen,
  onClose,
  onAddStation,
  initialData,
  timeSlots,
}: AddStationModalProps) => {
  const [step, setStep] = useState<Step>('upload');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [localPreviews, setLocalPreviews] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [analysisData, setAnalysisData] = useState<GeminiAnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [addressStatus, setAddressStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [showEvidence, setShowEvidence] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    address: '',
    description: '',
    connectorType: '',
    powerOutput: '',
    pricePerHour: '150',
    supportedVehicleTypes: ['2W', '4W'] as Array<'2W' | '4W'>,
    blockedTimeSlots: [] as string[],
    availableTimeSlots: [] as string[],
    lat: null as number | null,
    lng: null as number | null,
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
        address: initialData.location,
        description: initialData.description,
        connectorType: initialData.connectorType,
        powerOutput: initialData.powerOutput,
        pricePerHour: String(initialData.pricePerHour),
        supportedVehicleTypes: (initialData.supportedVehicleTypes as Array<'2W' | '4W'>) ?? ['2W', '4W'],
        blockedTimeSlots: initialData.blockedTimeSlots ?? [],
        availableTimeSlots: (initialData.availableTimeSlots && initialData.availableTimeSlots.length > 0)
          ? initialData.availableTimeSlots
          : timeSlots,
        lat: initialData.lat ?? null,
        lng: initialData.lng ?? null,
      });
      setSelectedImages(initialData.image ? [initialData.image] : []);
      setLocalPreviews([]);
      setUploadedImages([]);
      setStep('review');
      setAnalysisData(null);
    } else {
      setFormData({
        title: '',
        address: '',
        description: '',
        connectorType: '',
        powerOutput: '',
        pricePerHour: '150',
        supportedVehicleTypes: ['2W', '4W'],
        blockedTimeSlots: [],
        availableTimeSlots: timeSlots,
        lat: null,
        lng: null,
      });
      setSelectedImages([]);
      setLocalPreviews([]);
      setUploadedImages([]);
      setAnalysisData(null);
      setStep('upload');
    }
    setAddressStatus('idle');
    setShowEvidence(false);
  }, [isOpen, initialData]);

  useEffect(() => {
    if (!isOpen || timeSlots.length === 0) return;
    setFormData((prev) => {
      if (prev.availableTimeSlots.length > 0) return prev;
      return { ...prev, availableTimeSlots: timeSlots };
    });
  }, [isOpen, timeSlots]);

  useEffect(() => {
    if (!isOpen || initialData) return;
    if (!('geolocation' in navigator)) {
      setAddressStatus('error');
      return;
    }

    setAddressStatus('loading');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let address = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );
          if (response.ok) {
            const data = await response.json();
            if (typeof data?.display_name === 'string' && data.display_name.trim().length > 0) {
              address = data.display_name;
            }
          }
        } catch {
          // Ignore reverse geocode failures and keep lat/lng string.
        }
        setFormData((prev) => {
          if (prev.address.trim().length > 0) {
            return { ...prev, lat: latitude, lng: longitude };
          }
          return { ...prev, address, lat: latitude, lng: longitude };
        });
        setAddressStatus('ready');
      },
      () => {
        setAddressStatus('error');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
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
    const normalizedConnector = connectorType.toLowerCase() === 'unknown' ? '' : connectorType;

    const powerKw = typeof backendResult.power_kw === 'number' ? backendResult.power_kw : 0;
    const powerOutput = powerKw > 0 ? `${powerKw}kW` : '';

    const description =
      typeof backendResult.marketing_description === 'string'
        ? backendResult.marketing_description
        : 'AI analysis completed for this charger.';

    const rawCompatibility = Array.isArray(backendResult.vehicle_compatibility)
      ? backendResult.vehicle_compatibility
      : [];
    const hasUnknownCompatibility = rawCompatibility.some(
      (value: string) => typeof value === 'string' && value.trim().toLowerCase() === 'unknown'
    );
    let vehicleCompatibility: string[] | undefined = undefined;
    if (hasUnknownCompatibility) {
      vehicleCompatibility = [];
    } else if (rawCompatibility.length > 0) {
      vehicleCompatibility = rawCompatibility
        .map((value: string) => value.trim().toUpperCase())
        .filter((value: string) => value === '2W' || value === '4W');
    }

    const visualEvidence =
      typeof backendResult.visual_evidence === 'string'
        ? backendResult.visual_evidence.trim()
        : '';

    return {
      connectorType: normalizedConnector,
      powerOutput,
      suggestedTitle: normalizedConnector ? `${normalizedConnector} charger` : 'EV charger',
      suggestedDescription: description,
      confidence: 0.9,
      vehicleCompatibility,
      visualEvidence: visualEvidence || undefined,
    };
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).slice(0, 3);
    if (files.length === 0) return;

    const previews = await Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target?.result as string);
            reader.onerror = () => reject(new Error('Failed to read image'));
            reader.readAsDataURL(file);
          })
      )
    );

    setSelectedImages(previews);
    setLocalPreviews(previews);
    setUploadedImages([]);

    setStep('analyzing');
    let result: GeminiAnalysisResult | null = null;

    try {
      // Send all files to backend for processing
      const backendJson = await analyzeHostPhoto(files);
      if (backendJson && backendJson.ai_data) {
        result = mapBackendResultToGemini(backendJson.ai_data);
        
        // Store the S3 image URLs if available
        if (backendJson.image_urls && Array.isArray(backendJson.image_urls) && backendJson.image_urls.length > 0) {
          setUploadedImages(backendJson.image_urls);
          setSelectedImages(backendJson.image_urls);
        } else {
          setUploadedImages([]);
        }
      } else {
        result = mapBackendResultToGemini(backendJson);
      }
    } catch (error) {
      console.error('❌ Backend AI analysis failed:', error);
      // Fallback to Gemini with first file only
      result = await analyzeChargerImage(files[0]);
    }

    if (!result) {
      result = await analyzeChargerImage(files[0]);
    }

    setAnalysisData(result);
    setFormData((prev) => ({
      ...prev,
      connectorType: result.connectorType,
      powerOutput: result.powerOutput,
      title: result.suggestedTitle,
      description: result.suggestedDescription,
      supportedVehicleTypes:
        result.vehicleCompatibility === undefined
          ? prev.supportedVehicleTypes
          : (result.vehicleCompatibility as Array<'2W' | '4W'>),
    }));
    setStep('review');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isFormValid) return;
    
    // Use the first S3 URL if available, otherwise use the first selected image
    const imageUrl = uploadedImages[0] ?? selectedImages[0] ?? '';
    
    onAddStation({
      id: initialData?.id,
      title: formData.title,
      location: formData.address,
      description: formData.description,
      connectorType: formData.connectorType,
      powerOutput: formData.powerOutput,
      pricePerHour: Number(formData.pricePerHour),
      image: imageUrl,
      supportedVehicleTypes: formData.supportedVehicleTypes,
      blockedTimeSlots: formData.blockedTimeSlots,
      availableTimeSlots: formData.availableTimeSlots,
      lat: formData.lat ?? undefined,
      lng: formData.lng ?? undefined,
    });
    onClose();
  };

  const toggleVehicleType = (value: '2W' | '4W') => {
    setFormData((prev) => {
      const next = prev.supportedVehicleTypes.includes(value)
        ? prev.supportedVehicleTypes.filter((item) => item !== value)
        : [...prev.supportedVehicleTypes, value];
      return { ...prev, supportedVehicleTypes: next.length ? next : prev.supportedVehicleTypes };
    });
  };

  const toggleBlockedSlot = (slot: string) => {
    setFormData((prev) => {
      const next = prev.blockedTimeSlots.includes(slot)
        ? prev.blockedTimeSlots.filter((item) => item !== slot)
        : [...prev.blockedTimeSlots, slot];
      return { ...prev, blockedTimeSlots: next };
    });
  };

  const toggleAvailableSlot = (slot: string) => {
    setFormData((prev) => {
      const next = prev.availableTimeSlots.includes(slot)
        ? prev.availableTimeSlots.filter((item) => item !== slot)
        : [...prev.availableTimeSlots, slot];
      return { ...prev, availableTimeSlots: next };
    });
  };

  const getConfidenceLevel = (score: number) => {
    if (score >= 0.8) return { label: 'High Confidence', color: 'bg-accent', text: 'text-accent' };
    if (score >= 0.5) return { label: 'Medium Confidence', color: 'bg-warning', text: 'text-warning' };
    return { label: 'Low Confidence', color: 'bg-danger', text: 'text-danger' };
  };

  const textFields = {
    connector: formData.connectorType,
    output: formData.powerOutput,
    title: formData.title,
    description: formData.description,
    address: formData.address,
  };
  const unknownField = Object.entries(textFields).find(([, value]) =>
    value.trim().toLowerCase().includes('unknown')
  );
  const missingTextField = Object.entries(textFields).find(([, value]) => value.trim().length === 0);
  const priceValue = Number(formData.pricePerHour);
  const isPriceValid = Number.isFinite(priceValue) && priceValue > 0;
  const hasVehicles = formData.supportedVehicleTypes.length > 0;
  const hasAvailableSlots = formData.availableTimeSlots.length > 0;
  const hasImages = selectedImages.length > 0;
  const isFormValid =
    !unknownField && !missingTextField && isPriceValid && hasVehicles && hasAvailableSlots && hasImages;

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
                multiple
                onChange={handleFileChange}
              />
              <div className="flex items-center gap-2 text-xs text-muted">
                <Sparkles size={14} /> Powered by Gemini Vision
              </div>
              <p className="text-[11px] text-muted">Up to 3 images</p>
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
              {selectedImages[0] && (
                <img
                  src={selectedImages[0]}
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
                    required
                    aria-invalid={Boolean(unknownField?.[0] === 'connector')}
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
                    required
                    aria-invalid={Boolean(unknownField?.[0] === 'output')}
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
                  required
                  aria-invalid={Boolean(unknownField?.[0] === 'title')}
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
                  required
                  aria-invalid={Boolean(unknownField?.[0] === 'description')}
                  className="mt-1 w-full resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-muted" htmlFor="address">
                  Address
                </label>
                <textarea
                  id="address"
                  value={formData.address}
                  onChange={(event) => setFormData({ ...formData, address: event.target.value })}
                  rows={2}
                  required
                  aria-invalid={Boolean(unknownField?.[0] === 'address')}
                  className="mt-1 w-full resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                />
                {addressStatus === 'loading' && (
                  <p className="mt-1 text-xs text-muted">Detecting current location...</p>
                )}
                {addressStatus === 'error' && (
                  <p className="mt-1 text-xs text-muted">Enable location access to auto-fill the address.</p>
                )}
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
                  required
                  aria-invalid={!isPriceValid}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold"
                />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-muted">Supported vehicles</p>
                <div className="mt-2 flex gap-2">
                  {(['2W', '4W'] as const).map((value) => (
                    <button
                      type="button"
                      key={value}
                      onClick={() => toggleVehicleType(value)}
                      className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                        formData.supportedVehicleTypes.includes(value)
                          ? 'border-accent bg-accent-soft text-ink'
                          : 'border-border text-muted hover:text-ink'
                      }`}
                    >
                      {value === '2W' ? '2 Wheeler' : '4 Wheeler'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-muted">Available time slots</p>
                {timeSlots.length === 0 ? (
                  <p className="mt-2 text-xs text-muted">No time slots available.</p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {timeSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => toggleAvailableSlot(slot)}
                        className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                          formData.availableTimeSlots.includes(slot)
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-border text-muted hover:text-ink'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-muted">Blocked time slots</p>
                {timeSlots.length === 0 ? (
                  <p className="mt-2 text-xs text-muted">No time slots available.</p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {timeSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => toggleBlockedSlot(slot)}
                        className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                          formData.blockedTimeSlots.includes(slot)
                            ? 'border-rose-200 bg-rose-50 text-rose-700'
                            : 'border-border text-muted hover:text-ink'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedImages.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span>{initialData ? 'Using current image(s)' : 'Based on uploaded image(s)'}</span>
                  {analysisData?.visualEvidence && (
                    <button
                      type="button"
                      onClick={() => setShowEvidence((prev) => !prev)}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted transition hover:text-ink"
                      aria-label="Show visual evidence"
                    >
                      <Info size={12} />
                    </button>
                  )}
                </div>
              )}

              {analysisData?.visualEvidence && showEvidence && (
                <div className="rounded-xl border border-border bg-surface px-3 py-2 text-xs text-muted">
                  {analysisData.visualEvidence}
                </div>
              )}

              {selectedImages.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase text-muted">Images ({selectedImages.length})</p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {selectedImages.map((image, index) => {
                      const isS3Url = image.includes('s3.') || image.includes('amazonaws.com');
                      const isDataUrl = image.startsWith('data:');
                      
                      return (
                        <div key={`${image}-${index}`} className="relative overflow-hidden rounded-xl border border-border">
                          <img
                            src={image}
                            alt={`Station image ${index + 1}`}
                            className="h-20 w-full object-cover"
                            crossOrigin="anonymous"
                            onError={(e) => {
                              const fallback = localPreviews[index];
                              if (!fallback) return;
                              if (e.currentTarget.dataset.fallbackApplied === 'true') return;
                              e.currentTarget.dataset.fallbackApplied = 'true';
                              e.currentTarget.src = fallback;
                            }}
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5 text-[8px] text-white">
                            {isS3Url ? 'S3' : isDataUrl ? 'Local' : 'Unknown'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-border pt-4">
                {(missingTextField || unknownField || !isPriceValid || !hasVehicles || !hasAvailableSlots || !hasImages) && (
                  <p className="mr-auto text-xs font-semibold text-rose-600">
                    {unknownField
                      ? `Remove "unknown" from ${unknownField[0]}`
                      : !hasImages
                        ? 'Upload at least one image.'
                      : !hasVehicles
                        ? 'Select at least one supported vehicle type.'
                        : !hasAvailableSlots
                          ? 'Select at least one available time slot.'
                          : !isPriceValid
                            ? 'Enter a valid price per hour.'
                            : 'Fill in all required fields.'}
                  </p>
                )}
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
                  disabled={!isFormValid}
                  className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
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
