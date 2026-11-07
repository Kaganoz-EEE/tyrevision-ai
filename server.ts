import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Google GenAI with required telemetry headers
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export interface TireAnalysisInput {
  imageBase64?: string;
  mimeType?: string;
  batchWeightKg: number;
  reactorId: string;
  optimizationPriority: 'rcb_purity' | 'balanced' | 'fast_cycle';
  moistureLevel?: 'dry' | 'moderate' | 'wet';
  notes?: string;
}

export interface TireAnalysisResult {
  analysisId: string;
  timestamp: string;
  tireClassification: {
    category: 'TRUCK_BUS_TBR' | 'PASSENGER_SUMMER' | 'PASSENGER_WINTER' | 'SUV_ALL_TERRAIN' | 'HEAVY_INDUSTRIAL_OTR';
    categoryNameTr: string;
    subType: string;
    confidence: number | null;
    estimatedWearRate: number;
    remainingTreadDepthMm: number;
    originalTreadDepthMm: number | null;
    carcassCondition: 'EXCELLENT' | 'GOOD' | 'PARTIAL_EXPOSURE' | 'STEEL_CORD_EXPOSED';
    patternFeatures: string[];
    visualInspectionNotes: string;
    isBrandEstimated?: boolean;
  };
  polymerMatrix: {
    naturalRubberNR: number;
    syntheticRubberSBR_BR: number;
    carbonBlackFiller: number;
    silicaFiller: number;
    steelWireRatio: number;
    processOilsAndAdditives: number;
    zincOxideAndSulfur: number;
    matrixComment: string;
    estimationBasis?: string;
    estimationConfidence?: 'yüksek' | 'orta' | 'düşük';
  };
  massBalance: {
    recoveredCarbonBlackKg: number;
    recoveredCarbonBlackYieldPct: number;
    pyrolyticOilKg: number;
    pyrolyticOilYieldPct: number;
    pyrolyticGasKg: number;
    pyrolyticGasYieldPct: number;
    scrapSteelKg: number;
    scrapSteelYieldPct: number;
  };
  thermalRecipe: {
    reactorId: string;
    optimalReactorTempC: number;
    heatingRampRateCPerMin: number;
    totalResidenceTimeMin: number;
    volatileEvacuationTimeMin: number;
    nitrogenPurgeRateNm3H: number;
    vacuumLevelMbar: number;
    phases: Array<{
      phaseName: string;
      targetTempC: number;
      durationMin: number;
      actionTr: string;
    }>;
    temperatureProfileCurve: Array<{
      minute: number;
      temperatureC: number;
      phaseLabel: string;
      pressureMbar: number;
    }>;
    engineeringSafetyNotes: string[];
  };
  rcbQualityEstimate: {
    purityPercentage: number;
    carbonContentPct: number;
    ashContentPct: number;
    volatileMatterPct: number;
    betSurfaceAreaM2g: number;
    iodineAdsorptionNo: number;
    equivalentGrade: string;
    industrialSuitability: string[];
    economicValuePerTonUsd: number;
    co2SavingsTonPerBatch: number;
    qualityVerdictTr: string;
    contaminationLevel?: 'düşük' | 'orta' | 'yüksek';
  };
  analysisSource: 'gemini-vision';
  isUploadedImageAnalysis: boolean;
  modelUsed?: string;
  isTire?: boolean;
  rejectReason?: string;
  uploadedImageDetails?: {
    resolution?: string;
    detectedVehicleType?: string;
    treadPatternType?: string;
    grooveContrastPct?: number;
    visualConfidence?: number;
  };
}

// Build continuous engineering thermal curve points strictly from the recipe phases
function buildCurveFromPhases(phases: Array<{ phaseName: string; targetTempC: number; durationMin: number; actionTr: string }>, startTemp: number = 25) {
  const points: Array<{ minute: number; temperatureC: number; phaseLabel: string; pressureMbar: number }> = [];
  let currentMinute = 0;
  let currentTemp = startTemp;

  points.push({
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
      points.push({
        minute: m,
        temperatureC: interpT,
        phaseLabel: ph.phaseName,
        pressureMbar: pMbar,
      });
    }

    currentMinute = endM;
    currentTemp = targetT;
    points.push({
      minute: currentMinute,
      temperatureC: currentTemp,
      phaseLabel: ph.phaseName,
      pressureMbar: pMbar,
    });
  }

  return points;
}

// Helper functions to preserve 0 and strictly check finite numbers
function parseFinite(val: any, fallback: number): number {
  if (typeof val === 'number') return Number.isFinite(val) ? val : fallback;
  if (typeof val === 'string' && val.trim() !== '') {
    const num = Number(val);
    return Number.isFinite(num) ? num : fallback;
  }
  return fallback;
}

function parseFiniteOrNull(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  if (typeof val === 'string' && val.trim() !== '') {
    const num = Number(val);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

// Strict JSON parser to handle markdown fences and slice to outermost braces
function cleanAndParseJson(raw: string): any {
  let str = (raw || '').trim();

  // Strip markdown code fences if wrapped
  str = str.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  str = str.replace(/```json/gi, '').replace(/```/g, '').trim();

  // Extract outermost JSON block
  const firstBrace = str.indexOf('{');
  const lastBrace = str.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    str = str.slice(firstBrace, lastBrace + 1);
  }

  return JSON.parse(str);
}

const responseSchema = {
  type: 'object',
  properties: {
    isTire: {
      type: 'boolean',
      description: 'Görselde araç lastiği (sırt, yanak, karkas veya kesit) tespit edildi mi?',
    },
    rejectReason: {
      type: 'string',
      description: 'Görsel lastik değilse veya tespit edilemediyse Türkçe ret gerekçesi; lastik ise boş string.',
    },
    category: {
      type: 'string',
      enum: [
        'TRUCK_BUS_TBR',
        'PASSENGER_SUMMER',
        'PASSENGER_WINTER',
        'SUV_ALL_TERRAIN',
        'HEAVY_INDUSTRIAL_OTR',
      ],
      description: 'Lastik kategorisi',
    },
    categoryNameTr: { type: 'string', description: 'Türkçe kategori adı' },
    subType: { type: 'string', description: 'Alt desen veya ebat' },
    isBrandEstimated: { type: 'boolean' },
    confidence: { type: 'number', description: 'Tespit güveni 0-100 veya boş/belirsiz' },
    estimatedWearRate: { type: 'number', description: 'Aşınma oranı %' },
    remainingTreadDepthMm: { type: 'number', description: 'Kalan diş derinliği mm' },
    originalTreadDepthMm: { type: 'number', description: 'Orijinal diş derinliği mm' },
    carcassCondition: {
      type: 'string',
      enum: ['EXCELLENT', 'GOOD', 'PARTIAL_EXPOSURE', 'STEEL_CORD_EXPOSED'],
    },
    patternFeatures: {
      type: 'array',
      items: { type: 'string' },
    },
    visualInspectionNotes: { type: 'string' },
    contaminationLevel: {
      type: 'string',
      enum: ['düşük', 'orta', 'yüksek'],
      description: 'Çamur, toprak veya mineral kirlilik düzeyi',
    },
    naturalRubberNR: { type: 'number' },
    syntheticRubberSBR_BR: { type: 'number' },
    carbonBlackFiller: { type: 'number' },
    silicaFiller: { type: 'number' },
    steelWireRatio: { type: 'number' },
    processOilsAndAdditives: { type: 'number' },
    zincOxideAndSulfur: { type: 'number' },
    estimationBasis: { type: 'string' },
    estimationConfidence: {
      type: 'string',
      enum: ['yüksek', 'orta', 'düşük'],
    },
    optimalReactorTempC: { type: 'number' },
    heatingRampRateCPerMin: { type: 'number' },
    totalResidenceTimeMin: { type: 'number' },
    volatileEvacuationTimeMin: { type: 'number' },
    nitrogenPurgeRateNm3H: { type: 'number' },
    rcbPurityPct: { type: 'number' },
    betSurfaceAreaM2g: { type: 'number' },
    iodineAdsorptionNo: { type: 'number' },
    equivalentGrade: { type: 'string' },
    industrialSuitability: {
      type: 'array',
      items: { type: 'string' },
    },
    economicValuePerTonUsd: { type: 'number' },
    qualityVerdictTr: { type: 'string' },
  },
  required: [
    'isTire',
    'rejectReason',
    'category',
    'carcassCondition',
    'contaminationLevel',
    'estimationConfidence',
  ],
};

const ALLOWED_CATEGORIES = [
  'TRUCK_BUS_TBR',
  'PASSENGER_SUMMER',
  'PASSENGER_WINTER',
  'SUV_ALL_TERRAIN',
  'HEAVY_INDUSTRIAL_OTR',
] as const;

// Multimodal Vision API Endpoint: Evaluates uploaded image pixels dynamically with Gemini Vision
app.post('/api/analyze-tire', async (req: Request, res: Response) => {
  try {
    const input: TireAnalysisInput = req.body;

    // Strict validation: Must provide actual uploaded image
    if (!input.imageBase64) {
      return res.status(400).json({
        success: false,
        error: 'Lütfen analiz edilecek ÖTL hurda lastik görselini yükleyin.',
      });
    }

    const cleanBase64 = input.imageBase64.replace(/^data:image\/[a-z0-9.+]+;base64,/, '');
    const byteSize = Buffer.byteLength(cleanBase64, 'base64');
    // Requirement 4: Reject images over 8 MB
    if (byteSize > 8 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: 'Yüklenen görsel boyutu 8 MB sınırını aşıyor. Lütfen daha küçük boyutlu bir görsel yükleyin.',
      });
    }

    const batchWeight = Math.max(100, parseFinite(input.batchWeightKg, 2500));
    const reactorId = input.reactorId || 'REAKTOR-01 [Sürekli Döner Fırın - Rotary Kiln]';
    const mimeType = input.mimeType || 'image/jpeg';

    const imagePart = {
      inlineData: {
        mimeType,
        data: cleanBase64,
      },
    };

    const optimizationNote = 
      input.optimizationPriority === 'rcb_purity'
        ? 'Öncelik: Maksimum rCB yüzey saflığı, yüksek BET alanı ve minimum kül oranı.'
        : input.optimizationPriority === 'fast_cycle'
        ? 'Öncelik: Hızlı çevrim süresi ve yüksek tesis verimi.'
        : 'Öncelik: rCB kalitesi ve pirolitik yağ verimi arasında dengeli optimizasyon.';

    const prompt = `Sen endüstriyel lastik geri dönüşüm, polimer kimyası ve piroliz reaktör optimizasyonu alanında uzmanlaşmış yapay zeka karar destek sistemisin.
Bu görseli incele.

ÖNCELİKLİ DOĞRULAMA (isTire & rejectReason):
- Görselde araç lastiği (sırt deseni, aşınmış yüzey, yanak, karkas veya lastik kesiti) var mı?
- Eğer görselde lastik, lastik sırtı veya lastik kesiti varsa "isTire" kesinlikle true olmalıdır. Aşınmış veya kirli olması lastik olmadığı anlamına gelmez; lastik olarak kabul et ve analiz et.
- SADECE görsel açıkça lastikle ilgisiz bir nesne ise (örneğin manzara, hayvan, bina, insan, tekstil, elektronik, mobilya vb.) veya lastik yapısı taşımıyorsa "isTire" değerini false yap ve "rejectReason" kısmına 'Görselde lastik tespit edilmedi, nesne lastik yapısı taşımıyor.' yaz.
- Eğer lastik ise "isTire" değerini true yap ve "rejectReason" boş string kalsın.

ÖNEMLİ KURALLAR:
- KESİN VE ZORUNLU KURAL: Never state anything as certain unless you can clearly see it in the image; if you are unsure, say so explicitly. Görselde açıkça göremediğin hiçbir detayı kesin olarak belirtme.
- TÜM ÇIKTILAR TÜRKÇE OLMALIDIR.
- ALT KATEGORİ, EBAT VE MARKA:
  Yanak yazıları veya ebat net okunabiliyorsa subType içine ekle. Net okunabilir DEĞİLSE marka/ebat UYDURMA, sadece sınıf düzeyinde kal.
  Sırt deseninden marka/model tahmini yapıyorsan 'isBrandEstimated' alanını true yap.

Analiz Kriterleri:
1. LASTİK SINIFLANDIRMASI ("category" yalnızca şu enum değerlerinden biri olmalıdır):
   - "TRUCK_BUS_TBR"
   - "PASSENGER_WINTER"
   - "PASSENGER_SUMMER"
   - "SUV_ALL_TERRAIN"
   - "HEAVY_INDUSTRIAL_OTR"

2. AŞINMA VE DİŞ DERİNLİĞİ:
   - estimatedWearRate: 0-100 arası aşınma yüzdesi
   - remainingTreadDepthMm: Kalan diş derinliği (mm)
   - originalTreadDepthMm: Fabrika sıfır orijinal diş derinliği (mm), görselden net kestirilemiyorsa boş/null bırakılabilir.
   - carcassCondition: "EXCELLENT" | "GOOD" | "PARTIAL_EXPOSURE" | "STEEL_CORD_EXPOSED"

3. DİNAMİK POLİMER MATRİSİ:
   - naturalRubberNR, syntheticRubberSBR_BR, carbonBlackFiller, silicaFiller, steelWireRatio, processOilsAndAdditives, zincOxideAndSulfur.
   - estimationBasis: "Dayanak: [görselden net okunan ebat/marka varsa o, yoksa tespit edilen sınıf ve desen] için sınıf bazlı tipik bileşim tahmini. Kesin ölçüm değildir."
   - estimationConfidence: "yüksek" | "orta" | "düşük"

4. PİROLİZ TERMAL REÇETESİ (${batchWeight} kg parti için, ${optimizationNote}):
   - optimalReactorTempC, heatingRampRateCPerMin, totalResidenceTimeMin, volatileEvacuationTimeMin, nitrogenPurgeRateNm3H

5. rCB KALİTE VE KİRLİLİK TAHMİNİ:
   - contaminationLevel: "düşük" | "orta" | "yüksek" (Sırt veya omuzda çamur, toprak veya mineral kir bulaşması var mı?)
   - rcbPurityPct, betSurfaceAreaM2g, iodineAdsorptionNo, equivalentGrade, industrialSuitability, economicValuePerTonUsd, qualityVerdictTr.
   (İyot ~80 mg/g ise N330, ~40 ise N550, ~35 ise N660 sınıfı).`;

    // Requirement 4: Reduce the model list to one primary and one fallback
    const modelsToTry = [
      'gemini-3.5-flash-lite',
      'gemini-3-flash-preview',
    ];
    let rawText = '';
    let successfulModel = '';
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`[Gemini Vision] Analyzing image with model: ${modelName}`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: { parts: [imagePart, { text: prompt }] },
          config: {
            responseMimeType: 'application/json',
            responseSchema,
            temperature: 0.2,
          },
        });
        rawText = response.text?.trim() || '';
        if (rawText) {
          successfulModel = modelName;
          console.log(`[Gemini Vision] Successfully analyzed image using ${modelName}`);
          break;
        }
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        console.warn(`[Gemini Vision] ${modelName} call failed:`, errMsg.slice(0, 140));
        lastError = err;
      }
    }

    if (!rawText) {
      throw new Error(
        lastError?.message || 'Gemini Vision modeli görseli analiz edemedi. Lütfen görseli kontrol edip tekrar deneyin.'
      );
    }

    // Requirement 1: If parsing fails, return HTTP 502 with "Analiz okunamadı, lütfen tekrar deneyin."
    let parsed: any;
    try {
      parsed = cleanAndParseJson(rawText);
    } catch (parseErr: any) {
      console.error('[cleanAndParseJson] JSON parse failed:', parseErr.message);
      return res.status(502).json({
        success: false,
        error: 'Analiz okunamadı, lütfen tekrar deneyin.',
      });
    }

    // Requirement 3: If isTire is false, return HTTP 422 and show "Lastik tespit edilmedi" in UI with no recipe
    if (parsed.isTire === false) {
      const reason = parsed.rejectReason ? `: ${parsed.rejectReason}` : '';
      return res.status(422).json({
        success: false,
        isTire: false,
        error: `Lastik tespit edilmedi${reason}`,
      });
    }

    // Validate that category is one of the allowed enum values
    if (!parsed.category || !ALLOWED_CATEGORIES.includes(parsed.category)) {
      return res.status(422).json({
        success: false,
        isTire: false,
        error: 'Lastik tespit edilmedi: Geçerli bir lastik sınıflandırması yapılamadı.',
      });
    }

    // Requirement 2: Replace every Number(x) || default with a check using Number.isFinite so 0 is preserved (silicaFiller=0 stays 0)
    const rawNR = Math.max(0, parseFinite(parsed.naturalRubberNR, 28));
    const rawSBR = Math.max(0, parseFinite(parsed.syntheticRubberSBR_BR, 36));
    const rawCB = Math.max(0, parseFinite(parsed.carbonBlackFiller, 22));
    const rawSilica = Math.max(0, parseFinite(parsed.silicaFiller, 0)); // 0 is strictly preserved
    const rawSteel = Math.max(0, parseFinite(parsed.steelWireRatio, 12));
    const rawOils = Math.max(0, parseFinite(parsed.processOilsAndAdditives, 5));
    const rawZinc = Math.max(0, parseFinite(parsed.zincOxideAndSulfur, 3));

    const polySumRaw = rawNR + rawSBR + rawCB + rawSilica + rawSteel + rawOils + rawZinc;
    const factor = polySumRaw > 0 ? 100 / polySumRaw : 1;

    let nrPct = Number((rawNR * factor).toFixed(1));
    let sbrPct = Number((rawSBR * factor).toFixed(1));
    let cbPct = Number((rawCB * factor).toFixed(1));
    let silicaPct = Number((rawSilica * factor).toFixed(1));
    let steelPct = Number((rawSteel * factor).toFixed(1));
    let oilsPct = Number((rawOils * factor).toFixed(1));
    let zincPct = Number((rawZinc * factor).toFixed(1));

    const currentPolySum = Number((nrPct + sbrPct + cbPct + silicaPct + steelPct + oilsPct + zincPct).toFixed(1));
    const polyDiff = Number((100.0 - currentPolySum).toFixed(1));
    if (polyDiff !== 0) {
      nrPct = Number((nrPct + polyDiff).toFixed(1));
    }

    const additivesCombined = Number((oilsPct + zincPct).toFixed(1));

    // Dynamic mass balance calculation strictly derived from batchWeight * dynamic ratios
    const rcbYieldPct = Number((cbPct + (nrPct + sbrPct) * 0.14).toFixed(1));
    const rcbKg = Math.round(batchWeight * (rcbYieldPct / 100));
    const scrapSteelKg = Math.round(batchWeight * (steelPct / 100));
    const pyrolyticOilKg = Math.round(batchWeight * 0.39);
    const pyrolyticGasKg = Math.max(0, batchWeight - (rcbKg + scrapSteelKg + pyrolyticOilKg));

    const rampRate = Math.max(1, parseFinite(parsed.heatingRampRateCPerMin, 5.5));
    const optTemp = Math.max(300, parseFinite(parsed.optimalReactorTempC, 475));
    const evacTime = Math.max(20, Math.min(45, Math.round(parseFinite(parsed.volatileEvacuationTimeMin, 30))));

    // Total reaction time must equal sum of the phase durations shown
    const phase1Duration = 20;
    const phase2Duration = Math.max(30, Math.round((optTemp - 150) / rampRate));
    const phase3Duration = evacTime;
    const phase4Duration = 25;
    const computedTotalReactionTime = phase1Duration + phase2Duration + phase3Duration + phase4Duration;

    const phases = [
      {
        phaseName: 'Faz 1: Kurutma & N₂ İnert Süpürme',
        targetTempC: 150,
        durationMin: phase1Duration,
        actionTr: 'Reaktör oksijen konsantrasyonu <%1 olana kadar N₂ gaz basımı ve nem tahliyesi.',
      },
      {
        phaseName: 'Faz 2: Termal Depolimerizasyon (Kraking)',
        targetTempC: optTemp,
        durationMin: phase2Duration,
        actionTr: `${rampRate}°C/dk kontrollü rampa ile polimerik kauçuk zincirlerinin termal parçalanması.`,
      },
      {
        phaseName: 'Faz 3: rCB Yüzey Desorpsiyonu & Tahliye',
        targetTempC: optTemp,
        durationMin: phase3Duration,
        actionTr: 'Vakum altında tutulan reaktörde katran ve ağır uçucu gazların char yüzeyinden desorpsiyonu.',
      },
      {
        phaseName: 'Faz 4: Güvenli İnert Pasivasyon & Soğutma',
        targetTempC: 120,
        durationMin: phase4Duration,
        actionTr: 'Reaktörün N₂ atmosferi altında 120°C altına kontrollü soğutulması.',
      },
    ];

    const temperatureProfileCurve = buildCurveFromPhases(phases, 25);

    // Contamination detection & ASTM Grade consistency
    const contaminationLevel: 'düşük' | 'orta' | 'yüksek' = 
      parsed.contaminationLevel === 'yüksek' || parsed.contaminationLevel === 'orta' || parsed.contaminationLevel === 'düşük'
        ? parsed.contaminationLevel
        : /çamur|toprak|kirli|balçık|mud|soil/i.test(parsed.visualInspectionNotes || '')
        ? 'yüksek'
        : 'düşük';

    // Increase ash estimate if mud or soil is visible in the photo
    let extraAshPct = 0;
    if (contaminationLevel === 'yüksek') {
      extraAshPct = 4.0;
    } else if (contaminationLevel === 'orta') {
      extraAshPct = 2.0;
    }

    // ASTM grade must be consistent with BET and iodine values shown:
    // iodine ~80 mg/g -> N330 class, ~40 -> N550, ~35 -> N660
    let parsedIodine = parseFinite(parsed.iodineAdsorptionNo, 0);
    let parsedBet = parseFinite(parsed.betSurfaceAreaM2g, 0);

    let finalIodine = parsedIodine;
    let finalBet = parsedBet;
    let resolvedGrade = 'ASTM N550 Sınıfı rCB';

    if (
      finalIodine >= 65 ||
      finalBet >= 68 ||
      parsed.equivalentGrade?.includes('330') ||
      parsed.category === 'PASSENGER_SUMMER' ||
      parsed.category === 'PASSENGER_WINTER'
    ) {
      finalIodine = Math.round(finalIodine >= 65 ? finalIodine : 80);
      finalBet = Math.round(finalBet >= 65 ? finalBet : 78);
      resolvedGrade = 'ASTM N330 Sınıfı rCB';
    } else if (finalIodine >= 38 || finalBet >= 38 || parsed.equivalentGrade?.includes('550')) {
      finalIodine = Math.round(finalIodine >= 38 ? finalIodine : 42);
      finalBet = Math.round(finalBet >= 38 ? finalBet : 44);
      resolvedGrade = 'ASTM N550 Sınıfı rCB';
    } else {
      finalIodine = Math.round(finalIodine > 0 ? Math.min(37, finalIodine) : 35);
      finalBet = Math.round(finalBet > 0 ? Math.min(37, finalBet) : 34);
      resolvedGrade = 'ASTM N660 Sınıfı rCB';
    }

    const baseAshPct = Number((100 - parseFinite(parsed.rcbPurityPct, 93.5) - 1.5).toFixed(1));
    const finalAshPct = Number(Math.min(24.0, Math.max(7.5, baseAshPct + extraAshPct)).toFixed(1));
    const finalPurityPct = Number(Math.max(74.0, 100 - finalAshPct - 1.5).toFixed(1));

    // Do not invent defaults for confidence or originalTreadDepthMm; if missing, return null
    let finalConfidence: number | null = parseFiniteOrNull(parsed.confidence);
    if (finalConfidence !== null) {
      if (finalConfidence > 0 && finalConfidence <= 1) {
        finalConfidence = finalConfidence * 100;
      }
      if (finalConfidence < 0 || finalConfidence > 100) {
        finalConfidence = null;
      } else {
        finalConfidence = Number(finalConfidence.toFixed(1));
      }
    }

    const finalOriginalTreadDepthMm: number | null = parseFiniteOrNull(parsed.originalTreadDepthMm);
    const finalRemainingTreadDepthMm = Math.max(0, parseFinite(parsed.remainingTreadDepthMm, 0));
    const finalWearRate = Math.max(0, Math.min(100, Math.round(parseFinite(parsed.estimatedWearRate, 50))));

    const result: TireAnalysisResult = {
      analysisId: `OTL-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toISOString(),
      analysisSource: 'gemini-vision',
      modelUsed: successfulModel,
      isTire: true,
      isUploadedImageAnalysis: true,
      uploadedImageDetails: {
        resolution: 'Canlı Görsel Analizi (Piksel Seviyesi)',
        detectedVehicleType: parsed.categoryNameTr || parsed.category,
        treadPatternType: parsed.subType || 'Standart',
        visualConfidence: finalConfidence ?? undefined,
      },
      tireClassification: {
        category: parsed.category,
        categoryNameTr: parsed.categoryNameTr || parsed.category,
        subType: parsed.subType || 'Standart',
        isBrandEstimated: Boolean(parsed.isBrandEstimated),
        confidence: finalConfidence,
        estimatedWearRate: finalWearRate,
        remainingTreadDepthMm: Number(finalRemainingTreadDepthMm.toFixed(1)),
        originalTreadDepthMm: finalOriginalTreadDepthMm !== null ? Number(finalOriginalTreadDepthMm.toFixed(1)) : null,
        carcassCondition: parsed.carcassCondition || 'GOOD',
        patternFeatures: Array.isArray(parsed.patternFeatures) ? parsed.patternFeatures : [],
        visualInspectionNotes:
          parsed.visualInspectionNotes ||
          'Sırt ve aşınma görselden okunur; polimer bileşimi sınıf bazlı tahmindir.',
      },
      polymerMatrix: {
        naturalRubberNR: nrPct,
        syntheticRubberSBR_BR: sbrPct,
        carbonBlackFiller: cbPct,
        silicaFiller: silicaPct,
        steelWireRatio: steelPct,
        processOilsAndAdditives: oilsPct,
        zincOxideAndSulfur: zincPct,
        matrixComment: `Tespit edilen ${parsed.categoryNameTr || parsed.category} için sınıf bazlı tahmin polimer matrisi: %${nrPct} NR (Doğal Kauçuk), %${sbrPct} SBR/BR, %${cbPct} Karbon Karası, %${silicaPct} Silika, %${steelPct} Çelik Tel ve %${additivesCombined} Proses Yağları/Katkılar.`,
        estimationBasis:
          parsed.estimationBasis ||
          `Dayanak: ${parsed.subType || parsed.categoryNameTr || parsed.category} için sınıf bazlı tipik bileşim tahmini. Kesin ölçüm değildir.`,
        estimationConfidence:
          parsed.estimationConfidence === 'yüksek' ||
          parsed.estimationConfidence === 'orta' ||
          parsed.estimationConfidence === 'düşük'
            ? parsed.estimationConfidence
            : parsed.isBrandEstimated
            ? 'orta'
            : 'düşük',
      },
      massBalance: {
        recoveredCarbonBlackKg: rcbKg,
        recoveredCarbonBlackYieldPct: rcbYieldPct,
        pyrolyticOilKg,
        pyrolyticOilYieldPct: 39.0,
        pyrolyticGasKg,
        pyrolyticGasYieldPct: Number(((pyrolyticGasKg / batchWeight) * 100).toFixed(1)),
        scrapSteelKg,
        scrapSteelYieldPct: Number(((scrapSteelKg / batchWeight) * 100).toFixed(1)),
      },
      thermalRecipe: {
        reactorId,
        optimalReactorTempC: optTemp,
        heatingRampRateCPerMin: rampRate,
        totalResidenceTimeMin: computedTotalReactionTime,
        volatileEvacuationTimeMin: evacTime,
        nitrogenPurgeRateNm3H: parseFinite(parsed.nitrogenPurgeRateNm3H, 22),
        vacuumLevelMbar: -28,
        phases,
        temperatureProfileCurve,
        engineeringSafetyNotes: [
          'Reaktör iç basıncı -15 ile -35 mbar arasında dengede tutulmalıdır.',
          'Kondenser hattı soğutma suyu debisi minimum 14 m³/saat olmalıdır.',
          'rCB 80°C altına inmeden atmosferik havayla temas ettirilmemelidir (piyroforik parlama riski).',
          'Siklon filtrelerde basınç farkı 12 mbar üzerine çıkarsa otomatik N2 ters üfleme devreye alınmalıdır.',
          'Genel bilgilendirmedir; tesis SOP/HAZOP yerine geçmez.',
        ],
      },
      rcbQualityEstimate: {
        purityPercentage: finalPurityPct,
        carbonContentPct: Number((finalPurityPct * 0.95).toFixed(1)),
        ashContentPct: finalAshPct,
        volatileMatterPct: 1.5,
        betSurfaceAreaM2g: finalBet,
        iodineAdsorptionNo: finalIodine,
        equivalentGrade: resolvedGrade,
        contaminationLevel,
        industrialSuitability:
          Array.isArray(parsed.industrialSuitability) && parsed.industrialSuitability.length > 0
            ? parsed.industrialSuitability
            : [
                'Otomotiv kauçuk profilleri, hortum ve fitil üretimi',
                'Siyah masterbatch plastik boyarmadde granülleri',
                'Endüstriyel titreşim sönümleyici takoz ve contalar',
                'Modifiye bitümlü su yalıtım membranı ve asfalt katkısı',
              ],
        economicValuePerTonUsd: parseFinite(parsed.economicValuePerTonUsd, 540),
        co2SavingsTonPerBatch: Number(((rcbKg / 1000) * 2.45).toFixed(2)),
        qualityVerdictTr:
          parsed.qualityVerdictTr ||
          `Yüklenen numuneden ${optTemp}°C fırın sıcaklığında ${rcbKg} kg ve %${finalPurityPct} yüzey saflığında ${resolvedGrade} üretimi öngörülmektedir.`,
      },
    };

    return res.json({
      success: true,
      source: 'gemini-vision',
      modelUsed: successfulModel,
      data: result,
    });
  } catch (error: any) {
    console.error('[API Error /api/analyze-tire]:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Görsel analizi sırasında bir hata meydana geldi.',
    });
  }
});

// Production static file serving or Vite middleware in development
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`[TyreVision AI ÖTL Piroliz] Server running on port ${port} (mode: ${isProduction ? 'production' : 'development'})`);
  });
}

startServer();
