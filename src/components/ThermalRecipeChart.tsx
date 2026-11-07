import React, { useState } from 'react';
import { TireAnalysisResult, TemperatureCurvePoint } from '../types/tire';
import { 
  Flame, 
  Clock, 
  TrendingUp, 
  Wind, 
  Gauge, 
  ShieldAlert, 
  CheckCircle2, 
  Maximize2,
  Sliders,
  Send
} from 'lucide-react';

interface ThermalRecipeChartProps {
  data: TireAnalysisResult;
  onSendToPlc?: () => void;
}

export const ThermalRecipeChart: React.FC<ThermalRecipeChartProps> = ({ data, onSendToPlc }) => {
  const { thermalRecipe } = data;
  const phases = thermalRecipe.phases || [];
  const [hoveredPoint, setHoveredPoint] = useState<TemperatureCurvePoint | null>(null);

  // Requirement 2: The total reaction time must equal the sum of the phase durations shown.
  // Compute total in code and draw the curve from the same phase values.
  const computedTotalMinutes = phases.reduce((acc, p) => acc + (p.durationMin || 0), 0) || thermalRecipe.totalResidenceTimeMin || 115;

  const points: TemperatureCurvePoint[] = React.useMemo(() => {
    if (!phases || phases.length === 0) {
      return thermalRecipe.temperatureProfileCurve || [];
    }
    const pts: TemperatureCurvePoint[] = [];
    let currentMinute = 0;
    let currentTemp = 25;

    pts.push({
      minute: 0,
      temperatureC: currentTemp,
      phaseLabel: 'Başlangıç',
      pressureMbar: -15,
    });

    for (const ph of phases) {
      const startM = currentMinute;
      const endM = currentMinute + ph.durationMin;
      const startT = currentTemp;
      const targetT = ph.targetTempC;
      const pMbar = ph.phaseName.includes('Faz 3') ? -32 : ph.phaseName.includes('Faz 2') ? -25 : ph.phaseName.includes('Faz 4') ? -20 : -18;

      const step = ph.durationMin > 25 ? 10 : Math.max(5, Math.round(ph.durationMin / 2));
      for (let m = startM + step; m < endM; m += step) {
        const progress = (m - startM) / ph.durationMin;
        const interpT = Math.round(startT + (targetT - startT) * progress);
        pts.push({
          minute: m,
          temperatureC: interpT,
          phaseLabel: ph.phaseName,
          pressureMbar: pMbar,
        });
      }

      currentMinute = endM;
      currentTemp = targetT;
      pts.push({
        minute: currentMinute,
        temperatureC: currentTemp,
        phaseLabel: ph.phaseName,
        pressureMbar: pMbar,
      });
    }

    return pts;
  }, [phases, thermalRecipe.temperatureProfileCurve]);

  // SVG dimensions for Line Chart
  const svgWidth = 720;
  const svgHeight = 260;
  const padding = { top: 25, right: 30, bottom: 40, left: 55 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  const maxMinutes = computedTotalMinutes;
  const minTemp = 0;
  const maxTemp = 600;

  // Scale functions
  const scaleX = (minute: number) => padding.left + (minute / maxMinutes) * chartWidth;
  const scaleY = (temp: number) => padding.top + chartHeight - ((temp - minTemp) / (maxTemp - minTemp)) * chartHeight;

  // Build SVG path
  const pathD = points.reduce((acc, pt, index) => {
    const x = scaleX(pt.minute);
    const y = scaleY(pt.temperatureC);
    if (index === 0) return `M ${x} ${y}`;
    // Smooth bezier curve or linear segment
    const prev = points[index - 1];
    const prevX = scaleX(prev.minute);
    const prevY = scaleY(prev.temperatureC);
    const cpX1 = prevX + (x - prevX) / 2;
    const cpX2 = prevX + (x - prevX) / 2;
    return `${acc} C ${cpX1} ${prevY}, ${cpX2} ${y}, ${x} ${y}`;
  }, '');

  // Fill area under path
  const fillD = points.length > 0
    ? `${pathD} L ${scaleX(points[points.length - 1].minute)} ${scaleY(0)} L ${scaleX(points[0].minute)} ${scaleY(0)} Z`
    : '';

  // Temperature Y grid lines (every 100°C)
  const yTicks = [100, 200, 300, 400, 500, 600];
  // Time X grid lines
  const xTicks = points.filter((_, idx) => idx % 2 === 0).map((p) => p.minute);

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 sm:p-5 flex flex-col gap-5 shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm sm:text-base">
              Piroliz Termal Reçetesi &amp; Fırın Reaksiyon Eğrisi
            </h3>
            <p className="text-[11px] text-zinc-400 font-mono">
              Fırın ID: {thermalRecipe.reactorId} | Isıtma Profili (°C / dk)
            </p>
          </div>
        </div>

        {onSendToPlc && (
          <button
            onClick={onSendToPlc}
            className="text-xs bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold px-3 py-1.5 rounded-lg border border-emerald-400 flex items-center gap-1.5 shadow-md transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Reçeteyi Operatöre Gönder (Taslak)</span>
          </button>
        )}
      </div>

      {/* Engineering KPI 4-Card Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Optimum Sıcaklık */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
            <span>Optimum Fırın Sıcaklığı</span>
            <Flame className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-rose-400">
            {thermalRecipe.optimalReactorTempC}°C
          </div>
          <div className="text-[10px] text-zinc-500 font-mono mt-1">
            İzotermal Piroliz Fazı
          </div>
        </div>

        {/* Isıtma Rampası */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
            <span>Isıtma Rampası</span>
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400">
            {thermalRecipe.heatingRampRateCPerMin}°C/dk
          </div>
          <div className="text-[10px] text-zinc-500 font-mono mt-1">
            Kontrollü Depolimerizasyon
          </div>
        </div>

        {/* Kalma ve Gaz Tahliye Süresi */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
            <span>Reaksiyon Kalma Süresi</span>
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
            {computedTotalMinutes} dk
          </div>
          <div className="text-[10px] text-zinc-500 font-mono mt-1">
            Tahliye: {thermalRecipe.volatileEvacuationTimeMin} dk
          </div>
        </div>

        {/* Fırın Atmosferi */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
            <span>N₂ Debisi &amp; Vakum</span>
            <Wind className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-cyan-400">
            {thermalRecipe.nitrogenPurgeRateNm3H} <span className="text-sm font-normal text-zinc-400">Nm³/h</span>
          </div>
          <div className="text-[10px] text-zinc-500 font-mono mt-1">
            Vakum: {thermalRecipe.vacuumLevelMbar} mbar
          </div>
        </div>
      </div>

      {/* Advanced Interactive Thermal Profile Line Chart */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 sm:p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-zinc-300">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">Termal Reçete Eğrisi (Sıcaklık - Zaman Profili)</span>
            <span className="w-2.5 h-0.5 bg-amber-400 inline-block rounded" />
          </div>
          {hoveredPoint ? (
            <div className="font-mono text-[11px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
              {hoveredPoint.minute}. dk : <strong className="text-white">{hoveredPoint.temperatureC}°C</strong> | {hoveredPoint.phaseLabel} ({hoveredPoint.pressureMbar} mbar)
            </div>
          ) : (
            <span className="text-[11px] text-zinc-400 font-mono">
              *Noktaların üzerine gelerek anlık değerleri görüntüleyin
            </span>
          )}
        </div>

        {/* Responsive SVG Chart Container */}
        <div className="w-full overflow-x-auto">
          <div className="min-w-[580px]">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto overflow-visible select-none"
            >
              <defs>
                <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                  <stop offset="70%" stopColor="#10b981" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              {/* Background Horizontal Grid & Y Axis Labels */}
              {yTicks.map((t) => {
                const y = scaleY(t);
                return (
                  <g key={t}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={svgWidth - padding.right}
                      y2={y}
                      stroke="#27272a"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x={padding.left - 10}
                      y={y + 4}
                      fill="#71717a"
                      fontSize="10"
                      fontFamily="monospace"
                      textAnchor="end"
                    >
                      {t}°C
                    </text>
                  </g>
                );
              })}

              {/* Background Vertical Grid & X Axis Labels (Minutes) */}
              {xTicks.map((m) => {
                const x = scaleX(m);
                return (
                  <g key={m}>
                    <line
                      x1={x}
                      y1={padding.top}
                      x2={x}
                      y2={svgHeight - padding.bottom}
                      stroke="#1e1e24"
                      strokeWidth="1"
                    />
                    <text
                      x={x}
                      y={svgHeight - padding.bottom + 16}
                      fill="#71717a"
                      fontSize="10"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {m} dk
                    </text>
                  </g>
                );
              })}

              {/* Shaded Area Under Curve */}
              {fillD && <path d={fillD} fill="url(#tempGradient)" />}

              {/* Main Temperature Line */}
              <path
                d={pathD}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Pyrolysis High Devolatilization Zone Highlight Bar */}
              <rect
                x={scaleX(30)}
                y={scaleY(520)}
                width={scaleX(80) - scaleX(30)}
                height={scaleY(380) - scaleY(520)}
                fill="#f59e0b"
                fillOpacity="0.08"
                stroke="#f59e0b"
                strokeDasharray="3 3"
                strokeWidth="1"
                rx="4"
              />
              <text
                x={scaleX(55)}
                y={scaleY(525)}
                fill="#f59e0b"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                PİK GAZ &amp; TPO SALINIM ARALIĞI (380°C - 480°C)
              </text>

              {/* Data Points on Curve with Hover Action */}
              {points.map((pt, idx) => {
                const cx = scaleX(pt.minute);
                const cy = scaleY(pt.temperatureC);
                const isHovered = hoveredPoint?.minute === pt.minute;

                return (
                  <g key={idx}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? 6 : 4}
                      fill={isHovered ? '#10b981' : '#f59e0b'}
                      stroke="#09090b"
                      strokeWidth="2"
                      className="cursor-pointer transition-all"
                      onMouseEnter={() => setHoveredPoint(pt)}
                    />
                    {isHovered && (
                      <line
                        x1={cx}
                        y1={padding.top}
                        x2={cx}
                        y2={svgHeight - padding.bottom}
                        stroke="#10b981"
                        strokeDasharray="2 2"
                        strokeWidth="1"
                      />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* 4-Aşamalı Fırın Reaksiyon Tablosu */}
      <div className="flex flex-col gap-2">
        <div className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
          <span>Reaksiyon Fazları &amp; Operasyonel Adımlar:</span>
          <span className="text-[11px] font-mono text-zinc-400">4 Aşama</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {thermalRecipe.phases.map((ph, idx) => (
            <div
              key={idx}
              className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-emerald-400 font-mono">
                  {ph.phaseName}
                </span>
                <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                  {ph.durationMin} dk | Hedef: {ph.targetTempC}°C
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {ph.actionTr}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Engineering Safety Directives */}
      <div className="bg-amber-950/20 border border-amber-800/40 rounded-lg p-3 flex flex-col gap-1.5 text-xs">
        <div className="text-amber-400 font-bold flex items-center gap-1.5 font-mono text-[11px] uppercase">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Mühendislik &amp; İş Güvenliği Direktifleri:</span>
        </div>
        <ul className="space-y-1 text-zinc-300 text-[11px]">
          {thermalRecipe.engineeringSafetyNotes.map((note, idx) => (
            <li key={idx} className="flex items-start gap-1.5">
              <span className="text-amber-500 font-bold">•</span>
              <span>{note}</span>
            </li>
          ))}
        </ul>
        <div className="text-[10px] text-amber-400/90 italic font-mono pt-1.5 border-t border-amber-800/30">
          * Genel bilgilendirmedir; tesis SOP/HAZOP yerine geçmez.
        </div>
      </div>
    </div>
  );
};
