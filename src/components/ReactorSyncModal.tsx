import React, { useState, useEffect } from 'react';
import { TireAnalysisResult } from '../types/tire';
import { 
  CheckCircle, 
  X, 
  Send, 
  Cpu, 
  ShieldCheck, 
  Flame,
  ArrowRight
} from 'lucide-react';

interface ReactorSyncModalProps {
  data: TireAnalysisResult;
  onClose: () => void;
  onConfirmBatch?: (data: TireAnalysisResult) => void;
}

export const ReactorSyncModal: React.FC<ReactorSyncModalProps> = ({ 
  data, 
  onClose,
  onConfirmBatch 
}) => {
  const [step, setStep] = useState<number>(0);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const { thermalRecipe, massBalance } = data;

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 600);
    const t2 = setTimeout(() => setStep(2), 1400);
    const t3 = setTimeout(() => setStep(3), 2200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const handleCommitBatch = () => {
    setIsSubmitted(true);
    if (onConfirmBatch) {
      onConfirmBatch(data);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-lg w-full p-5 flex flex-col gap-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                Operatör Onay Simülasyonu
              </h3>
              <p className="text-xs text-zinc-400 font-mono">
                {thermalRecipe.reactorId} — Gerçek PLC bağlantısı yoktur; kayıt eşlemesi örnektir.
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

        {/* Transfer Status Steps */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3.5 flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5 text-xs">
            {step >= 1 ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            )}
            <span className={step >= 1 ? 'text-zinc-200' : 'text-zinc-500'}>
              Fırın PLC Denetleyicisi ile El Sıkışma (Handshake: {thermalRecipe.reactorId})
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-xs">
            {step >= 2 ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : step === 1 ? (
              <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            ) : (
              <div className="w-4 h-4 rounded-full border border-zinc-700 flex-shrink-0" />
            )}
            <span className={step >= 2 ? 'text-zinc-200' : 'text-zinc-500'}>
              Sıcaklık Set Değerleri ({thermalRecipe.optimalReactorTempC}°C, {thermalRecipe.heatingRampRateCPerMin}°C/dk) Doğrulandı
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-xs">
            {step >= 3 ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : step === 2 ? (
              <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            ) : (
              <div className="w-4 h-4 rounded-full border border-zinc-700 flex-shrink-0" />
            )}
            <span className={step >= 3 ? 'text-emerald-400 font-semibold' : 'text-zinc-500'}>
              Reaktör Parametreleri Kilitlendi &amp; Şarj Başlatmaya Hazır
            </span>
          </div>
        </div>

        {/* PLC Register Map Preview */}
        <div className="text-xs font-mono bg-black/60 border border-zinc-800 rounded p-3 text-zinc-300 space-y-1">
          <div className="text-emerald-400 font-bold mb-1">// Aktarılan PLC Holding Register Değerleri:</div>
          <div>HR-40001 [TEMP_SETPOINT]: <strong className="text-white">{thermalRecipe.optimalReactorTempC} °C</strong></div>
          <div>HR-40002 [RAMP_RATE]: <strong className="text-white">{thermalRecipe.heatingRampRateCPerMin} °C/min</strong></div>
          <div>HR-40003 [SOAK_TIME]: <strong className="text-white">{thermalRecipe.totalResidenceTimeMin} min</strong></div>
          <div>HR-40004 [N2_PURGE_FLOW]: <strong className="text-white">{thermalRecipe.nitrogenPurgeRateNm3H} Nm³/h</strong></div>
          <div>HR-40005 [VACUUM_SET]: <strong className="text-white">{thermalRecipe.vacuumLevelMbar} mbar</strong></div>
        </div>

        {isSubmitted && (
          <div className="bg-emerald-950/60 border border-emerald-600/60 rounded-lg p-3 text-xs text-emerald-300 flex items-center gap-2 font-mono">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Reçete operatör onayına sunuldu (simülasyon).</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition"
          >
            Kapat
          </button>

          {!isSubmitted ? (
            <button
              onClick={handleCommitBatch}
              disabled={step < 3}
              className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition ${
                step < 3
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-950/60'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Reçeteyi Operatöre Öner &amp; Onayla</span>
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold text-xs transition"
            >
              Tamamlandı
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
