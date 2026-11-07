/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Header } from './components/Header';
import { InputPanel } from './components/InputPanel';
import { DiagnosticsReport } from './components/DiagnosticsReport';
import { PolymerMatrixChart } from './components/PolymerMatrixChart';
import { ThermalRecipeChart } from './components/ThermalRecipeChart';
import { RcbQualityReport } from './components/RcbQualityReport';
import { ReactorSyncModal } from './components/ReactorSyncModal';
import { PrintReportModal } from './components/PrintReportModal';
import { AccuracyEvaluationPanel } from './components/AccuracyEvaluationPanel';
import { RepeatabilityTestModal } from './components/RepeatabilityTestModal';
import { ClassFeedbackWidget } from './components/ClassFeedbackWidget';
import { 
  TireAnalysisInput, 
  TireAnalysisResult, 
  PlantSummaryStats,
  AnalysisFeedback,
  SessionAnalysisItem,
  TireCategory,
  TIRE_CATEGORY_LABELS
} from './types/tire';
import { 
  Activity, 
  History, 
  CheckCircle, 
  Flame, 
  Info,
  Database,
  BarChart3,
  Layers,
  Cpu,
  UploadCloud,
  Atom,
  Scan,
  TrendingDown,
  CheckCircle2,
  ChevronRight,
  Eye,
  ShieldAlert
} from 'lucide-react';

const FEEDBACK_STORAGE_KEY = 'otl_tire_feedback_records';

const loadFeedbackFromStorage = (): Record<string, AnalysisFeedback> => {
  try {
    const raw = localStorage.getItem(FEEDBACK_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('localStorage read error:', e);
  }
  return {};
};

const saveFeedbackToStorage = (records: Record<string, AnalysisFeedback>) => {
  try {
    localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.warn('localStorage write error:', e);
  }
};

export default function App() {
  // Session analyses archive with full evaluation fields
  const [sessionAnalyses, setSessionAnalyses] = useState<SessionAnalysisItem[]>([]);

  // Feedback state mirrored in localStorage with try/catch
  const [feedbacks, setFeedbacks] = useState<Record<string, AnalysisFeedback>>(() =>
    loadFeedbackFromStorage()
  );

  // Active analysis result & associated image binary for repeatability tests
  const [analysisResult, setAnalysisResult] = useState<TireAnalysisResult | null>(null);
  const [currentImageBase64, setCurrentImageBase64] = useState<string>('');
  const [currentImageMime, setCurrentImageMime] = useState<string>('image/jpeg');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [batchSuccessToast, setBatchSuccessToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'diagnostics' | 'polymer' | 'thermal' | 'rcb'>('all');

  // Modals
  const [isPlcModalOpen, setIsPlcModalOpen] = useState<boolean>(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isRepeatabilityModalOpen, setIsRepeatabilityModalOpen] = useState<boolean>(false);

  // Expanded feedback in archive list
  const [expandedArchiveFeedbackId, setExpandedArchiveFeedbackId] = useState<string | null>(null);

  // Derive all counters from session analyses list (useMemo)
  const stats: PlantSummaryStats = React.useMemo(() => {
    const count = sessionAnalyses.length;
    if (count === 0) {
      return {
        scannedTireCount: 0,
        avgRcbPurityPct: 0,
        preventedCo2Tons: 0,
        activeReactors: 1,
        totalBatchesProcessed: 0,
      };
    }
    const avgPurity = Number(
      (sessionAnalyses.reduce((acc, curr) => acc + curr.purity, 0) / count).toFixed(1)
    );
    const totalCo2 = Number(
      sessionAnalyses.reduce((acc, curr) => acc + curr.co2Estimate, 0).toFixed(2)
    );
    return {
      scannedTireCount: count,
      avgRcbPurityPct: avgPurity,
      preventedCo2Tons: totalCo2,
      activeReactors: 1,
      totalBatchesProcessed: count,
    };
  }, [sessionAnalyses]);

  // Execute tire analysis by sending the image to the backend evaluator
  const executeAnalysis = async (
    input: TireAnalysisInput,
    fileName?: string
  ): Promise<TireAnalysisResult | null> => {
    setIsLoading(true);
    setErrorMessage(null);
    if (input.imageBase64) {
      setCurrentImageBase64(input.imageBase64);
      setCurrentImageMime(input.mimeType || 'image/jpeg');
    }

    try {
      const response = await fetch('/api/analyze-tire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        let errText = `Sunucu yanıt vermedi (${response.status})`;
        try {
          const errJson = await response.json();
          if (errJson?.error) errText = errJson.error;
        } catch {
          // ignore
        }
        setAnalysisResult(null);
        setErrorMessage(errText);
        return null;
      }

      const resData = await response.json();
      if (!resData.success || !resData.data) {
        setAnalysisResult(null);
        setErrorMessage(resData.error || 'Analiz verisi oluşturulamadı.');
        return null;
      }

      const result: TireAnalysisResult = resData.data;
      setAnalysisResult(result);
      setErrorMessage(null);

      const rcbKg = result.massBalance.recoveredCarbonBlackKg;
      const co2Val =
        result.rcbQualityEstimate.co2SavingsTonPerBatch ||
        Number(((rcbKg / 1000) * 2.45).toFixed(2));
      const purityVal = result.rcbQualityEstimate.purityPercentage || 93.0;

      const detectedFileName =
        fileName ||
        (input.notes?.startsWith('Dosya: ')
          ? input.notes.replace('Dosya: ', '').split(' ')[0]
          : `numune_${result.analysisId}.jpg`);

      const sessionItem: SessionAnalysisItem = {
        id: result.analysisId,
        timestamp: result.timestamp || new Date().toISOString(),
        fileName: detectedFileName,
        modelUsed: result.modelUsed || 'gemini-3.5-flash-lite',
        predictedCategory: result.tireClassification.category,
        categoryNameTr: result.tireClassification.categoryNameTr,
        confidence: result.tireClassification.confidence,
        wearRatePct: result.tireClassification.estimatedWearRate,
        remainingTreadDepthMm: result.tireClassification.remainingTreadDepthMm,
        contaminationLevel: result.rcbQualityEstimate.contaminationLevel || 'düşük',
        nrPct: result.polymerMatrix.naturalRubberNR,
        sbrPct: result.polymerMatrix.syntheticRubberSBR_BR,
        silicaPct: result.polymerMatrix.silicaFiller,
        steelPct: result.polymerMatrix.steelWireRatio,
        rcbKg,
        purity: purityVal,
        co2Estimate: co2Val,
        timeStr: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        thumbnailUrl: input.imageBase64,
        fullResult: result,
      };

      setSessionAnalyses((prev) => [sessionItem, ...prev]);
      return result;
    } catch (err: any) {
      console.warn('Analysis error handled:', err);
      setErrorMessage(err?.message || 'Analiz sırasında beklenmeyen bir hata oluştu.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Save or update feedback for an analysis
  const handleSaveFeedback = (
    analysisId: string,
    isCorrect: boolean,
    trueCategory?: TireCategory,
    trueTreadDepthMm?: number | null
  ) => {
    setFeedbacks((prev) => {
      const target = sessionAnalyses.find((s) => s.id === analysisId);
      const existing = prev[analysisId];
      const defaultCat = target?.predictedCategory || analysisResult?.tireClassification.category || 'TRUCK_BUS_TBR';
      const resolvedTrueCat = isCorrect ? defaultCat : (trueCategory || existing?.trueCategory || defaultCat);

      const updated: Record<string, AnalysisFeedback> = {
        ...prev,
        [analysisId]: {
          analysisId,
          isClassCorrect: isCorrect,
          trueCategory: resolvedTrueCat,
          trueTreadDepthMm: trueTreadDepthMm !== undefined ? trueTreadDepthMm : (existing?.trueTreadDepthMm ?? null),
          timestamp: new Date().toISOString(),
        },
      };
      saveFeedbackToStorage(updated);
      return updated;
    });
  };

  // Confirming recipe only shows toast without changing counters
  const handleBatchSubmission = () => {
    setBatchSuccessToast('Reçete operatör onayına sunuldu (simülasyon)');
    setTimeout(() => setBatchSuccessToast(null), 5000);
  };

  const handleClearAnalysis = () => {
    setAnalysisResult(null);
    setCurrentImageBase64('');
    setErrorMessage(null);
  };

  const handleSelectArchiveResult = (item: SessionAnalysisItem) => {
    if (item.fullResult) {
      setAnalysisResult(item.fullResult);
      if (item.thumbnailUrl) {
        setCurrentImageBase64(item.thumbnailUrl);
      }
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* 1. Header with static plant metrics */}
      <Header
        stats={stats}
        currentReactor={analysisResult?.thermalRecipe.reactorId || 'REAKTOR-01 (Rotary Kiln)'}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-5 w-full flex-1 flex flex-col gap-5">
        {/* Prototype Decision Support Visible Note */}
        <div className="bg-amber-950/40 border border-amber-800/50 rounded-xl px-4 py-2.5 text-xs text-amber-300 flex items-center justify-between font-mono shadow-sm">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="font-semibold">Karar Destek Prototipi — reçeteler operatör onayına sunulur</span>
          </div>
          <span className="text-[10px] text-amber-500/90 hidden sm:inline">Operatör Karar Desteği</span>
        </div>

        {/* Success Toast */}
        {batchSuccessToast && (
          <div className="bg-emerald-950/80 border border-emerald-500 text-emerald-300 p-3.5 rounded-xl text-xs flex items-center justify-between shadow-lg shadow-emerald-950/60 font-mono animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{batchSuccessToast}</span>
            </div>
            <button
              onClick={() => setBatchSuccessToast(null)}
              className="text-xs text-emerald-400 hover:text-white underline ml-3"
            >
              Kapat
            </button>
          </div>
        )}

        {/* Error Banner */}
        {errorMessage && (
          <div className="bg-rose-950/40 border border-rose-800 text-rose-300 p-3.5 rounded-xl text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs text-rose-400 underline ml-3"
            >
              Kapat
            </button>
          </div>
        )}

        {/* 2-Column Industrial Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Sol Panel — Operatör Girdi Alanı & Arşiv & Doğruluk Paneli */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <InputPanel
              onAnalyze={executeAnalysis}
              isLoading={isLoading}
              onClearAnalysis={handleClearAnalysis}
              feedbacks={feedbacks}
              onSaveFeedback={handleSaveFeedback}
              onSelectResult={(res, img) => {
                setAnalysisResult(res);
                setCurrentImageBase64(img);
              }}
            />

            {/* Oturum Arşivi */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex flex-col gap-2.5 shadow-lg">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-300 border-b border-zinc-800 pb-2">
                <div className="flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Oturum Arşivi</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {sessionAnalyses.length} Analiz
                </span>
              </div>

              {sessionAnalyses.length === 0 ? (
                <div className="py-6 px-3 text-center rounded-lg bg-zinc-950/40 border border-dashed border-zinc-800/80 text-zinc-500 text-xs font-mono">
                  Bu oturumda henüz kaydedilmiş analiz bulunmuyor.
                </div>
              ) : (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {sessionAnalyses.map((b) => {
                    const fb = feedbacks[b.id];
                    const isExpanded = expandedArchiveFeedbackId === b.id;
                    const isCurrent = analysisResult?.analysisId === b.id;

                    return (
                      <div
                        key={b.id}
                        className={`rounded-lg border transition ${
                          isCurrent
                            ? 'bg-zinc-950 border-emerald-500/70 shadow-sm'
                            : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                        } p-2.5 flex flex-col gap-2`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div
                            onClick={() => handleSelectArchiveResult(b)}
                            className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                          >
                            {b.thumbnailUrl && (
                              <img
                                src={b.thumbnailUrl}
                                alt={b.fileName}
                                className="w-8 h-8 rounded object-cover border border-zinc-700 flex-shrink-0"
                              />
                            )}
                            <div className="truncate">
                              <div className="font-mono text-[11px] text-emerald-400 font-bold flex items-center gap-1.5 truncate">
                                <span>{b.id}</span>
                                <span className="text-[9px] text-zinc-500 font-normal">({b.timeStr})</span>
                              </div>
                              <div className="text-[10px] text-zinc-300 truncate" title={b.fileName}>
                                {b.categoryNameTr} — <span className="text-zinc-500">{b.fileName}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Feedback status badge */}
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedArchiveFeedbackId(isExpanded ? null : b.id)
                              }
                              className={`text-[10px] font-mono px-2 py-0.5 rounded border transition ${
                                fb
                                  ? fb.isClassCorrect
                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800/70'
                                    : 'bg-amber-950 text-amber-300 border-amber-800/70'
                                  : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-white'
                              }`}
                            >
                              {fb
                                ? fb.isClassCorrect
                                  ? '✓ Doğrulandı'
                                  : `✗ ${TIRE_CATEGORY_LABELS[fb.trueCategory] || 'Düzeltildi'}`
                                : 'Etiketle'}
                            </button>
                          </div>
                        </div>

                        {/* Expandable feedback widget */}
                        {isExpanded && (
                          <div className="pt-2 border-t border-zinc-800">
                            <ClassFeedbackWidget
                              analysisId={b.id}
                              predictedCategory={b.predictedCategory}
                              feedback={fb}
                              onSaveFeedback={handleSaveFeedback}
                              compact
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Requirement 3: Doğruluk Paneli (Collapsible, below Oturum Arşivi) */}
            <AccuracyEvaluationPanel
              sessionAnalyses={sessionAnalyses}
              feedbacks={feedbacks}
            />
          </div>

          {/* Sağ Panel — Yapay Zeka Analiz ve Piroliz Çıktı Ekranı */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            {isLoading ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 flex flex-col items-center justify-center text-center gap-4 min-h-[460px]">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin" />
                  <Flame className="w-6 h-6 text-emerald-400 absolute inset-0 m-auto animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Görsel İnceleniyor &amp; Analiz Ediliyor</h3>
                  <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                    Sırt ve aşınma görselden okunur; polimer bileşimi sınıf bazlı tahmindir. Fırın termal reçetesi hesaplanıyor.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400 mt-2">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Sırt Geometrisi
                  </span>
                  <span>→</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Aşınma &amp; Polimer
                  </span>
                  <span>→</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Termal Reçete
                  </span>
                </div>
              </div>
            ) : analysisResult ? (
              <div className="flex flex-col gap-5">
                {/* Custom Uploaded Image Banner */}
                <div className="bg-gradient-to-r from-emerald-950/70 via-zinc-900 to-zinc-900 border border-emerald-600/70 rounded-xl p-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-lg shadow-emerald-950/30">
                  <div className="flex items-center gap-2.5 text-emerald-200">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 flex-shrink-0">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>Yüklenen Görselin Analiz Çıktısı</span>
                        <span className="text-[10px] bg-emerald-900 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-700">
                          Gemini Vision {analysisResult.modelUsed ? `(${analysisResult.modelUsed})` : ''}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-300 mt-0.5">
                        {analysisResult.tireClassification.categoryNameTr} — Aşınma: <strong>%{analysisResult.tireClassification.estimatedWearRate}</strong> | Kalan Diş: <strong>{analysisResult.tireClassification.remainingTreadDepthMm} mm</strong>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => setIsPlcModalOpen(true)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold px-3 py-1.5 rounded-lg border border-emerald-400 text-xs flex items-center gap-1.5 shadow transition"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      <span>Reçeteyi Operatöre Öner</span>
                    </button>
                  </div>
                </div>

                {/* View Mode Tabs */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-1 flex items-center justify-between gap-1 overflow-x-auto text-xs">
                  <div className="flex items-center gap-1">
                    {[
                      { id: 'all', label: 'Tüm Rapor', icon: Layers },
                      { id: 'diagnostics', label: 'Sırt & Aşınma', icon: Activity },
                      { id: 'polymer', label: 'Polimer & Kütle', icon: Database },
                      { id: 'thermal', label: 'Termal Fırın Reçetesi', icon: Flame },
                      { id: 'rcb', label: 'rCB Kalite & ASTM', icon: BarChart3 },
                    ].map((t) => {
                      const Icon = t.icon;
                      const isActive = activeTab === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setActiveTab(t.id as any)}
                          className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition whitespace-nowrap font-medium ${
                            isActive
                              ? 'bg-emerald-600 text-zinc-950 font-bold shadow'
                              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{t.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2 pr-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-[10px] text-zinc-400 font-mono uppercase">
                      Reçete Hazır
                    </span>
                  </div>
                </div>

                {/* 1. Görsel Tanılama Raporu (Includes ClassFeedbackWidget & Repeatability button) */}
                {(activeTab === 'all' || activeTab === 'diagnostics') && (
                  <DiagnosticsReport
                    data={analysisResult}
                    feedback={feedbacks[analysisResult.analysisId]}
                    onSaveFeedback={handleSaveFeedback}
                    onOpenRepeatabilityModal={() => setIsRepeatabilityModalOpen(true)}
                  />
                )}

                {/* 2. Kimyasal Kompozisyon ve Polimer Matrisi */}
                {(activeTab === 'all' || activeTab === 'polymer') && (
                  <PolymerMatrixChart data={analysisResult} />
                )}

                {/* 3. Piroliz Fırın Reçetesi */}
                {(activeTab === 'all' || activeTab === 'thermal') && (
                  <ThermalRecipeChart
                    data={analysisResult}
                    onSendToPlc={() => setIsPlcModalOpen(true)}
                  />
                )}

                {/* 4. Çıktı Kalite Tahmini & rCB Raporu */}
                {(activeTab === 'all' || activeTab === 'rcb') && (
                  <RcbQualityReport
                    data={analysisResult}
                    onOpenPrintModal={() => setIsPrintModalOpen(true)}
                  />
                )}
              </div>
            ) : errorMessage && errorMessage.includes('Lastik tespit edilmedi') ? (
              /* Requirement 3: If isTire is false, show "Lastik tespit edilmedi" in UI with no recipe */
              <div className="bg-zinc-900/90 border border-amber-600/70 rounded-xl p-6 sm:p-10 flex flex-col items-center justify-center text-center gap-6 shadow-xl">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-amber-950/70 border border-amber-600/70 flex items-center justify-center text-amber-400 shadow-inner">
                    <ShieldAlert className="w-10 h-10 text-amber-400" />
                  </div>
                </div>

                <div className="max-w-md">
                  <div className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-semibold mb-1">
                    GÖRSEL DOĞRULAMA (HTTP 422)
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    Lastik tespit edilmedi
                  </h3>
                  <div className="text-xs text-amber-200/95 mt-2 bg-amber-950/50 p-3 rounded-lg border border-amber-800/80 font-mono leading-relaxed">
                    {errorMessage}
                  </div>
                  <p className="text-xs text-zinc-400 mt-3 leading-relaxed">
                    Yüklenen görselde araç lastiği yapısı tespit edilemediğinden piroliz fırın reçetesi, polimer oranları ve rCB kütle dengesi oluşturulmamıştır. Lütfen geçerli bir hurda lastik (ÖTL) görseli seçin.
                  </p>
                </div>
              </div>
            ) : (
              /* Industrial Placeholder State when no image is uploaded */
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-6 sm:p-10 flex flex-col items-center justify-center text-center gap-6 shadow-xl">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-zinc-950 border border-zinc-700/80 flex items-center justify-center text-zinc-500 shadow-inner">
                    <UploadCloud className="w-10 h-10 text-emerald-400/80" />
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500/20 border border-emerald-500/50 rounded-full flex items-center justify-center">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                  </span>
                </div>

                <div className="max-w-md">
                  <div className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-semibold mb-1">
                    KARAR DESTEK HAZIR
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    Tesis Kabul Alanı: Lastik Görseli Bekleniyor
                  </h3>
                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                    Sırt ve aşınma görselden okunur; polimer bileşimi sınıf bazlı tahmindir. Fırın termal reçetesi ve kütle dengesi hesaplamak için sol panelden bir hurda lastik görseli yükleyin.
                  </p>
                </div>

                {/* 4 Cards showcasing the dynamic pipeline */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl text-left">
                  <div className="p-3.5 rounded-lg border border-dashed border-zinc-800 bg-zinc-950/60 flex items-start gap-3">
                    <Scan className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-zinc-300">1. Sırt Durumu &amp; Geometri</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        Görselden desen tipi, omuz profili ve sınıf tespiti.
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg border border-dashed border-zinc-800 bg-zinc-950/60 flex items-start gap-3">
                    <TrendingDown className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-zinc-300">2. Aşınma Oranı &amp; Diş Derinliği</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        Sırt oluklarından net aşınma yüzdesi ve kalan diş hesabı.
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg border border-dashed border-zinc-800 bg-zinc-950/60 flex items-start gap-3">
                    <Atom className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-zinc-300">3. Polimer Kompozisyonu</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        Sınıf bazlı tipik NR, SBR, Silika ve Karbon Karası yüzdeleri.
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg border border-dashed border-zinc-800 bg-zinc-950/60 flex items-start gap-3">
                    <Flame className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-zinc-300">4. Fırın Termal Reçetesi</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        Optimum reaksiyon sıcaklığı (°C), ısıtma rampası ve rCB saflığı.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sayaçlar oturum süresince analiz edilen numunelerin rCB ve CO₂ kazanımını yansıtır.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-4 px-4 text-center text-xs text-zinc-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>TyreVision AI — ÖTL Piroliz Karar Destek Sistemi · Climathon Prototipi</span>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>ASTM D6556 / D1510 / ISO 14001 prensiplerine uyumlu tasarım</span>
          </span>
        </div>
      </footer>

      {/* Modals */}
      {isPlcModalOpen && analysisResult && (
        <ReactorSyncModal
          data={analysisResult}
          onClose={() => setIsPlcModalOpen(false)}
          onConfirmBatch={handleBatchSubmission}
        />
      )}

      {isPrintModalOpen && analysisResult && (
        <PrintReportModal
          data={analysisResult}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}

      {/* Requirement 5: Tekrarlanabilirlik Testi Modal */}
      {isRepeatabilityModalOpen && analysisResult && (
        <RepeatabilityTestModal
          data={analysisResult}
          imageBase64={currentImageBase64}
          mimeType={currentImageMime}
          onClose={() => setIsRepeatabilityModalOpen(false)}
        />
      )}
    </div>
  );
}
