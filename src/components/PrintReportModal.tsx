import React from 'react';
import { TireAnalysisResult } from '../types/tire';
import { Printer, X, Download, ShieldCheck, Factory } from 'lucide-react';

interface PrintReportModalProps {
  data: TireAnalysisResult;
  onClose: () => void;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({ data, onClose }) => {
  const { tireClassification, polymerMatrix, massBalance, thermalRecipe, rcbQualityEstimate } = data;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-3xl w-full p-4 sm:p-6 flex flex-col gap-4 shadow-2xl my-auto text-zinc-200">
        {/* Top Control Bar (Hidden on print) */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3 print:hidden">
          <div className="flex items-center space-x-2">
            <Factory className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-white text-sm">Taslak Piroliz Raporu Önizleme</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Yazdır / PDF Olarak Kaydet</span>
            </button>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white p-1 rounded transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Formal Sheet */}
        <div className="bg-white text-zinc-900 p-6 sm:p-8 rounded-lg shadow-inner font-sans print:p-0 print:shadow-none text-xs leading-normal">
          {/* Company & Document Header */}
          <div className="flex items-start justify-between border-b-2 border-zinc-900 pb-4 mb-4">
            <div>
              <div className="text-[10px] tracking-wider uppercase font-mono font-bold text-emerald-700">
                TYREVISION AI — AR-GE &amp; GERİ DÖNÜŞÜM DİREKTÖRLÜĞÜ
              </div>
              <h1 className="text-lg font-extrabold uppercase tracking-tight text-zinc-950 mt-1">
                Ömrünü Tamamlamış Lastik (ÖTL) Piroliz &amp; rCB Kalite Reçetesi
              </h1>
              <div className="text-zinc-500 text-[11px] mt-0.5">
                Doküman No: TVAI-OTL-2026-REC-{data.analysisId} | Rev: 02 | ISO 14001:2015
              </div>
            </div>
            <div className="text-right font-mono text-[11px] text-zinc-600">
              <div><strong>Tarih:</strong> {new Date(data.timestamp).toLocaleDateString('tr-TR')}</div>
              <div><strong>Fırın:</strong> {thermalRecipe.reactorId}</div>
              <div><strong>Analiz ID:</strong> {data.analysisId}</div>
            </div>
          </div>

          {/* Section 1: Tire Classification & Tread Diagnostics */}
          <div className="mb-4">
            <h2 className="font-bold text-xs uppercase tracking-wide bg-zinc-100 p-1.5 border-l-4 border-emerald-600 text-zinc-900 mb-2">
              1. Lastik Sınıflandırma ve Fiziksel Durum Tespiti
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-zinc-50 p-2.5 rounded border border-zinc-200">
              <div>
                <span className="text-zinc-500 block text-[10px]">Tespit Edilen Sınıf:</span>
                <strong className="text-zinc-950">{tireClassification.categoryNameTr}</strong>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">Aşınma Oranı:</span>
                <strong className="text-zinc-950">%{tireClassification.estimatedWearRate}</strong>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">Kalan Diş Derinliği:</span>
                <strong className="text-zinc-950">{tireClassification.remainingTreadDepthMm.toFixed(1)} mm</strong> (İlk: {tireClassification.originalTreadDepthMm !== null && tireClassification.originalTreadDepthMm !== undefined ? `${tireClassification.originalTreadDepthMm} mm` : 'belirsiz'})
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">Karkas / Kord Durumu:</span>
                <strong className="text-zinc-950">{tireClassification.carcassCondition}</strong>
              </div>
            </div>
          </div>

          {/* Section 2: Chemical & Polymer Matrix */}
          <div className="mb-4">
            <h2 className="font-bold text-xs uppercase tracking-wide bg-zinc-100 p-1.5 border-l-4 border-emerald-600 text-zinc-900 mb-2">
              2. Polimer Matrisi ve Tahmini Kütle Dengesi
            </h2>
            <table className="w-full border-collapse border border-zinc-300 text-[11px]">
              <thead className="bg-zinc-100 text-zinc-800">
                <tr>
                  <th className="border border-zinc-300 p-1.5 text-left">Bileşen Adı</th>
                  <th className="border border-zinc-300 p-1.5 text-center">Formülasyon (%)</th>
                  <th className="border border-zinc-300 p-1.5 text-left">Piroliz Sonrası Çıktı Türü</th>
                  <th className="border border-zinc-300 p-1.5 text-right">Tahmini Kütle (kg)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-zinc-300 p-1.5 font-medium">Doğal Kauçuk (NR)</td>
                  <td className="border border-zinc-300 p-1.5 text-center font-mono">%{polymerMatrix.naturalRubberNR}</td>
                  <td className="border border-zinc-300 p-1.5">Geri Kazanılmış Karbon Karası (rCB)</td>
                  <td className="border border-zinc-300 p-1.5 text-right font-mono font-bold text-emerald-700">
                    {massBalance.recoveredCarbonBlackKg} kg (%{massBalance.recoveredCarbonBlackYieldPct})
                  </td>
                </tr>
                <tr>
                  <td className="border border-zinc-300 p-1.5 font-medium">Sentetik Kauçuk (SBR / BR)</td>
                  <td className="border border-zinc-300 p-1.5 text-center font-mono">%{polymerMatrix.syntheticRubberSBR_BR}</td>
                  <td className="border border-zinc-300 p-1.5">Pirolitik Yağ (TPO Ağır &amp; Hafif Fraksiyon)</td>
                  <td className="border border-zinc-300 p-1.5 text-right font-mono font-bold text-cyan-700">
                    {massBalance.pyrolyticOilKg} kg (%{massBalance.pyrolyticOilYieldPct})
                  </td>
                </tr>
                <tr>
                  <td className="border border-zinc-300 p-1.5 font-medium">Dolgu Maddeleri (Karbon Karası &amp; Silika)</td>
                  <td className="border border-zinc-300 p-1.5 text-center font-mono">%{polymerMatrix.carbonBlackFiller + polymerMatrix.silicaFiller}</td>
                  <td className="border border-zinc-300 p-1.5">Pirolitik Gaz (Syngas - Fırın Öz Tüketimi)</td>
                  <td className="border border-zinc-300 p-1.5 text-right font-mono font-bold text-amber-700">
                    {massBalance.pyrolyticGasKg} kg (%{massBalance.pyrolyticGasYieldPct})
                  </td>
                </tr>
                <tr>
                  <td className="border border-zinc-300 p-1.5 font-medium">Çelik Kord &amp; Takviye Telleri</td>
                  <td className="border border-zinc-300 p-1.5 text-center font-mono">%{polymerMatrix.steelWireRatio}</td>
                  <td className="border border-zinc-300 p-1.5">Hurda Çelik Kord (Manyetik Ayrıştırma)</td>
                  <td className="border border-zinc-300 p-1.5 text-right font-mono font-bold text-zinc-700">
                    {massBalance.scrapSteelKg} kg (%{massBalance.scrapSteelYieldPct})
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 3: Thermal Reactor Recipe */}
          <div className="mb-4">
            <h2 className="font-bold text-xs uppercase tracking-wide bg-zinc-100 p-1.5 border-l-4 border-emerald-600 text-zinc-900 mb-2">
              3. Onaylanmış Piroliz Fırın Reçetesi (Reaktör Parametreleri)
            </h2>
            <div className="grid grid-cols-4 gap-2 mb-2 font-mono text-[11px] bg-zinc-50 p-2 border border-zinc-200">
              <div><strong>Fırın Sıcaklığı:</strong> {thermalRecipe.optimalReactorTempC} °C</div>
              <div><strong>Isıtma Rampası:</strong> {thermalRecipe.heatingRampRateCPerMin} °C/dk</div>
              <div><strong>Reaksiyon Süresi:</strong> {thermalRecipe.totalResidenceTimeMin} dk</div>
              <div><strong>N₂ Debisi / Vakum:</strong> {thermalRecipe.nitrogenPurgeRateNm3H} Nm³/h ({thermalRecipe.vacuumLevelMbar} mbar)</div>
            </div>
          </div>

          {/* Section 4: rCB Output Quality Specification */}
          <div className="mb-6">
            <h2 className="font-bold text-xs uppercase tracking-wide bg-zinc-100 p-1.5 border-l-4 border-emerald-600 text-zinc-900 mb-2">
              4. rCB Kalite &amp; Standart Eşdeğerlik Raporu
            </h2>
            <div className="grid grid-cols-3 gap-2 bg-zinc-50 p-2.5 rounded border border-zinc-200 text-[11px]">
              <div><strong>rCB Karbon Saflığı:</strong> %{rcbQualityEstimate.purityPercentage.toFixed(1)}</div>
              <div><strong>BET Yüzey Alanı:</strong> {rcbQualityEstimate.betSurfaceAreaM2g} m²/g (ASTM D6556)</div>
              <div><strong>Kül Miktarı:</strong> %{rcbQualityEstimate.ashContentPct.toFixed(1)}</div>
              <div><strong>Uçucu Madde:</strong> %{rcbQualityEstimate.volatileMatterPct.toFixed(1)} (ASTM D1620)</div>
              <div><strong>İyot Sayısı:</strong> {rcbQualityEstimate.iodineAdsorptionNo} mg/g (ASTM D1510)</div>
              <div><strong>Eşdeğer Sınıf:</strong> {rcbQualityEstimate.equivalentGrade}</div>
            </div>
            <div className="mt-2 text-zinc-600 text-[10px]">
              <strong>Önlenen CO₂:</strong> {rcbQualityEstimate.co2SavingsTonPerBatch} Ton | <strong>Ekonomik Değer:</strong> ${rcbQualityEstimate.economicValuePerTonUsd} / Ton rCB
            </div>
          </div>

          {/* Approval Signatures */}
          <div className="grid grid-cols-3 gap-6 pt-4 border-t-2 border-zinc-800 text-center text-[10px] font-sans">
            <div>
              <div className="font-bold text-zinc-900">Operatör &amp; Saha Sorumlusu</div>
              <div className="h-10 border-b border-dashed border-zinc-400 mt-1 mb-1" />
              <div className="text-zinc-500">İmza / Tarih</div>
            </div>
            <div>
              <div className="font-bold text-zinc-900">Polimer &amp; Piroliz Proses Mühendisi</div>
              <div className="h-10 border-b border-dashed border-zinc-400 mt-1 mb-1" />
              <div className="text-zinc-500">İmza / Onay</div>
            </div>
            <div>
              <div className="font-bold text-zinc-900">Tesis Teknik Direktörü</div>
              <div className="h-10 border-b border-dashed border-zinc-400 mt-1 mb-1" />
              <div className="text-zinc-500">Mühür / Onay</div>
            </div>
          </div>

          <div className="mt-3 text-zinc-500 text-[9px] italic text-center border-t border-zinc-200 pt-2 font-mono">
            * Genel bilgilendirmedir; tesis SOP/HAZOP yerine geçmez.
          </div>
        </div>
      </div>
    </div>
  );
};
