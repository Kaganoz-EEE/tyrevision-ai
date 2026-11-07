import React from 'react';
import { TireAnalysisResult, TireCategory, AnalysisFeedback } from '../types/tire';
import { ClassFeedbackWidget } from './ClassFeedbackWidget';
import { 
  Scan, 
  Gauge, 
  ShieldAlert, 
  CheckCircle, 
  AlertTriangle, 
  Cpu, 
  HelpCircle,
  TrendingDown,
  FlaskConical
} from 'lucide-react';

interface DiagnosticsReportProps {
  data: TireAnalysisResult;
  feedback?: AnalysisFeedback;
  onSaveFeedback?: (
    analysisId: string,
    isCorrect: boolean,
    trueCategory?: TireCategory,
    trueTreadDepthMm?: number | null
  ) => void;
  onOpenRepeatabilityModal?: () => void;
}

export const DiagnosticsReport: React.FC<DiagnosticsReportProps> = ({
  data,
  feedback,
  onSaveFeedback,
  onOpenRepeatabilityModal,
}) => {
  const { tireClassification } = data;
  const wear = tireClassification.estimatedWearRate;
  const remaining = tireClassification.remainingTreadDepthMm;
  const original = tireClassification.originalTreadDepthMm;

  // Requirement 2: Do not invent defaults for confidence; if missing return null and show "belirsiz"
  const rawConfidence = tireClassification.confidence;
  const displayConfidence =
    rawConfidence !== null && rawConfidence !== undefined && Number.isFinite(rawConfidence)
      ? `%${Math.round(rawConfidence > 0 && rawConfidence <= 1 ? rawConfidence * 100 : rawConfidence)}`
      : 'belirsiz';

  // Requirement 7: If a brand or model is inferred/shown, display "Tahmini eşleşme"
  const isBrandOrModelShown = Boolean(
    tireClassification.isBrandEstimated ||
      /\b(Michelin|Goodyear|Continental|Bridgestone|Pirelli|Hankook|Lassa|Petlas|Dunlop|Yokohama|Cooper|Kumho|Maxxis|BFGoodrich|Falken|Nokian)\b/i.test(
        tireClassification.subType
      )
  );

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 sm:p-5 flex flex-col gap-4 shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Scan className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm sm:text-base">
              Görsel Tanılama &amp; Sınıflandırma Raporu
            </h3>
            <p className="text-[11px] text-zinc-400 font-mono">
              Analiz ID: {data.analysisId} | Model Güveni: {displayConfidence}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenRepeatabilityModal && (
            <button
              type="button"
              onClick={onOpenRepeatabilityModal}
              className="text-xs px-2.5 py-1 rounded-full border font-mono font-semibold text-emerald-300 bg-emerald-950/70 border-emerald-700/80 hover:bg-emerald-900/80 flex items-center gap-1.5 shadow-sm transition"
              title="Aynı görseli ardışık 5 kez analiz ederek varyansı ölçer"
            >
              <FlaskConical className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tekrarlanabilirlik Testi</span>
            </button>
          )}

          {data.isUploadedImageAnalysis && (
            <span className="text-xs px-2.5 py-1 rounded-full border font-mono font-semibold text-cyan-300 bg-cyan-950/70 border-cyan-700/80 flex items-center gap-1.5 shadow-sm">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Gemini Vision</span>
              {data.modelUsed && (
                <span className="text-[10px] text-cyan-400/80 font-normal border-l border-cyan-800/80 pl-1.5 ml-0.5">
                  {data.modelUsed}
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Main Category Badge & Wear Profile */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
        {/* Identified Tire Category Card */}
        <div className="md:col-span-6 bg-zinc-950/80 border border-zinc-800 rounded-lg p-3.5 flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold mb-1">
              Tespit Edilen Lastik Sınıfı
            </div>
            <div className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>{tireClassification.categoryNameTr}</span>
            </div>
            <div className="text-xs text-zinc-400 mt-1 font-mono flex items-center gap-1.5 flex-wrap">
              <span>Alt Kategori: <strong className="text-zinc-200">{tireClassification.subType}</strong></span>
              {isBrandOrModelShown && (
                <span className="text-[10px] bg-amber-950/80 text-amber-300 border border-amber-700/60 px-1.5 py-0.5 rounded font-sans font-medium">
                  Tahmini eşleşme
                </span>
              )}
            </div>
            {data.uploadedImageDetails?.resolution && (
              <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-mono">
                <span className="bg-zinc-900 border border-zinc-700/80 px-2 py-0.5 rounded text-zinc-300">
                  Çözünürlük: {data.uploadedImageDetails.resolution}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Wear Rate & Tread Depth Analysis */}
        <div className="md:col-span-6 bg-zinc-950/80 border border-zinc-800 rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
              <span>Aşınma &amp; Diş Derinliği Profili</span>
            </div>
            <span className="font-mono font-bold text-sm text-amber-400">
              %{wear} Aşınmış
            </span>
          </div>

          {/* Progress Bar for Wear */}
          <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden p-0.5 border border-zinc-700/80 mb-2">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                wear > 80 ? 'bg-rose-500' : wear > 50 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, wear))}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-zinc-800/80">
            <div>
              <span className="text-zinc-400">Kalan Diş: </span>
              <strong className="text-white font-mono text-sm">{remaining.toFixed(1)} mm</strong>
            </div>
            <div className="text-right">
              <span className="text-zinc-400">Fabrika Orijinal: </span>
              <strong className="text-zinc-400 font-mono">
                {original !== null && original !== undefined && Number.isFinite(original)
                  ? `${original.toFixed(1)} mm`
                  : 'belirsiz'}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Pattern Features Tags & Engineering Notes */}
      <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-3 flex flex-col gap-2">
        <div className="text-[11px] font-mono text-zinc-400 uppercase font-semibold flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-emerald-400" />
          <span>Sırt Deseni &amp; Omuz Morfolojisi Çıkarımları:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {tireClassification.patternFeatures.map((feature, idx) => (
            <span
              key={idx}
              className="text-xs bg-zinc-900 border border-zinc-700/70 text-zinc-200 px-2.5 py-1 rounded-md flex items-center gap-1.5"
            >
              <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />
              <span>{feature}</span>
            </span>
          ))}
        </div>
        <p className="text-xs text-zinc-400 italic bg-zinc-900/60 p-2.5 rounded border border-zinc-800 mt-1">
          &ldquo;{tireClassification.visualInspectionNotes}&rdquo;
        </p>
      </div>

      {/* Requirement 1: Under each analysis result add Sınıf doğru mu? ✓ Doğru / ✗ Yanlış */}
      {onSaveFeedback && (
        <div className="pt-1">
          <ClassFeedbackWidget
            analysisId={data.analysisId}
            predictedCategory={tireClassification.category}
            feedback={feedback}
            onSaveFeedback={onSaveFeedback}
          />
        </div>
      )}
    </div>
  );
};
