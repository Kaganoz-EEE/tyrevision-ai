import React, { useState } from 'react';
import { TireAnalysisResult } from '../types/tire';
import { 
  Atom, 
  Layers, 
  HelpCircle, 
  Flame, 
  Boxes, 
  Sparkles,
  ArrowRight,
  Info
} from 'lucide-react';

interface PolymerMatrixChartProps {
  data: TireAnalysisResult;
}

interface Segment {
  id: string;
  name: string;
  abbr: string;
  value: number;
  color: string;
  desc: string;
}

export const PolymerMatrixChart: React.FC<PolymerMatrixChartProps> = ({ data }) => {
  const { polymerMatrix, massBalance } = data;
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);

  // Normalize composition percentages in code so they sum to exactly 100.0%
  const rawNR = Math.max(0, Number(polymerMatrix.naturalRubberNR) || 0);
  const rawSBR = Math.max(0, Number(polymerMatrix.syntheticRubberSBR_BR) || 0);
  const rawCB = Math.max(0, Number(polymerMatrix.carbonBlackFiller) || 0);
  const rawSilica = Math.max(0, Number(polymerMatrix.silicaFiller) || 0);
  const rawSteel = Math.max(0, Number(polymerMatrix.steelWireRatio) || 0);
  const rawAdditives = Math.max(0, (Number(polymerMatrix.processOilsAndAdditives) || 0) + (Number(polymerMatrix.zincOxideAndSulfur) || 0));

  const rawSum = rawNR + rawSBR + rawCB + rawSilica + rawSteel + rawAdditives;
  const factor = rawSum > 0 ? 100 / rawSum : 1;

  let nrVal = Number((rawNR * factor).toFixed(1));
  let sbrVal = Number((rawSBR * factor).toFixed(1));
  let cbVal = Number((rawCB * factor).toFixed(1));
  let silicaVal = Number((rawSilica * factor).toFixed(1));
  let steelVal = Number((rawSteel * factor).toFixed(1));
  let additivesVal = Number((rawAdditives * factor).toFixed(1));

  // Guarantee exact sum of 100.0%
  const currentSum = Number((nrVal + sbrVal + cbVal + silicaVal + steelVal + additivesVal).toFixed(1));
  const diff = Number((100.0 - currentSum).toFixed(1));
  if (diff !== 0) {
    nrVal = Number((nrVal + diff).toFixed(1));
  }

  const segments: Segment[] = [
    {
      id: 'nr',
      name: 'Doğal Kauçuk',
      abbr: 'NR',
      value: nrVal,
      color: '#10b981', // emerald
      desc: 'Yüksek yırtılma direnci, düşük iç ısınma. ~440-475°C piroliz krakingi.',
    },
    {
      id: 'sbr',
      name: 'Sentetik Kauçuk',
      abbr: 'SBR / BR',
      value: sbrVal,
      color: '#06b6d4', // cyan
      desc: 'Yol tutuş ve aşınma direnci polimeri. ~480-510°C termal ayrışma.',
    },
    {
      id: 'cb',
      name: 'Karbon Karası Dolgusu',
      abbr: 'Carbon Black',
      value: cbVal,
      color: '#a855f7', // purple
      desc: 'Sırt pekiştirici N220/N330 dolgu. Katı char fazında rCB olarak geri kazanılır.',
    },
    {
      id: 'silica',
      name: 'Silika Dolgusu',
      abbr: 'Silica (SiO₂)',
      value: silicaVal,
      color: '#f59e0b', // amber
      desc: 'Düşük yuvarlanma direnci katkısı. Char fazında kül fraksiyonunu oluşturur.',
    },
    {
      id: 'steel',
      name: 'Çelik Kord & Tel',
      abbr: 'Steel Wire',
      value: steelVal,
      color: '#94a3b8', // slate
      desc: 'Yüksek mukavemetli çelik kemerler. Piroliz sonrası manyetik separatörle ayrılır.',
    },
    {
      id: 'additives',
      name: 'Proses Yağları & Katkılar',
      abbr: 'Oils & ZnO/S',
      value: additivesVal,
      color: '#ec4899', // pink
      desc: 'Aromatik/naftenik proses yağları ve vulkanizasyon ajanları (ZnO, Kükürt).',
    },
  ];

  // SVG Donut calculation
  const total = 100;
  const size = 260;
  const strokeWidth = 36;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  const activeSegment = segments.find((s) => s.id === activeSegmentId) || segments[0];

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 sm:p-5 flex flex-col gap-5 shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Atom className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm sm:text-base">
              Kimyasal Kompozisyon &amp; Polimer Matrisi
            </h3>
            <p className="text-[11px] text-zinc-400 font-mono">
              Doğal Kauçuk (NR) / Sentetik (SBR) / Dolgu Matrisi Yüzdesel Dağılımı
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/70 border border-emerald-700/60 px-2 py-0.5 rounded">
            Tüm lastik kütlesi üzerinden %
          </span>
          <span className="text-[11px] font-mono text-zinc-300 bg-zinc-800/80 border border-zinc-700/60 px-2 py-0.5 rounded">
            Kütle Analizi
          </span>
        </div>
      </div>

      {/* Donut Chart & Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Donut SVG */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
          <div className="relative w-[240px] h-[240px] flex items-center justify-center">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="transform -rotate-90"
            >
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="#18181b"
                strokeWidth={strokeWidth}
              />
              {segments.map((seg) => {
                const strokeDasharray = `${(seg.value / total) * circumference} ${circumference}`;
                const strokeDashoffset = -((accumulatedPercent / total) * circumference);
                accumulatedPercent += seg.value;
                const isHovered = activeSegmentId === seg.id;

                return (
                  <circle
                    key={seg.id}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="cursor-pointer transition-all duration-300"
                    onMouseEnter={() => setActiveSegmentId(seg.id)}
                    style={{
                      opacity: activeSegmentId && !isHovered ? 0.6 : 1,
                      filter: isHovered ? 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.4))' : 'none',
                    }}
                  />
                );
              })}
            </svg>

            {/* Inner Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-4">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                {activeSegment.name}
              </span>
              <span className="text-2xl font-bold font-mono text-white tracking-tight">
                %{activeSegment.value}
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">
                {activeSegment.abbr}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-zinc-500 font-mono mt-1 text-center">
            *Dilimlere gelerek detaylı polimerik özellikleri inceleyebilirsiniz
          </div>
        </div>

        {/* Legend & Segment Breakdown */}
        <div className="lg:col-span-7 flex flex-col gap-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {segments.map((seg) => {
              const isSelected = activeSegmentId === seg.id;
              return (
                <div
                  key={seg.id}
                  onMouseEnter={() => setActiveSegmentId(seg.id)}
                  className={`p-2.5 rounded-lg border transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-emerald-500/70 bg-zinc-800/90 shadow-md'
                      : 'border-zinc-800/90 bg-zinc-950/60 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: seg.color }}
                      />
                      <span className="text-xs font-semibold text-zinc-200">
                        {seg.name}
                      </span>
                    </div>
                    <span className="font-mono text-sm font-bold text-white">
                      %{seg.value}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400 truncate">
                    {seg.desc}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Small info line under polymer values */}
          <div className="p-2.5 bg-zinc-950/80 border border-zinc-800/90 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-start sm:items-center gap-1.5 text-zinc-400 text-[11px] leading-relaxed">
              <Info className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0 mt-0.5 sm:mt-0" />
              <span>
                {polymerMatrix.estimationBasis ||
                  `Dayanak: ${data.tireClassification.subType || data.tireClassification.categoryNameTr} için sınıf bazlı tipik bileşim tahmini. Kesin ölçüm değildir.`}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 text-[11px] font-mono self-end sm:self-center">
              <span className="text-zinc-500">Tahmin güveni:</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
                  (polymerMatrix.estimationConfidence || (data.tireClassification.isBrandEstimated ? 'orta' : 'düşük')) === 'yüksek'
                    ? 'text-emerald-400 bg-emerald-950/70 border-emerald-700/80'
                    : (polymerMatrix.estimationConfidence || (data.tireClassification.isBrandEstimated ? 'orta' : 'düşük')) === 'orta'
                    ? 'text-amber-400 bg-amber-950/70 border-amber-700/80'
                    : 'text-zinc-400 bg-zinc-900 border-zinc-700'
                }`}
              >
                {polymerMatrix.estimationConfidence || (data.tireClassification.isBrandEstimated ? 'orta' : 'düşük')}
              </span>
            </div>
          </div>

          {/* Polymer Engineering Commentary */}
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-300">
            <div className="text-[10px] uppercase font-mono text-emerald-400 font-semibold mb-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Polimer Kimyası ve Termal Kırılma Notu:</span>
            </div>
            <p className="leading-relaxed text-zinc-300">
              Tespit edilen {data.tireClassification.categoryNameTr} için sınıf bazlı tahmin polimer matrisi: %{nrVal} NR (Doğal Kauçuk), %{sbrVal} SBR/BR, %{cbVal} Karbon Karası, %{silicaVal} Silika, %{steelVal} Çelik Tel ve %{additivesVal} Proses Yağları &amp; Katkılar. Toplam formülasyon %100 tam kütle dengesini sağlar.
            </p>
          </div>
        </div>
      </div>

      {/* Mass Balance (Kütle Dengesi) Tahmini Strip */}
      <div className="border-t border-zinc-800/80 pt-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Boxes className="w-3.5 h-3.5 text-emerald-400" />
            <span>Fırın Kütle Dengesi &amp; Çıktı Tahmini (Mass Balance)</span>
          </span>
          <span className="text-[10px] font-mono text-zinc-400">
            Toplam Girdi: {(massBalance.recoveredCarbonBlackKg + massBalance.pyrolyticOilKg + massBalance.pyrolyticGasKg + massBalance.scrapSteelKg).toLocaleString('tr-TR')} kg
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* rCB Char */}
          <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-lg p-2.5">
            <div className="text-[10px] font-mono text-emerald-400 uppercase">rCB Katı Karbon (Char)</div>
            <div className="text-base font-bold font-mono text-white mt-0.5">
              {massBalance.recoveredCarbonBlackKg.toLocaleString('tr-TR')} kg
            </div>
            <div className="text-[10px] text-emerald-300 font-mono">
              %{massBalance.recoveredCarbonBlackYieldPct.toFixed(1)} Verim
            </div>
          </div>

          {/* TPO Yağ */}
          <div className="bg-cyan-950/30 border border-cyan-800/50 rounded-lg p-2.5">
            <div className="text-[10px] font-mono text-cyan-400 uppercase">Pirolitik Yağ (TPO)</div>
            <div className="text-base font-bold font-mono text-white mt-0.5">
              {massBalance.pyrolyticOilKg.toLocaleString('tr-TR')} kg
            </div>
            <div className="text-[10px] text-cyan-300 font-mono">
              %{massBalance.pyrolyticOilYieldPct.toFixed(1)} Verim
            </div>
          </div>

          {/* Syngas Gaz */}
          <div className="bg-amber-950/30 border border-amber-800/50 rounded-lg p-2.5">
            <div className="text-[10px] font-mono text-amber-400 uppercase">Pirolitik Gaz (Syngas)</div>
            <div className="text-base font-bold font-mono text-white mt-0.5">
              {massBalance.pyrolyticGasKg.toLocaleString('tr-TR')} kg
            </div>
            <div className="text-[10px] text-amber-300 font-mono">
              %{massBalance.pyrolyticGasYieldPct.toFixed(1)} Verim
            </div>
          </div>

          {/* Çelik Tel */}
          <div className="bg-zinc-800/40 border border-zinc-700/60 rounded-lg p-2.5">
            <div className="text-[10px] font-mono text-zinc-400 uppercase">Hurda Çelik Tel</div>
            <div className="text-base font-bold font-mono text-white mt-0.5">
              {massBalance.scrapSteelKg.toLocaleString('tr-TR')} kg
            </div>
            <div className="text-[10px] text-zinc-400 font-mono">
              %{massBalance.scrapSteelYieldPct.toFixed(1)} Verim
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
