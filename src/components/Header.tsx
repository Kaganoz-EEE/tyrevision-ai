import React from 'react';
import { PlantSummaryStats } from '../types/tire';
import { 
  Factory, 
  Flame, 
  Leaf, 
  ShieldCheck, 
  Activity, 
  Layers, 
  Clock,
  Cpu
} from 'lucide-react';

interface HeaderProps {
  stats: PlantSummaryStats;
  currentReactor: string;
}

export const Header: React.FC<HeaderProps> = ({ stats, currentReactor }) => {
  const [timeStr, setTimeStr] = React.useState<string>('');

  React.useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/95 backdrop-blur sticky top-0 z-40">
      {/* Top Banner / SCADA Status Strip */}
      <div className="px-4 py-1.5 bg-zinc-900/90 border-b border-zinc-800/80 flex flex-wrap items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-emerald-400 font-semibold tracking-wider">
              PROTOTİP · KARAR DESTEK
            </span>
          </div>
          <span className="text-zinc-600">|</span>
          <div className="flex items-center space-x-1.5">
            <Factory className="w-3.5 h-3.5 text-zinc-400" />
            <span>Hedef Hat: <strong className="text-zinc-200">Örnek Reaktör (Simülasyon)</strong></span>
          </div>
          <span className="hidden sm:inline text-zinc-600">|</span>
          <div className="hidden sm:flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>ISO 14001 prensiplerine uyumlu tasarım</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1 text-zinc-300 font-mono">
            <Clock className="w-3.5 h-3.5 text-emerald-500" />
            <span>{timeStr || '10:45:00'}</span>
          </div>
          <div className="hidden md:flex items-center space-x-1 text-emerald-400/90 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
            <Cpu className="w-3 h-3" />
            <span>Gemini Vision</span>
          </div>
        </div>
      </div>

      {/* Main Brand Title & KPI Cards */}
      <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Brand Logo & Name */}
        <div className="flex items-center space-x-3.5">
          <div className="relative w-11 h-11 rounded-lg bg-gradient-to-br from-emerald-500/20 via-zinc-900 to-zinc-950 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-950/50">
            <Flame className="w-6 h-6 text-emerald-400" />
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-zinc-950 flex items-center justify-center">
              <span className="w-1.5 h-1.5 bg-white rounded-full" />
            </span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold tracking-wider">
                ÖTL DÖNGÜSEL EKONOMİ
              </span>
              <span className="text-xs text-zinc-400 font-mono">Climathon Prototipi</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              TyreVision AI
              <span className="text-emerald-400 font-light text-sm sm:text-base hidden sm:inline">
                | ÖTL Piroliz &amp; rCB Karar Destek Paneli
              </span>
            </h1>
            <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
              Çipsiz lastikler için görsel tanıma tabanlı geri dönüşüm yönlendirme
            </p>
          </div>
        </div>

        {/* Live Statistics Cards */}
        <div className="flex flex-col gap-1 sm:w-auto w-full">
          <div className="grid grid-cols-3 gap-2 sm:gap-3.5">
            {/* Stat 1: Analiz Edilen Numune Sayısı */}
            <div className="bg-zinc-900/90 border border-zinc-800/90 rounded-lg p-2.5 sm:px-4 sm:py-2.5 flex items-center space-x-3 shadow-inner">
              <div className="w-9 h-9 rounded-md bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
                <Activity className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-[11px] text-zinc-400 font-medium">Analiz Edilen Numune</div>
                <div className="text-base sm:text-lg font-bold font-mono text-white tracking-wide">
                  {stats.scannedTireCount > 0 ? stats.scannedTireCount.toLocaleString('tr-TR') : '0'}
                  <span className="text-[10px] text-zinc-500 font-normal ml-1">adet</span>
                </div>
              </div>
            </div>

            {/* Stat 2: Ortalama rCB Saflık Oranı */}
            <div className="bg-zinc-900/90 border border-zinc-800/90 rounded-lg p-2.5 sm:px-4 sm:py-2.5 flex items-center space-x-3 shadow-inner">
              <div className="w-9 h-9 rounded-md bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-zinc-400 font-medium">Ort. rCB Saflığı</div>
                <div className="text-base sm:text-lg font-bold font-mono text-emerald-400 tracking-wide">
                  {stats.avgRcbPurityPct > 0 ? `%${stats.avgRcbPurityPct.toFixed(1)}` : '—'}
                  {stats.avgRcbPurityPct > 0 && <span className="text-[10px] text-emerald-600 font-normal ml-1">ASTM</span>}
                </div>
              </div>
            </div>

            {/* Stat 3: Senaryo CO₂ (parti başına) */}
            <div className="bg-zinc-900/90 border border-zinc-800/90 rounded-lg p-2.5 sm:px-4 sm:py-2.5 flex items-center space-x-3 shadow-inner">
              <div className="w-9 h-9 rounded-md bg-teal-950/60 border border-teal-800/50 flex items-center justify-center text-teal-400">
                <Leaf className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-zinc-400 font-medium">Senaryo CO₂ (parti başına)</div>
                <div className="text-base sm:text-lg font-bold font-mono text-teal-300 tracking-wide">
                  {stats.preventedCo2Tons > 0 ? stats.preventedCo2Tons.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) : '0,0'}
                  <span className="text-[10px] text-teal-600 font-normal ml-1">Ton</span>
                </div>
              </div>
            </div>
          </div>
          <div className="text-[10px] text-zinc-500 font-mono text-right pr-1">
            Oturum verisi
          </div>
        </div>
      </div>
    </header>
  );
};
