import React, { useState, useEffect } from 'react';
import { TireAnalysisResult, TireCategory, TIRE_CATEGORY_LABELS } from '../types/tire';
import { 
  FlaskConical, 
  X, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Atom, 
  Boxes, 
  Layers,
  RotateCcw
} from 'lucide-react';

interface RepeatabilityTestModalProps {
  data: TireAnalysisResult;
  imageBase64: string;
  mimeType?: string;
  onClose: () => void;
}

interface RunRecord {
  runIndex: number;
  category: TireCategory;
  categoryNameTr: string;
  wearPct: number;
  nrPct: number;
  rcbKg: number;
  durationMs: number;
}

export const RepeatabilityTestModal: React.FC<RepeatabilityTestModalProps> = ({
  data,
  imageBase64,
  mimeType = 'image/jpeg',
  onClose,
}) => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [records, setRecords] = useState<RunRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Helper to compute min, max, mean, and standard deviation
  const computeStats = (values: number[]) => {
    if (values.length === 0) return { min: 0, max: 0, mean: 0, stdDev: 0 };
    const min = Math.min(...values);
    const max = Math.max(...values);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance =
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    return {
      min,
      max,
      mean: Number(mean.toFixed(1)),
      stdDev: Number(stdDev.toFixed(2)),
    };
  };

  const startTest = async () => {
    setIsRunning(true);
    setRecords([]);
    setErrorMessage(null);
    setCurrentStep(1);

    const collected: RunRecord[] = [];

    try {
      for (let i = 1; i <= 5; i++) {
        setCurrentStep(i);
        const startTime = Date.now();

        const response = await fetch('/api/analyze-tire', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64,
            mimeType,
            batchWeightKg: 3500,
            reactorId: data.thermalRecipe.reactorId,
            optimizationPriority: 'rcb_purity',
          }),
        });

        if (!response.ok) {
          let errText = `Koşum #${i} başarısız oldu (${response.status})`;
          try {
            const errJson = await response.json();
            if (errJson?.error) errText = errJson.error;
          } catch {
            // ignore
          }
          throw new Error(errText);
        }

        const resData = await response.json();
        if (!resData.success || !resData.data) {
          throw new Error(resData.error || `Koşum #${i} veri üretemedi.`);
        }

        const res: TireAnalysisResult = resData.data;
        const duration = Date.now() - startTime;

        const rec: RunRecord = {
          runIndex: i,
          category: res.tireClassification.category,
          categoryNameTr: res.tireClassification.categoryNameTr,
          wearPct: res.tireClassification.estimatedWearRate,
          nrPct: res.polymerMatrix.naturalRubberNR,
          rcbKg: res.massBalance.recoveredCarbonBlackKg,
          durationMs: duration,
        };

        collected.push(rec);
        setRecords([...collected]);
      }
    } catch (err: any) {
      console.error('Repeatability test error:', err);
      setErrorMessage(err.message || 'Tekrarlanabilirlik testi sırasında hata oluştu.');
    } finally {
      setIsRunning(false);
    }
  };

  // Start immediately upon opening if records are empty
  useEffect(() => {
    if (records.length === 0 && !isRunning && !errorMessage) {
      startTest();
    }
  }, []);

  // Compute metrics if 5 records collected (or whatever count completed)
  const wearStats = computeStats(records.map((r) => r.wearPct));
  const nrStats = computeStats(records.map((r) => r.nrPct));
  const rcbStats = computeStats(records.map((r) => r.rcbKg));

  const isCategoryConsistent =
    records.length > 0 && records.every((r) => r.category === records[0].category);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-2xl w-full p-4 sm:p-6 flex flex-col gap-4 shadow-2xl my-auto text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FlaskConical className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base">
                Tekrarlanabilirlik &amp; Model Tutarlılık Testi
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                Aynı lastik görseli ardışık 5 kez bağımsız olarak analiz ediliyor
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress or Status */}
        {isRunning ? (
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 flex flex-col items-center justify-center gap-3 text-center">
            <div className="relative">
              <div className="w-12 h-12 border-3 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin" />
              <FlaskConical className="w-5 h-5 text-emerald-400 absolute inset-0 m-auto animate-pulse" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">
                Koşum #{currentStep} / 5 Yürütülüyor...
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Görsel modele yeniden gönderilip aşınma, NR ve rCB kütle sapması ölçülüyor.
              </p>
            </div>

            {/* Step Indicators */}
            <div className="flex items-center gap-2 mt-1">
              {[1, 2, 3, 4, 5].map((step) => (
                <div
                  key={step}
                  className={`w-7 h-7 rounded-full text-xs font-mono font-bold flex items-center justify-center border transition ${
                    records.length >= step
                      ? 'bg-emerald-600 text-zinc-950 border-emerald-400'
                      : currentStep === step
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500 animate-pulse'
                      : 'bg-zinc-900 text-zinc-600 border-zinc-800'
                  }`}
                >
                  {step}
                </div>
              ))}
            </div>
          </div>
        ) : errorMessage ? (
          <div className="bg-rose-950/40 border border-rose-800 text-rose-300 p-3.5 rounded-lg text-xs flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              onClick={startTest}
              className="text-xs bg-rose-900 px-2 py-1 rounded hover:bg-rose-800 text-white ml-2"
            >
              Yeniden Dene
            </button>
          </div>
        ) : null}

        {/* Summary Results when finished */}
        {records.length > 0 && (
          <div className="flex flex-col gap-3.5">
            {/* Category Consistency Result */}
            <div
              className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                isCategoryConsistent
                  ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200'
                  : 'bg-amber-950/40 border-amber-700/60 text-amber-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {isCategoryConsistent ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                )}
                <div>
                  <span className="font-semibold block">
                    Kategori Tutarlılığı: {isCategoryConsistent ? '5 Koşumun Tamamında Aynı' : 'Farklı Sınıflar Tespit Edildi'}
                  </span>
                  <span className="text-[11px] opacity-80">
                    {isCategoryConsistent
                      ? `Tüm 5 testte tespit edilen sınıf: ${records[0].categoryNameTr} (${records[0].category})`
                      : `Sınıf dağılımı: ${records.map((r) => r.categoryNameTr).join(', ')}`}
                  </span>
                </div>
              </div>

              <span className="font-mono text-sm font-bold">
                {isCategoryConsistent ? '%100 Tutarlı' : 'Değişken'}
              </span>
            </div>

            {/* Metrics Grid: Min, Max, StdDev for Wear %, NR %, rCB kg */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              {/* Wear Rate % */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                <div className="text-[11px] font-mono text-amber-400 font-semibold flex items-center gap-1 mb-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Aşınma Oranı (%)</span>
                </div>
                <div className="space-y-0.5 text-[11px] font-mono pt-1">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Min:</span>
                    <strong className="text-white">%{wearStats.min}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Max:</span>
                    <strong className="text-white">%{wearStats.max}</strong>
                  </div>
                  <div className="flex justify-between border-t border-zinc-800 pt-1 mt-1">
                    <span className="text-zinc-400">Standart Sapma (σ):</span>
                    <strong className="text-emerald-400">±%{wearStats.stdDev}</strong>
                  </div>
                </div>
              </div>

              {/* Natural Rubber NR % */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                <div className="text-[11px] font-mono text-emerald-400 font-semibold flex items-center gap-1 mb-1">
                  <Atom className="w-3.5 h-3.5" />
                  <span>Doğal Kauçuk (NR %)</span>
                </div>
                <div className="space-y-0.5 text-[11px] font-mono pt-1">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Min:</span>
                    <strong className="text-white">%{nrStats.min}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Max:</span>
                    <strong className="text-white">%{nrStats.max}</strong>
                  </div>
                  <div className="flex justify-between border-t border-zinc-800 pt-1 mt-1">
                    <span className="text-zinc-400">Standart Sapma (σ):</span>
                    <strong className="text-emerald-400">±%{nrStats.stdDev}</strong>
                  </div>
                </div>
              </div>

              {/* rCB Kg */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                <div className="text-[11px] font-mono text-cyan-400 font-semibold flex items-center gap-1 mb-1">
                  <Boxes className="w-3.5 h-3.5" />
                  <span>rCB Katı Karbon (kg)</span>
                </div>
                <div className="space-y-0.5 text-[11px] font-mono pt-1">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Min:</span>
                    <strong className="text-white">{rcbStats.min} kg</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Max:</span>
                    <strong className="text-white">{rcbStats.max} kg</strong>
                  </div>
                  <div className="flex justify-between border-t border-zinc-800 pt-1 mt-1">
                    <span className="text-zinc-400">Standart Sapma (σ):</span>
                    <strong className="text-emerald-400">±{rcbStats.stdDev} kg</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Run-by-run Detailed Table */}
            <div className="bg-zinc-950/70 border border-zinc-800 rounded-lg p-3 overflow-x-auto">
              <div className="text-[11px] font-mono text-zinc-400 uppercase font-semibold mb-2">
                5 Koşumun Birebir Dökümü
              </div>
              <table className="w-full text-xs font-mono text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 text-[10px]">
                    <th className="p-1.5">Koşum</th>
                    <th className="p-1.5">Sınıf</th>
                    <th className="p-1.5 text-right">Aşınma</th>
                    <th className="p-1.5 text-right">NR %</th>
                    <th className="p-1.5 text-right">rCB Kütle</th>
                    <th className="p-1.5 text-right">Süre</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.runIndex} className="border-b border-zinc-900 hover:bg-zinc-900/50">
                      <td className="p-1.5 font-bold text-zinc-300">#{r.runIndex}</td>
                      <td className="p-1.5 text-white">{r.categoryNameTr}</td>
                      <td className="p-1.5 text-right text-amber-300">%{r.wearPct}</td>
                      <td className="p-1.5 text-right text-emerald-400">%{r.nrPct}</td>
                      <td className="p-1.5 text-right text-cyan-300">{r.rcbKg} kg</td>
                      <td className="p-1.5 text-right text-zinc-500">{(r.durationMs / 1000).toFixed(1)}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
          <button
            type="button"
            onClick={startTest}
            disabled={isRunning}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              isRunning
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Testi Tekrarla</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold rounded-lg text-xs transition"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
