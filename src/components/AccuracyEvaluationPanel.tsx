import React, { useState, useMemo } from 'react';
import { 
  TireCategory, 
  SessionAnalysisItem, 
  AnalysisFeedback, 
  TIRE_CATEGORY_LABELS 
} from '../types/tire';
import { 
  CheckCircle2, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  BarChart2, 
  Table, 
  Ruler, 
  Info,
  ShieldCheck
} from 'lucide-react';

interface AccuracyEvaluationPanelProps {
  sessionAnalyses: SessionAnalysisItem[];
  feedbacks: Record<string, AnalysisFeedback>;
}

const CATEGORIES: TireCategory[] = [
  'TRUCK_BUS_TBR',
  'PASSENGER_SUMMER',
  'PASSENGER_WINTER',
  'SUV_ALL_TERRAIN',
  'HEAVY_INDUSTRIAL_OTR',
];

const SHORT_LABELS: Record<TireCategory, string> = {
  TRUCK_BUS_TBR: 'TBR',
  PASSENGER_SUMMER: 'Yaz',
  PASSENGER_WINTER: 'Kış',
  SUV_ALL_TERRAIN: 'SUV/4x4',
  HEAVY_INDUSTRIAL_OTR: 'OTR',
};

export const AccuracyEvaluationPanel: React.FC<AccuracyEvaluationPanelProps> = ({
  sessionAnalyses,
  feedbacks,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(true);

  // Compute accuracy statistics
  const {
    labeledCount,
    correctCount,
    overallAccuracyPct,
    accuracyPerClass,
    confusionMatrix,
    maeTreadDepth,
    depthSampleCount,
  } = useMemo(() => {
    const labeledList = sessionAnalyses.filter((item) => feedbacks[item.id] !== undefined);
    const count = labeledList.length;

    let correct = 0;
    // 5x5 confusion matrix: matrix[predCategory][trueCategory]
    const matrix: Record<TireCategory, Record<TireCategory, number>> = {
      TRUCK_BUS_TBR: { TRUCK_BUS_TBR: 0, PASSENGER_SUMMER: 0, PASSENGER_WINTER: 0, SUV_ALL_TERRAIN: 0, HEAVY_INDUSTRIAL_OTR: 0 },
      PASSENGER_SUMMER: { TRUCK_BUS_TBR: 0, PASSENGER_SUMMER: 0, PASSENGER_WINTER: 0, SUV_ALL_TERRAIN: 0, HEAVY_INDUSTRIAL_OTR: 0 },
      PASSENGER_WINTER: { TRUCK_BUS_TBR: 0, PASSENGER_SUMMER: 0, PASSENGER_WINTER: 0, SUV_ALL_TERRAIN: 0, HEAVY_INDUSTRIAL_OTR: 0 },
      SUV_ALL_TERRAIN: { TRUCK_BUS_TBR: 0, PASSENGER_SUMMER: 0, PASSENGER_WINTER: 0, SUV_ALL_TERRAIN: 0, HEAVY_INDUSTRIAL_OTR: 0 },
      HEAVY_INDUSTRIAL_OTR: { TRUCK_BUS_TBR: 0, PASSENGER_SUMMER: 0, PASSENGER_WINTER: 0, SUV_ALL_TERRAIN: 0, HEAVY_INDUSTRIAL_OTR: 0 },
    };

    let depthDiffSum = 0;
    let depthCount = 0;

    for (const item of labeledList) {
      const fb = feedbacks[item.id];
      if (!fb) continue;

      if (fb.isClassCorrect) {
        correct++;
      }

      const pred = item.predictedCategory;
      const trueCat = fb.trueCategory || pred;

      if (matrix[pred] && matrix[pred][trueCat] !== undefined) {
        matrix[pred][trueCat] += 1;
      }

      if (fb.trueTreadDepthMm !== null && Number.isFinite(fb.trueTreadDepthMm)) {
        depthDiffSum += Math.abs(item.remainingTreadDepthMm - fb.trueTreadDepthMm);
        depthCount += 1;
      }
    }

    const overallPct = count > 0 ? Number(((correct / count) * 100).toFixed(1)) : null;
    const mae = depthCount > 0 ? Number((depthDiffSum / depthCount).toFixed(2)) : null;

    // Accuracy per class: (correctly predicted as C) / (total times truly C)
    const perClass: Array<{ category: TireCategory; totalTrue: number; correct: number; pct: number | null }> = CATEGORIES.map((cat) => {
      // Total samples where ground truth is cat
      let totalTrue = 0;
      let classCorrect = 0;

      for (const item of labeledList) {
        const fb = feedbacks[item.id];
        const actualCat = fb.trueCategory || item.predictedCategory;
        if (actualCat === cat) {
          totalTrue += 1;
          if (item.predictedCategory === cat) {
            classCorrect += 1;
          }
        }
      }

      const pct = totalTrue > 0 ? Number(((classCorrect / totalTrue) * 100).toFixed(1)) : null;
      return { category: cat, totalTrue, correct: classCorrect, pct };
    });

    return {
      labeledCount: count,
      correctCount: correct,
      overallAccuracyPct: overallPct,
      accuracyPerClass: perClass,
      confusionMatrix: matrix,
      maeTreadDepth: mae,
      depthSampleCount: depthCount,
    };
  }, [sessionAnalyses, feedbacks]);

  // CSV Export handler
  const handleExportCsv = () => {
    if (sessionAnalyses.length === 0) {
      alert('Dışa aktarılacak analiz kaydı bulunmuyor.');
      return;
    }

    const headers = [
      'analysisId',
      'timestamp',
      'fileName',
      'modelUsed',
      'predictedCategory',
      'trueCategory',
      'classCorrect',
      'confidence',
      'wearRatePct',
      'remainingTreadDepthMm',
      'trueTreadDepthMm',
      'contaminationLevel',
      'nrPct',
      'sbrPct',
      'silicaPct',
      'steelPct',
    ];

    const rows = sessionAnalyses.map((item) => {
      const fb = feedbacks[item.id];
      const trueCat = fb ? fb.trueCategory : '';
      const classCorrect = fb ? (fb.isClassCorrect ? 'EVET' : 'HAYIR') : 'ETIKETLENMEDI';
      const trueDepth = fb?.trueTreadDepthMm !== null && fb?.trueTreadDepthMm !== undefined ? fb.trueTreadDepthMm : '';

      return [
        item.id,
        item.timestamp,
        `"${(item.fileName || '').replace(/"/g, '""')}"`,
        item.modelUsed || '',
        item.predictedCategory,
        trueCat,
        classCorrect,
        item.confidence !== null && item.confidence !== undefined ? item.confidence : '',
        item.wearRatePct,
        item.remainingTreadDepthMm,
        trueDepth,
        item.contaminationLevel || '',
        item.nrPct,
        item.sbrPct,
        item.silicaPct,
        item.steelPct,
      ].join(';');
    });

    // Prepend UTF-8 BOM for Turkish Excel compatibility
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `otl_dogruluk_raporu_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3 shadow-xl">
      {/* Panel Header & Accordion Toggle */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-left hover:text-white transition"
        >
          <div className="w-6 h-6 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <BarChart2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-xs sm:text-sm flex items-center gap-1.5">
              <span>Doğruluk &amp; Kalibrasyon Paneli</span>
              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">
                {labeledCount} Etiketli
              </span>
            </h3>
          </div>
        </button>

        <div className="flex items-center gap-2">
          {/* CSV Download Button */}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={sessionAnalyses.length === 0}
            className={`text-xs px-2.5 py-1 rounded font-medium flex items-center gap-1.5 transition ${
              sessionAnalyses.length === 0
                ? 'bg-zinc-800 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold border border-emerald-400 shadow-sm'
            }`}
            title="Tüm oturum analizlerini UTF-8 BOM ile noktalı virgüllü CSV olarak indir"
          >
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">CSV İndir</span>
            <span className="sm:hidden">CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="text-zinc-400 hover:text-white p-1 rounded transition"
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="flex flex-col gap-3.5 pt-1 text-xs">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {/* Labeled Count */}
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-lg p-2.5">
              <span className="text-[10px] text-zinc-400 font-mono block">Etiketlenen Numune</span>
              <div className="text-base sm:text-lg font-bold font-mono text-white mt-0.5">
                {labeledCount} <span className="text-[10px] text-zinc-500 font-normal">/ {sessionAnalyses.length}</span>
              </div>
            </div>

            {/* Overall Accuracy */}
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-lg p-2.5">
              <span className="text-[10px] text-zinc-400 font-mono block">Genel Sınıf Doğruluğu</span>
              <div className="text-base sm:text-lg font-bold font-mono text-emerald-400 mt-0.5">
                {overallAccuracyPct !== null ? `%${overallAccuracyPct}` : '—'}
                {overallAccuracyPct !== null && (
                  <span className="text-[10px] text-zinc-500 font-normal ml-1">
                    ({correctCount}/{labeledCount})
                  </span>
                )}
              </div>
            </div>

            {/* Tread Depth MAE */}
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-lg p-2.5 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-zinc-400 font-mono block flex items-center gap-1">
                <Ruler className="w-3 h-3 text-cyan-400" />
                <span>Diş Derinliği MAE</span>
              </span>
              <div className="text-base sm:text-lg font-bold font-mono text-cyan-300 mt-0.5">
                {maeTreadDepth !== null ? `${maeTreadDepth} mm` : '—'}
                {depthSampleCount > 0 && (
                  <span className="text-[10px] text-zinc-500 font-normal ml-1">
                    ({depthSampleCount} numune)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Warning Note if fewer than 20 labeled analyses */}
          {labeledCount < 20 && (
            <div className="bg-amber-950/30 border border-amber-800/60 rounded-lg p-2.5 text-amber-300 flex items-start gap-2 text-[11px] font-mono leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Örneklem küçükse yüzdeler yanıltıcıdır.</strong>
                <div className="text-amber-400/80 text-[10px] mt-0.5">
                  Güvenilir istatistiksel sonuçlar için en az 20 adet etiketli numune önerilir (Şu an: {labeledCount}/20).
                </div>
              </div>
            </div>
          )}

          {/* Accuracy Per Class Bars */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-3 flex flex-col gap-2">
            <div className="text-[11px] font-mono text-zinc-400 uppercase font-semibold flex items-center justify-between">
              <span>Sınıf Bazında Başarım (Gerçek Sınıfa Göre Doğruluk)</span>
              <span className="text-[10px] text-zinc-500">Doğru / Toplam</span>
            </div>

            <div className="space-y-1.5">
              {accuracyPerClass.map((c) => (
                <div key={c.category} className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-300 font-medium">
                      {TIRE_CATEGORY_LABELS[c.category]}
                    </span>
                    <span className="font-mono text-zinc-400">
                      {c.pct !== null ? `%${c.pct} (${c.correct}/${c.totalTrue})` : 'Henüz etiket yok'}
                    </span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        c.pct === null
                          ? 'bg-zinc-700'
                          : c.pct >= 80
                          ? 'bg-emerald-500'
                          : c.pct >= 50
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${c.pct !== null ? Math.max(5, c.pct) : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Simple Confusion Table (Tahmin vs Gerçek) */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-3 flex flex-col gap-2 overflow-x-auto">
            <div className="text-[11px] font-mono text-zinc-400 uppercase font-semibold flex items-center gap-1.5">
              <Table className="w-3.5 h-3.5 text-emerald-400" />
              <span>Karışıklık Tablosu (Satır: Tahmin Edilen / Sütun: Gerçek Sınıf)</span>
            </div>

            <table className="w-full text-[10px] font-mono border-collapse text-center">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="p-1 text-left font-normal">Tahmin \ Gerçek</th>
                  {CATEGORIES.map((cat) => (
                    <th key={cat} className="p-1 font-semibold text-zinc-300">
                      {SHORT_LABELS[cat]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CATEGORIES.map((predCat) => (
                  <tr key={predCat} className="border-b border-zinc-900/80 hover:bg-zinc-900/40">
                    <td className="p-1 text-left font-medium text-zinc-300 whitespace-nowrap">
                      {SHORT_LABELS[predCat]}
                    </td>
                    {CATEGORIES.map((trueCat) => {
                      const count = confusionMatrix[predCat][trueCat];
                      const isDiagonal = predCat === trueCat;
                      return (
                        <td
                          key={trueCat}
                          className={`p-1 font-bold ${
                            count > 0 && isDiagonal
                              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50'
                              : count > 0 && !isDiagonal
                              ? 'bg-rose-950/50 text-rose-300 border border-rose-800/50'
                              : 'text-zinc-600'
                          }`}
                        >
                          {count}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-[9px] text-zinc-500 font-mono mt-1 flex items-center justify-between">
              <span>* Yeşil hücreler doğru tahminleri, kırmızı hücreler karışıklığı belirtir.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
