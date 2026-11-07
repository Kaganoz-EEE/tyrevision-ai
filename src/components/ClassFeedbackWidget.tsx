import React, { useState, useEffect } from 'react';
import { TireCategory, AnalysisFeedback, TIRE_CATEGORY_LABELS } from '../types/tire';
import { Check, X, Ruler, HelpCircle, Tag, CheckCircle2 } from 'lucide-react';

interface ClassFeedbackWidgetProps {
  analysisId: string;
  predictedCategory: TireCategory;
  feedback?: AnalysisFeedback;
  onSaveFeedback: (
    analysisId: string,
    isCorrect: boolean,
    trueCategory?: TireCategory,
    trueTreadDepthMm?: number | null
  ) => void;
  compact?: boolean;
}

const CATEGORY_LIST: TireCategory[] = [
  'TRUCK_BUS_TBR',
  'PASSENGER_SUMMER',
  'PASSENGER_WINTER',
  'SUV_ALL_TERRAIN',
  'HEAVY_INDUSTRIAL_OTR',
];

export const ClassFeedbackWidget: React.FC<ClassFeedbackWidgetProps> = ({
  analysisId,
  predictedCategory,
  feedback,
  onSaveFeedback,
  compact = false,
}) => {
  const [selectedCorrect, setSelectedCorrect] = useState<boolean | null>(
    feedback ? feedback.isClassCorrect : null
  );
  const [trueCategory, setTrueCategory] = useState<TireCategory>(
    feedback?.trueCategory || predictedCategory
  );
  const [trueDepthInput, setTrueDepthInput] = useState<string>(
    feedback?.trueTreadDepthMm !== undefined && feedback?.trueTreadDepthMm !== null
      ? String(feedback.trueTreadDepthMm)
      : ''
  );

  useEffect(() => {
    if (feedback) {
      setSelectedCorrect(feedback.isClassCorrect);
      setTrueCategory(feedback.trueCategory);
      setTrueDepthInput(
        feedback.trueTreadDepthMm !== undefined && feedback.trueTreadDepthMm !== null
          ? String(feedback.trueTreadDepthMm)
          : ''
      );
    }
  }, [feedback]);

  const handleCorrectClick = () => {
    setSelectedCorrect(true);
    setTrueCategory(predictedCategory);
    const parsedDepth = trueDepthInput.trim() !== '' ? Number(trueDepthInput) : null;
    onSaveFeedback(
      analysisId,
      true,
      predictedCategory,
      Number.isFinite(parsedDepth) ? parsedDepth : null
    );
  };

  const handleIncorrectClick = () => {
    setSelectedCorrect(false);
    // If trueCategory is still the predicted one, default to another category
    const initialFallback =
      trueCategory === predictedCategory
        ? CATEGORY_LIST.find((c) => c !== predictedCategory) || predictedCategory
        : trueCategory;
    setTrueCategory(initialFallback);
    const parsedDepth = trueDepthInput.trim() !== '' ? Number(trueDepthInput) : null;
    onSaveFeedback(
      analysisId,
      false,
      initialFallback,
      Number.isFinite(parsedDepth) ? parsedDepth : null
    );
  };

  const handleCategoryChange = (cat: TireCategory) => {
    setTrueCategory(cat);
    const parsedDepth = trueDepthInput.trim() !== '' ? Number(trueDepthInput) : null;
    onSaveFeedback(
      analysisId,
      false,
      cat,
      Number.isFinite(parsedDepth) ? parsedDepth : null
    );
  };

  const handleDepthChange = (val: string) => {
    setTrueDepthInput(val);
    const parsed = val.trim() !== '' ? parseFloat(val.replace(',', '.')) : null;
    if (selectedCorrect !== null) {
      onSaveFeedback(
        analysisId,
        selectedCorrect,
        selectedCorrect ? predictedCategory : trueCategory,
        Number.isFinite(parsed) ? parsed : null
      );
    }
  };

  return (
    <div
      className={`rounded-lg border transition-all ${
        selectedCorrect === true
          ? 'bg-emerald-950/30 border-emerald-800/60'
          : selectedCorrect === false
          ? 'bg-amber-950/30 border-amber-800/60'
          : 'bg-zinc-950/70 border-zinc-800'
      } ${compact ? 'p-2 text-xs' : 'p-3 text-xs'}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-medium text-zinc-300">
          <Tag className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
          <span>Sınıf doğru mu?</span>
          {selectedCorrect !== null && (
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                selectedCorrect
                  ? 'bg-emerald-900/70 text-emerald-300 border border-emerald-700/60'
                  : 'bg-amber-900/70 text-amber-300 border border-amber-700/60'
              }`}
            >
              {selectedCorrect ? 'Doğrulandı' : 'Düzeltildi'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCorrectClick}
            className={`px-2.5 py-1 rounded font-medium text-xs flex items-center gap-1 transition ${
              selectedCorrect === true
                ? 'bg-emerald-600 text-zinc-950 font-bold shadow'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>✓ Doğru</span>
          </button>

          <button
            type="button"
            onClick={handleIncorrectClick}
            className={`px-2.5 py-1 rounded font-medium text-xs flex items-center gap-1 transition ${
              selectedCorrect === false
                ? 'bg-rose-600 text-white font-bold shadow'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700'
            }`}
          >
            <X className="w-3.5 h-3.5" />
            <span>✗ Yanlış</span>
          </button>
        </div>
      </div>

      {/* When "Yanlış" is selected, show dropdown for "Gerçek sınıf" */}
      {selectedCorrect === false && (
        <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center gap-2">
          <label className="text-zinc-400 font-mono text-[11px] whitespace-nowrap">
            Gerçek sınıf:
          </label>
          <select
            value={trueCategory}
            onChange={(e) => handleCategoryChange(e.target.value as TireCategory)}
            className="w-full sm:w-auto flex-1 bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-xs text-white focus:border-emerald-500 focus:outline-none"
          >
            {CATEGORY_LIST.map((cat) => (
              <option key={cat} value={cat}>
                {TIRE_CATEGORY_LABELS[cat]} ({cat})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Optional measured true tread depth field */}
      <div className="mt-2 pt-2 border-t border-zinc-800/60 flex flex-wrap items-center gap-2">
        <label className="text-zinc-400 text-[11px] font-mono flex items-center gap-1 whitespace-nowrap">
          <Ruler className="w-3 h-3 text-emerald-400" />
          <span>Gerçek diş derinliği (mm):</span>
        </label>
        <div className="flex items-center gap-1.5 flex-1 max-w-[140px]">
          <input
            type="number"
            step="0.1"
            min="0"
            max="35"
            placeholder="örn. 5.8"
            value={trueDepthInput}
            onChange={(e) => handleDepthChange(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-0.5 text-xs text-white font-mono placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
          />
          <span className="text-[10px] text-zinc-500 font-mono">mm</span>
        </div>
      </div>
    </div>
  );
};
