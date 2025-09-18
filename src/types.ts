export type FloodLevel = 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Severe';

export type WaterDepth = '0-6 inches' | '6-18 inches' | '1.5-3 feet' | '3+ feet';
export type WaterFlowSpeed = 'Still/Standing' | 'Slow-moving' | 'Moderate flow' | 'Fast/Rushing';
export type WaterAppearance = 'Clear' | 'Murky/Brown' | 'Muddy' | 'Contains debris';
export type AccessLevel = 'Passable by regular vehicles' | 'Passable by high-clearance vehicles only' | 'Impassable by land vehicles' | 'Completely impassable';

export type AreaType = 'residential' | 'agricultural' | 'commercial' | 'infrastructure' | 'critical facility' | 'other';
export type SlopeType = 'flat' | 'gentle' | 'steep';
export type SoilType = 'sandy' | 'clay' | 'loam' | 'rocky' | 'mixed';
export type DrainageQuality = 'none' | 'poor' | 'moderate' | 'good' | 'engineered';
export type SurfaceCover = 'paved/concrete' | 'bare soil' | 'vegetation' | 'mixed';
export type WaterBodyType = 'river' | 'creek' | 'sea' | 'lake' | 'canal' | 'none';
export type FloodCause = 'typhoon' | 'monsoon' | 'storm surge' | 'heavy rain' | 'dam release' | 'other';
export type FloodFrequency = 'rare' | 'occasional' | 'frequent' | 'very frequent';
export type FloodCoverage = 'part polygon' | 'full polygon' | 'beyond polygon';
export type BuildingType = 'light' | 'concrete' | 'mixed';
export type GroundCondition = 'dry' | 'moist' | 'saturated' | 'already flooded';

export interface FloodHistory {
  hasFlooded: boolean;
  dates: string[];
  cause: FloodCause;
  maxDepth: number;
  duration: string;
  frequency: FloodFrequency;
  coverage: FloodCoverage;
  impacts: string[];
  recoveryTime: string;
  defenses: string;
  preparedness: string;
}

export interface FloodRiskArea {
  id?: string;
  coordinates: number[] | number[][][];
  basicInfo: {
    name: string;
    type: AreaType;
    coordinates: number[] | number[][][];
  };
  physical: {
    elevation: number;
    slope: SlopeType;
    soil: SoilType;
    drainage: DrainageQuality;
    surfaceCover: SurfaceCover;
  };
  hydrological: {
    waterBody: WaterBodyType;
    distance: number;
    floodHistory: FloodHistory;
  };
  exposure: {
    population: number;
    vulnerableGroups: string[];
    criticalAssets: string[];
    buildingTypes: BuildingType;
    preparednessMeasures: string;
  };
  ground: {
    condition: GroundCondition;
    blockages: string;
    construction: string;
  };
  weather: {
    rainfall: number;
    forecastRainfall: number;
    stormAlerts: string;
    windSpeed: number;
    temperature: number;
  };
  runPrediction: boolean;
  riskLevel: FloodLevel;
  geometry: {
    type: 'Point' | 'Polygon';
    coordinates: number[] | number[][][];
  };
  createdAt: string;
}

export interface DrawingState {
  isDrawing: boolean;
  currentTool: 'marker' | 'polygon' | 'delete' | null;
  pendingGeometry: any;
}

// Keep the old FloodReport interface for backward compatibility
export interface FloodReport {
  id?: string;
  location: string;
  dateTime: string;
  waterDepth: string;
  waterFlowSpeed: string;
  waterAppearance: string[];
  affectedInfrastructure: string[];
  accessLevel: string;
  casualtiesReported: boolean;
  notes: string;
  riskLevel: FloodLevel;
  geometry: {
    type: 'Point' | 'Polygon';
    coordinates: number[] | number[][][];
  };
  createdAt: string;
}