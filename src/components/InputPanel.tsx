import React, { useRef, useState } from 'react';
import { 
  TireAnalysisInput, 
  TireAnalysisResult, 
  AnalysisFeedback, 
  TireCategory 
} from '../types/tire';
import { ClassFeedbackWidget } from './ClassFeedbackWidget';
import { 
  Upload, 
  Camera, 
  Weight, 
  Settings2, 
  RotateCcw,
  Sparkles,
  Info,
  AlertCircle,
  Image as ImageIcon,
  CheckCircle2,
  Layers,
  FileImage,
  Play,
  Eye
} from 'lucide-react';

interface BatchItem {
  id: string;
  name: string;
  sizeKb: string;
  mimeType: string;
  dataUrl: string;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  result?: TireAnalysisResult;
  error?: string;
}

interface InputPanelProps {
  onAnalyze: (input: TireAnalysisInput, fileName?: string) => Promise<TireAnalysisResult | null>;
  isLoading: boolean;
  onClearAnalysis?: () => void;
  feedbacks: Record<string, AnalysisFeedback>;
  onSaveFeedback: (
    analysisId: string,
    isCorrect: boolean,
    trueCategory?: TireCategory,
    trueTreadDepthMm?: number | null
  ) => void;
  onSelectResult?: (result: TireAnalysisResult, dataUrl: string) => void;
}

export const InputPanel: React.FC<InputPanelProps> = ({
  onAnalyze,
  isLoading,
  onClearAnalysis,
  feedbacks,
  onSaveFeedback,
  onSelectResult,
}) => {
  const [mode, setMode] = useState<'single' | 'batch'>('single');

  // Single mode state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/jpeg');
  const [imageFileName, setImageFileName] = useState<string>('');
  const [imageFileSize, setImageFileSize] = useState<string>('');

  // Batch mode state
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [isBatchRunning, setIsBatchRunning] = useState<boolean>(false);

  // Facility & Optimization parameters
  const [batchWeightKg, setBatchWeightKg] = useState<number>(3500);
  const [reactorId, setReactorId] = useState<string>('REAKTOR-01 [Sürekli Döner Fırın - Rotary Kiln]');
  const [optimizationPriority, setOptimizationPriority] = useState<'rcb_purity' | 'balanced' | 'fast_cycle'>('rcb_purity');
  const [moistureLevel, setMoistureLevel] = useState<'dry' | 'moderate' | 'wet'>('dry');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Helper to resize image on client to max 1280 px
  const resizeImageToMax1280 = (file: File): Promise<{ dataUrl: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          const maxDim = 1280;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve({ dataUrl: e.target?.result as string, mimeType: file.type });
          }
          ctx.drawImage(img, 0, 0, width, height);
          const outputMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const dataUrl = canvas.toDataURL(outputMime, 0.90);
          resolve({ dataUrl, mimeType: outputMime });
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // Process single uploaded image
  const handleSingleFileProcess = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 8 * 1024 * 1024) {
      alert('Yüklenen görsel boyutu 8 MB sınırını aşıyor. Lütfen daha küçük boyutlu bir görsel seçin.');
      return;
    }

    try {
      const resized = await resizeImageToMax1280(file);
      const sizeInKb = (file.size / 1024).toFixed(1);
      setImageFileName(file.name);
      setImageFileSize(`${sizeInKb} KB`);
      setImageMime(resized.mimeType);
      setUploadedImage(resized.dataUrl);

      // Trigger analysis immediately
      await onAnalyze(
        {
          imageBase64: resized.dataUrl,
          mimeType: resized.mimeType,
          batchWeightKg,
          reactorId,
          optimizationPriority,
          moistureLevel,
          notes: `Dosya: ${file.name} (${sizeInKb} KB)`,
        },
        file.name
      );
    } catch (err) {
      console.warn('Image processing warning:', err);
    }
  };

  // Process batch of uploaded images
  const handleBatchFilesProcess = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;

    const newItems: BatchItem[] = [];

    for (const file of files) {
      if (file.size > 8 * 1024 * 1024) {
        continue; // skip files > 8MB
      }
      try {
        const resized = await resizeImageToMax1280(file);
        newItems.push({
          id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          sizeKb: `${(file.size / 1024).toFixed(1)} KB`,
          mimeType: resized.mimeType,
          dataUrl: resized.dataUrl,
          status: 'pending',
        });
      } catch (e) {
        console.error('Batch item resize error:', e);
      }
    }

    setBatchItems((prev) => [...prev, ...newItems]);
  };

  const handleRunBatchAnalysis = async () => {
    if (batchItems.length === 0 || isBatchRunning) return;
    setIsBatchRunning(true);

    for (let i = 0; i < batchItems.length; i++) {
      const item = batchItems[i];
      if (item.status === 'completed') continue;

      setBatchItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: 'analyzing' } : it))
      );

      try {
        const result = await onAnalyze(
          {
            imageBase64: item.dataUrl,
            mimeType: item.mimeType,
            batchWeightKg,
            reactorId,
            optimizationPriority,
            moistureLevel,
            notes: `Parti Numunesi: ${item.name}`,
          },
          item.name
        );

        if (result) {
          setBatchItems((prev) =>
            prev.map((it) =>
              it.id === item.id ? { ...it, status: 'completed', result } : it
            )
          );
        } else {
          setBatchItems((prev) =>
            prev.map((it) =>
              it.id === item.id ? { ...it, status: 'error', error: 'Analiz başarısız oldu' } : it
            )
          );
        }
      } catch (err: any) {
        setBatchItems((prev) =>
          prev.map((it) =>
            it.id === item.id ? { ...it, status: 'error', error: err.message || 'Hata' } : it
          )
        );
      }
    }

    setIsBatchRunning(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;

    if (mode === 'batch' || e.dataTransfer.files.length > 1) {
      setMode('batch');
      handleBatchFilesProcess(e.dataTransfer.files);
    } else {
      handleSingleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleResetSingleImage = () => {
    setUploadedImage(null);
    setImageFileName('');
    setImageFileSize('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (onClearAnalysis) onClearAnalysis();
  };

  const handleClearBatch = () => {
    setBatchItems([]);
    if (batchFileInputRef.current) batchFileInputRef.current.value = '';
  };

  const handleManualReAnalyzeSingle = () => {
    if (!uploadedImage) return;
    onAnalyze(
      {
        imageBase64: uploadedImage,
        mimeType: imageMime,
        batchWeightKg,
        reactorId,
        optimizationPriority,
        moistureLevel,
        notes: notes || (imageFileName ? `Dosya: ${imageFileName}` : undefined),
      },
      imageFileName
    );
  };

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 sm:p-5 flex flex-col gap-5 shadow-xl">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Camera className="w-4 h-4" />
          </div>
          <h2 className="font-semibold text-white tracking-wide text-sm sm:text-base">
            Numune Kabul &amp; Görsel Girdisi
          </h2>
        </div>

        {/* Mode Selector Tab (Single vs Batch) */}
        <div className="flex items-center bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`px-2.5 py-1 rounded font-medium transition ${
              mode === 'single'
                ? 'bg-emerald-600 text-zinc-950 font-bold shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Tekli Numune
          </button>
          <button
            type="button"
            onClick={() => setMode('batch')}
            className={`px-2.5 py-1 rounded font-medium transition flex items-center gap-1 ${
              mode === 'batch'
                ? 'bg-emerald-600 text-zinc-950 font-bold shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Toplu Parti (Batch)</span>
            {batchItems.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-black/60 text-emerald-300">
                {batchItems.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 1. Görsel Yükleme Modülü */}
      {mode === 'single' ? (
        /* SINGLE MODE */
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <span>ÖTL Hurda Lastik Fotoğrafı</span>
              <span className="text-cyan-400 text-[10px] bg-cyan-950/60 border border-cyan-800/40 px-1.5 py-0.5 rounded">
                Gemini Vision
              </span>
            </label>
            {uploadedImage && (
              <button
                onClick={handleResetSingleImage}
                className="text-[11px] text-zinc-400 hover:text-rose-400 flex items-center gap-1 transition"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Görseli Sıfırla</span>
              </button>
            )}
          </div>

          {/* Drag & Drop Box */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`relative rounded-lg border-2 border-dashed transition overflow-hidden min-h-[220px] flex flex-col items-center justify-center p-3 text-center ${
              isDragging
                ? 'border-emerald-400 bg-emerald-950/30 ring-2 ring-emerald-500'
                : uploadedImage
                ? 'border-emerald-500/70 bg-black'
                : 'border-zinc-700 hover:border-zinc-500 bg-zinc-950/70'
            }`}
          >
            {uploadedImage ? (
              <div className="relative w-full h-56 flex flex-col items-center justify-center">
                <img
                  src={uploadedImage}
                  alt="Yüklenen ÖTL Hurda Lastik"
                  className="max-h-full max-w-full object-contain rounded"
                />
                <div className="absolute inset-0 pointer-events-none border border-emerald-500/30 flex items-center justify-center">
                  <div className="w-32 h-32 border border-dashed border-emerald-400/70 rounded-full animate-pulse" />
                  <div className="absolute top-2 left-2 text-[10px] font-mono text-emerald-300 bg-black/85 px-2 py-0.5 rounded border border-emerald-500/50 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>CANLI NUMUNE YÜKLENDİ</span>
                  </div>
                  {imageFileName && (
                    <div className="absolute bottom-2 left-2 right-2 text-[10px] font-mono text-zinc-300 bg-black/80 px-2 py-1 rounded border border-zinc-700 flex items-center justify-between truncate">
                      <span className="truncate">{imageFileName}</span>
                      <span className="text-emerald-400 font-semibold ml-2">{imageFileSize}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 p-5">
                <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-700/80 flex items-center justify-center text-zinc-400 shadow-inner">
                  <ImageIcon className="w-7 h-7 text-emerald-400" />
                </div>

                <div>
                  <div className="text-sm text-zinc-200 font-semibold">
                    Lastik fotoğrafını buraya sürükleyin veya dosya seçin
                  </div>
                  <div className="text-xs text-zinc-400 mt-1 max-w-xs">
                    Görsel yüklendiğinde Gemini Vision ile sırt ve aşınma görselden okunur; polimer bileşimi sınıf bazlı tahmindir.
                  </div>
                </div>

                <div className="flex items-center gap-2.5 mt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs rounded-lg border border-zinc-600 transition flex items-center gap-2 font-medium shadow"
                  >
                    <Upload className="w-4 h-4 text-emerald-400" />
                    <span>Dosya Seç</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs rounded-lg border border-zinc-600 transition flex items-center gap-2 font-medium shadow"
                  >
                    <Camera className="w-4 h-4 text-emerald-400" />
                    <span>Kamera Çekimi</span>
                  </button>
                </div>

                <div className="text-[10px] text-zinc-500 font-mono">
                  Desteklenen formatlar: JPEG, PNG, WebP (Maks. 8 MB, 1280px otomatik boyutlandırma)
                </div>
              </div>
            )}

            {/* Hidden inputs */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleSingleFileProcess(e.target.files[0])}
              accept="image/*"
              className="hidden"
            />
            <input
              type="file"
              ref={cameraInputRef}
              onChange={(e) => e.target.files?.[0] && handleSingleFileProcess(e.target.files[0])}
              accept="image/*"
              capture="environment"
              className="hidden"
            />
          </div>
        </div>
      ) : (
        /* BATCH MODE (ÇOKLU NUMUNE & HER THUMBNAIL İÇİN GERİ BİLDİRİM) */
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <span>Toplu Lastik Partisi ({batchItems.length} Numune)</span>
            </label>
            <div className="flex items-center gap-2">
              {batchItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearBatch}
                  className="text-[11px] text-zinc-400 hover:text-rose-400 transition"
                >
                  Listeyi Temizle
                </button>
              )}
            </div>
          </div>

          {/* Batch Drop Area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => batchFileInputRef.current?.click()}
            className="rounded-lg border-2 border-dashed border-zinc-700 hover:border-emerald-500 p-4 text-center cursor-pointer bg-zinc-950/60 transition flex flex-col items-center justify-center gap-2"
          >
            <FileImage className="w-6 h-6 text-emerald-400" />
            <div className="text-xs text-zinc-200 font-medium">
              Çoklu fotoğrafları buraya sürükleyin veya <span className="text-emerald-400 underline">toplu dosya seçin</span>
            </div>
            <div className="text-[10px] text-zinc-500 font-mono">
              Birden fazla ÖTL numunesini aynı anda yükleyip sırayla analiz edebilirsiniz
            </div>
            <input
              type="file"
              ref={batchFileInputRef}
              onChange={(e) => e.target.files && handleBatchFilesProcess(e.target.files)}
              accept="image/*"
              multiple
              className="hidden"
            />
          </div>

          {/* Batch Action Buttons */}
          {batchItems.length > 0 && (
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-xs font-mono text-zinc-400">
                Tamamlanan: {batchItems.filter((b) => b.status === 'completed').length} / {batchItems.length}
              </span>
              <button
                type="button"
                onClick={handleRunBatchAnalysis}
                disabled={isBatchRunning || batchItems.every((b) => b.status === 'completed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition ${
                  isBatchRunning || batchItems.every((b) => b.status === 'completed')
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-zinc-950 shadow-emerald-950/60'
                }`}
              >
                {isBatchRunning ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                    <span>Parti Analiz Ediliyor...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Tüm Partiyi Sırayla Analiz Et</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Batch Thumbnails Grid with Feedback under each */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
            {batchItems.map((item, index) => (
              <div
                key={item.id}
                className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 flex flex-col gap-2 shadow-sm"
              >
                {/* Thumbnail Header */}
                <div className="flex items-start gap-2.5">
                  <div className="w-16 h-16 rounded bg-black border border-zinc-800 flex-shrink-0 overflow-hidden relative">
                    <img
                      src={item.dataUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-0 left-0 right-0 bg-black/75 text-[9px] text-center font-mono text-zinc-400 truncate px-0.5">
                      #{index + 1}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white truncate" title={item.name}>
                      {item.name}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">{item.sizeKb}</div>

                    <div className="mt-1">
                      {item.status === 'completed' && item.result ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800/60">
                            {item.result.tireClassification.categoryNameTr}
                          </span>
                          <span className="text-[10px] text-amber-400 font-mono">
                            %{item.result.tireClassification.estimatedWearRate} Aşınma
                          </span>
                        </div>
                      ) : item.status === 'analyzing' ? (
                        <span className="text-[10px] text-cyan-400 font-mono flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                          Taranıyor...
                        </span>
                      ) : item.status === 'error' ? (
                        <span className="text-[10px] text-rose-400 font-mono">
                          {item.error || 'Hata'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-500 font-mono">Beklemede</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* View Details Button if completed */}
                {item.result && onSelectResult && (
                  <button
                    type="button"
                    onClick={() => onSelectResult(item.result!, item.dataUrl)}
                    className="text-[11px] bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-2 py-1 rounded border border-zinc-700/80 flex items-center justify-center gap-1 transition"
                  >
                    <Eye className="w-3 h-3 text-emerald-400" />
                    <span>Raporu Ana Ekrana Getir</span>
                  </button>
                )}

                {/* Requirement 1: Under each thumbnail in batch mode add ClassFeedbackWidget */}
                {item.result && (
                  <div className="pt-1.5 border-t border-zinc-800/80">
                    <ClassFeedbackWidget
                      analysisId={item.result.analysisId}
                      predictedCategory={item.result.tireClassification.category}
                      feedback={feedbacks[item.result.analysisId]}
                      onSaveFeedback={onSaveFeedback}
                      compact
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Fırın & Parti Parametreleri */}
      <div className="flex flex-col gap-3 pt-2 border-t border-zinc-800/80">
        <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
          <Settings2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Fırın &amp; Parti Parametreleri</span>
        </label>

        {/* Parti Ağırlığı Input */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 flex items-center gap-1">
              <Weight className="w-3.5 h-3.5 text-zinc-400" />
              <span>Parti / Şarj Ağırlığı:</span>
            </span>
            <span className="font-mono text-emerald-400 font-semibold">{batchWeightKg.toLocaleString('tr-TR')} kg</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min={100}
              max={30000}
              step={100}
              value={batchWeightKg}
              onChange={(e) => setBatchWeightKg(Math.max(100, Number(e.target.value)))}
              className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
            />
            <span className="text-xs text-zinc-500 font-mono">KG</span>
          </div>

          {/* Quick preset weight buttons */}
          <div className="flex items-center gap-1.5 text-[10px] font-mono">
            {[1000, 2000, 3500, 6000].map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setBatchWeightKg(w)}
                className={`px-2 py-0.5 rounded border transition ${
                  batchWeightKg === w
                    ? 'border-emerald-500 bg-emerald-950/60 text-emerald-400 font-bold'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                {w >= 1000 ? `${w / 1000}t` : `${w}kg`}
              </button>
            ))}
          </div>
        </div>

        {/* Fırın Seçimi */}
        <div className="flex flex-col gap-1 text-xs">
          <label className="text-zinc-400">Tesis Fırın / Reaktör Seçimi:</label>
          <select
            value={reactorId}
            onChange={(e) => setReactorId(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-2 text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none"
          >
            <option value="REAKTOR-01 [Sürekli Döner Fırın - Rotary Kiln]">
              Reaktör-01 [Sürekli Döner Fırın - Rotary Kiln, 12t/gün] (Simülasyon)
            </option>
            <option value="REAKTOR-02 [Sabit Yataklı Kesikli - Batch Pyrolysis]">
              Reaktör-02 [Sabit Yataklı Kesikli - Batch Pyrolysis, 5t/şarj] (Simülasyon)
            </option>
            <option value="REAKTOR-03 [Vakumlu Termal Desorpsiyon Reaktörü]">
              Reaktör-03 [Vakumlu Termal Desorpsiyon - Yüksek Saflık rCB] (Simülasyon)
            </option>
          </select>
        </div>

        {/* Optimizasyon Önceliği */}
        <div className="flex flex-col gap-1.5 text-xs">
          <label className="text-zinc-400">Fırın Termal Optimizasyon Hedefi:</label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'rcb_purity', label: 'Max. rCB Saflığı', sub: 'Yüksek BET Alanı' },
              { id: 'balanced', label: 'Dengeli Verim', sub: 'rCB + TPO Yağı' },
              { id: 'fast_cycle', label: 'Hızlı Çevrim', sub: 'Yüksek Tonaj' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setOptimizationPriority(opt.id as any)}
                className={`p-2 rounded border text-left transition ${
                  optimizationPriority === opt.id
                    ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 font-semibold ring-1 ring-emerald-500'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="font-semibold text-[11px]">{opt.label}</div>
                <div className="text-[10px] text-zinc-500">{opt.sub}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Single mode action button */}
      {mode === 'single' && (
        <div className="pt-2">
          <button
            type="button"
            disabled={isLoading || !uploadedImage}
            onClick={handleManualReAnalyzeSingle}
            className={`w-full py-3 px-4 rounded-lg font-semibold tracking-wide text-sm flex items-center justify-center gap-2.5 shadow-lg transition ${
              isLoading
                ? 'bg-zinc-800 text-zinc-400 cursor-not-allowed border border-zinc-700'
                : !uploadedImage
                ? 'bg-zinc-800/80 text-zinc-500 border border-zinc-700/60 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold border border-emerald-400 shadow-emerald-950/60 active:scale-[0.99]'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                <span>Görsel Gemini Vision ile İnceleniyor...</span>
              </>
            ) : !uploadedImage ? (
              <>
                <AlertCircle className="w-4 h-4 text-zinc-500" />
                <span>Analiz İçin Lastik Görseli Yükleyin</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-zinc-950" />
                <span>Gemini Vision ile Analiz Et ve Reçete Üret</span>
              </>
            )}
          </button>

          <p className="text-[11px] text-zinc-400 text-center mt-2 flex items-center justify-center gap-1 font-mono">
            <Info className="w-3 h-3 text-emerald-500" />
            <span>Sırt ve aşınma görselden okunur; polimer bileşimi sınıf bazlı tahmindir</span>
          </p>
        </div>
      )}
    </div>
  );
};
