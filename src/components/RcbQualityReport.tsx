import React from 'react';
import { TireAnalysisResult } from '../types/tire';
import { 
  Award, 
  Sparkles, 
  Leaf, 
  DollarSign, 
  CheckCircle2, 
  Printer, 
  FileText,
  BadgePercent,
  Layers,
  ArrowUpRight
} from 'lucide-react';

interface RcbQualityReportProps {
  data: TireAnalysisResult;
  onOpenPrintModal: () => void;
}

export const RcbQualityReport: React.FC<RcbQualityReportProps> = ({ data, onOpenPrintModal }) => {
  const { rcbQualityEstimate, massBalance } = data;

  const totalValueUsd = Math.round((massBalance.recoveredCarbonBlackKg / 1000) * rcbQualityEstimate.economicValuePerTonUsd);

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 sm:p-5 flex flex-col gap-5 shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm sm:text-base">
              Geri Kazanılmış Karbon Karası (rCB) Çıktı Kalite &amp; Değer Raporu
            </h3>
            <p className="text-[11px] text-zinc-400 font-mono">
              ASTM D6556 / D1510 / ISO 14001 Standartlarına Göre Yüzey Saflığı
            </p>
          </div>
        </div>

        <button
          onClick={onOpenPrintModal}
          className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium px-3 py-1.5 rounded-lg border border-zinc-700 flex items-center gap-1.5 transition shadow-sm"
        >
          <Printer className="w-3.5 h-3.5 text-emerald-400" />
          <span>Taslak Rapor İndir</span>
        </button>
      </div>

      {/* Main Verdict & ASTM Classification Card */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-zinc-950 to-zinc-950 border border-emerald-700/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
              A-SINIFI rCB KALİTESİ
            </span>
            <span className="text-xs text-zinc-400 font-mono">Endüstriyel İkame</span>
            {rcbQualityEstimate.contaminationLevel && (
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                rcbQualityEstimate.contaminationLevel === 'yüksek'
                  ? 'bg-rose-950/70 text-rose-300 border-rose-800'
                  : rcbQualityEstimate.contaminationLevel === 'orta'
                  ? 'bg-amber-950/70 text-amber-300 border-amber-800'
                  : 'bg-emerald-950/70 text-emerald-300 border-emerald-800'
              }`}>
                Kirlilik: {rcbQualityEstimate.contaminationLevel}
              </span>
            )}
          </div>
          <h4 className="text-base sm:text-lg font-bold text-white">
            {rcbQualityEstimate.iodineAdsorptionNo >= 65
              ? 'ASTM N330 Sınıfı rCB'
              : rcbQualityEstimate.iodineAdsorptionNo >= 38
              ? 'ASTM N550 Sınıfı rCB'
              : 'ASTM N660 Sınıfı rCB'}
          </h4>
          <p className="text-xs text-zinc-300 mt-1 max-w-2xl leading-relaxed">
            {rcbQualityEstimate.qualityVerdictTr}
          </p>
        </div>

        <div className="flex items-center sm:flex-col sm:items-end justify-between border-t sm:border-t-0 sm:border-l border-zinc-800 pt-3 sm:pt-0 sm:pl-4 flex-shrink-0">
          <span className="text-xs text-zinc-400">Yüzey Saflığı Derecesi</span>
          <span className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400">
            %{rcbQualityEstimate.purityPercentage.toFixed(1)}
          </span>
          <span className="text-[10px] text-emerald-500/90 font-mono">
            Uçucu Madde: %{rcbQualityEstimate.volatileMatterPct}
          </span>
        </div>
      </div>

      {/* ASTM Test Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {/* BET Surface Area */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-zinc-400 uppercase">BET Yüzey Alanı</div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {rcbQualityEstimate.betSurfaceAreaM2g} <span className="text-xs font-normal text-zinc-400">m²/g</span>
          </div>
          <div className="text-[10px] text-emerald-400 font-mono mt-1">
            ASTM D6556 Standardı
          </div>
        </div>

        {/* Iodine Adsorption No */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-zinc-400 uppercase">İyot Absorpsiyon No</div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {rcbQualityEstimate.iodineAdsorptionNo} <span className="text-xs font-normal text-zinc-400">mg/g</span>
          </div>
          <div className="text-[10px] text-zinc-400 font-mono mt-1">
            ASTM D1510 Standardı
          </div>
        </div>

        {/* Ash Content */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-zinc-400 uppercase">Kül Miktarı (Ash %)</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">
            %{rcbQualityEstimate.ashContentPct.toFixed(1)}
          </div>
          <div className="text-[10px] text-zinc-400 font-mono mt-1">
            {rcbQualityEstimate.contaminationLevel && rcbQualityEstimate.contaminationLevel !== 'düşük'
              ? 'Çamur/toprak etkisiyle artırıldı'
              : 'ZnS, Silika ve Metalik Kül'}
          </div>
        </div>

        {/* Volatile Matter */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-zinc-400 uppercase">Uçucu Madde (Volatiles)</div>
          <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
            %{rcbQualityEstimate.volatileMatterPct.toFixed(1)}
          </div>
          <div className="text-[10px] text-cyan-500 font-mono mt-1">
            ASTM D1620 (950°C)
          </div>
        </div>

        {/* Contamination Level */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 col-span-2 sm:col-span-1">
          <div className="text-[10px] font-mono text-zinc-400 uppercase">Yüzey Kirliliği</div>
          <div className="text-xl font-bold font-mono mt-1 capitalize text-emerald-300">
            {rcbQualityEstimate.contaminationLevel || 'Düşük'}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono mt-1">
            Kirlilik: {rcbQualityEstimate.contaminationLevel || 'düşük'}
          </div>
        </div>
      </div>

      {/* Industrial Application Suitability Tags */}
      <div className="bg-zinc-950/70 border border-zinc-800 rounded-lg p-3.5 flex flex-col gap-2">
        <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          <span>Yeni Üretimde İkame ve Kullanım Alanları:</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {rcbQualityEstimate.industrialSuitability.map((useCase, idx) => (
            <div
              key={idx}
              className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-md text-xs text-zinc-300 flex items-start gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>{useCase}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Economic & Environmental Impact Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-zinc-800/80">
        {/* CO2 Savings */}
        <div className="bg-teal-950/20 border border-teal-800/40 rounded-lg p-3 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-teal-400 flex items-center gap-1">
              <Leaf className="w-3.5 h-3.5" />
              <span>Parti Başına Önlenen CO₂ Emisyonu</span>
            </div>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {rcbQualityEstimate.co2SavingsTonPerBatch} <span className="text-xs font-normal text-zinc-400">Ton CO₂e</span>
            </div>
          </div>
          <div className="text-[10px] text-teal-300 font-mono text-right">
            Virgin CB Yerine<br />Döngüsel İkame
          </div>
        </div>

        {/* Economic Value */}
        <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-lg p-3 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" />
              <span>Tahmini Parti Katma Değeri</span>
            </div>
            <div className="text-xl font-bold font-mono text-white mt-1">
              ${totalValueUsd.toLocaleString('en-US')} <span className="text-xs font-normal text-zinc-400">({rcbQualityEstimate.economicValuePerTonUsd} $/ton)</span>
            </div>
          </div>
          <div className="text-[10px] text-emerald-300 font-mono text-right">
            rCB Satış Değeri<br />(Ham Char Fazı)
          </div>
        </div>
      </div>

      {/* Requirement 6: Note under CO2 and price values */}
      <div className="text-[11px] text-zinc-400 font-mono italic text-center sm:text-left pt-0.5">
        Varsayım: 2,45 tCO₂e/t rCB; piroliz proses emisyonları dahil değildir. Fiyat model tahminidir.
      </div>
    </div>
  );
};
