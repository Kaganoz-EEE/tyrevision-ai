export type TireCategory =
  | 'TRUCK_BUS_TBR'
  | 'PASSENGER_SUMMER'
  | 'PASSENGER_WINTER'
  | 'SUV_ALL_TERRAIN'
  | 'HEAVY_INDUSTRIAL_OTR';

export type CarcassCondition =
  | 'EXCELLENT'
  | 'GOOD'
  | 'PARTIAL_EXPOSURE'
  | 'STEEL_CORD_EXPOSED';

export interface TireAnalysisInput {
  imageBase64?: string;
  mimeType?: string;
  batchWeightKg: number;
  reactorId: string;
  optimizationPriority: 'rcb_purity' | 'balanced' | 'fast_cycle';
  moistureLevel?: 'dry' | 'moderate' | 'wet';
  notes?: string;
}

export interface TemperatureCurvePoint {
  minute: number;
  temperatureC: number;
  phaseLabel: string;
  pressureMbar: number;
}

export interface RecipePhase {
  phaseName: string;
  targetTempC: number;
  durationMin: number;
  actionTr: string;
}

export interface TireAnalysisResult {
  analysisId: string;
  timestamp: string;
  tireClassification: {
    category: TireCategory;
    categoryNameTr: string;
    subType: string;
    confidence: number | null;
    estimatedWearRate: number;
    remainingTreadDepthMm: number;
    originalTreadDepthMm: number | null;
    carcassCondition: CarcassCondition;
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
    phases: RecipePhase[];
    temperatureProfileCurve: TemperatureCurvePoint[];
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

export interface PlantSummaryStats {
  scannedTireCount: number;
  avgRcbPurityPct: number;
  preventedCo2Tons: number;
  activeReactors: number;
  totalBatchesProcessed: number;
}

export interface AnalysisFeedback {
  analysisId: string;
  isClassCorrect: boolean; // true = Doğru, false = Yanlış
  trueCategory: TireCategory;
  trueTreadDepthMm: number | null;
  timestamp: string;
}

export interface SessionAnalysisItem {
  id: string;
  timestamp: string;
  fileName: string;
  modelUsed: string;
  predictedCategory: TireCategory;
  categoryNameTr: string;
  confidence: number | null;
  wearRatePct: number;
  remainingTreadDepthMm: number;
  contaminationLevel: string;
  nrPct: number;
  sbrPct: number;
  silicaPct: number;
  steelPct: number;
  rcbKg: number;
  purity: number;
  co2Estimate: number;
  timeStr: string;
  thumbnailUrl?: string;
  fullResult?: TireAnalysisResult;
}

export const TIRE_CATEGORY_LABELS: Record<TireCategory, string> = {
  TRUCK_BUS_TBR: 'Ağır Vasıta / TBR',
  PASSENGER_SUMMER: 'Binek Yaz Lastiği',
  PASSENGER_WINTER: 'Binek Kış Lastiği',
  SUV_ALL_TERRAIN: 'SUV / 4x4 All-Terrain',
  HEAVY_INDUSTRIAL_OTR: 'İş Makinesi / OTR',
};
