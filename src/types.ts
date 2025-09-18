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

// User roles and permissions
export type UserRole = 'admin' | 'authorized' | 'user';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  occupation?: string;
  role: UserRole;
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
}

export interface FloodIncident {
  id?: string;
  incidentId?: string; // Reference number
  title: string;
  description: string;
  location: string;
  barangay?: string;
  municipality?: string;
  province?: string;
  coordinates: number[];
  gpsCoordinates?: string;
  
  // Timing
  onsetDateTime?: string;
  endDateTime?: string;
  
  // Cause and severity
  cause?: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  floodDepth?: number; // in meters
  duration?: string;
  areaExtent?: string;
  
  // Human impact
  casualties?: {
    dead?: number;
    missing?: number;
    injured?: number;
  };
  evacuatedPeople?: number;
  vulnerableGroupsAffected?: string[];
  
  // Property impact
  housesDamaged?: number;
  housesDestroyed?: number;
  infrastructureAffected?: string[];
  agricultureLosses?: string;
  economicDamages?: number;
  
  // Environmental context
  rainfallData?: string;
  riverLevel?: string;
  weatherEvent?: string;
  
  // Response
  respondingAgencies?: string[];
  evacuationCenters?: string;
  reliefProvided?: string;
  challengesEncountered?: string;
  
  // Documentation
  photos?: string[];
  maps?: string[];
  reports?: string[];
  
  status: 'Pending' | 'Confirmed' | 'Resolved';
  reportedBy: {
    uid: string;
    email: string;
    displayName: string;
  };
  confirmedBy?: {
    uid: string;
    email: string;
    displayName: string;
  };
  createdAt: string;
  confirmedAt?: string;
  resolvedAt?: string;
  affectedPopulation?: number;
  relatedAreaId?: string; // Link to the flood risk area
  editHistory?: {
    editedAt: string;
    editedBy: {
      uid: string;
      email: string;
      displayName: string;
    };
    changes: string;
  }[];
}

// Keep the old FloodReport interface for backward compatibility
export interface FloodIncident {
  id?: string;
  title: string;
  description: string;
  location: string;
  coordinates: number[];
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Pending' | 'Confirmed' | 'Resolved';
  reportedBy: {
    uid: string;
    email: string;
    displayName: string;
  };
  confirmedBy?: {
    uid: string;
    email: string;
    displayName: string;
  };
  createdAt: string;
  confirmedAt?: string;
  resolvedAt?: string;
  images?: string[];
  affectedPopulation?: number;
  relatedAreaId?: string; // Link to the flood risk area
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

export interface FloodIncident {
  id?: string;
  incidentId?: string; // Reference number
  title: string;
  description: string;
  location: string;
  barangay?: string;
  municipality?: string;
  province?: string;
  coordinates: number[];
  gpsCoordinates?: string;
  
  // Timing
  onsetDateTime?: string;
  endDateTime?: string;
  
  // Cause and severity
  cause?: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  floodDepth?: number; // in meters
  duration?: string;
  areaExtent?: string;
  
  // Human impact
  casualties?: {
    dead?: number;
    missing?: number;
    injured?: number;
  };
  evacuatedPeople?: number;
  vulnerableGroupsAffected?: string[];
  
  // Property impact
  housesDamaged?: number;
  housesDestroyed?: number;
  infrastructureAffected?: string[];
  agricultureLosses?: string;
  economicDamages?: number;
  
  // Environmental context
  rainfallData?: string;
  riverLevel?: string;
  weatherEvent?: string;
  
  // Response
  respondingAgencies?: string[];
  evacuationCenters?: string;
  reliefProvided?: string;
  challengesEncountered?: string;
  
  // Documentation
  photos?: string[];
  maps?: string[];
  reports?: string[];
  
  status: 'Pending' | 'Confirmed' | 'Resolved';
  reportedBy: {
    uid: string;
    email: string;
    displayName: string;
  };
  confirmedBy?: {
    uid: string;
    email: string;
    displayName: string;
  };
  createdAt: string;
  confirmedAt?: string;
  resolvedAt?: string;
  affectedPopulation?: number;
  relatedAreaId?: string; // Link to the flood risk area
  editHistory?: {
    editedAt: string;
    editedBy: {
      uid: string;
      email: string;
      displayName: string;
    };
    changes: string;
  }[];
}