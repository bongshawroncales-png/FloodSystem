interface UserAreaData {
  population?: number;
  terrainType?: "coastal" | "river" | "mountain" | "flat";
  floodHistory?: "low" | "medium" | "high";
  landslideHistory?: "low" | "medium" | "high";
}

interface WeatherData {
  rainfall24h: number;      // in mm
  forecastRain48h: number;  // in mm
  windSpeed: number;        // m/s
  humidity: number;         // %
}

interface RiskResult {
  score: number;
  level: "Low" | "Medium" | "High";
}

export function analyzeRisk(user: UserAreaData, weather: WeatherData): RiskResult {
  let score = 0;

  // Weather factors
  if (weather.rainfall24h > 50) score += 30;
  else if (weather.rainfall24h > 20) score += 15;
  else score += 5;

  if (weather.forecastRain48h > 80) score += 25;
  else if (weather.forecastRain48h > 40) score += 15;
  else score += 5;

  if (weather.windSpeed > 15) score += 10;

  // User area factors
  switch (user.terrainType) {
    case "river":
    case "coastal":
      score += 15;
      break;
    case "mountain":
      score += 10;
      break;
  }

  if (user.floodHistory === "high") score += 20;
  else if (user.floodHistory === "medium") score += 10;

  if (user.landslideHistory === "high") score += 20;
  else if (user.landslideHistory === "medium") score += 10;

  if ((user.population ?? 0) > 1000) score += 10;

  // Classification
  let level: "Low" | "Medium" | "High";
  if (score >= 70) level = "High";
  else if (score >= 40) level = "Medium";
  else level = "Low";

  return { score, level };
}

// Import types from the main types file
import { FloodRiskArea, FloodLevel } from '../types';

// Helper function to map FloodRiskArea data to UserAreaData and WeatherData
export function mapFloodRiskAreaToAnalysisData(area: Omit<FloodRiskArea, 'id' | 'createdAt'>): {
  userData: UserAreaData;
  weatherData: WeatherData;
} {
  // Map terrain type based on water body proximity and area type
  let terrainType: UserAreaData['terrainType'] = 'flat';
  
  if (area.hydrological.waterBody === 'sea') {
    terrainType = 'coastal';
  } else if (area.hydrological.waterBody === 'river' || area.hydrological.waterBody === 'creek') {
    terrainType = 'river';
  } else if (area.physical.slope === 'steep' || area.physical.elevation > 100) {
    terrainType = 'mountain';
  }

  // Map flood history frequency to low/medium/high
  let floodHistory: UserAreaData['floodHistory'] = 'low';
  if (area.hydrological.floodHistory.hasFlooded) {
    switch (area.hydrological.floodHistory.frequency) {
      case 'very frequent':
      case 'frequent':
        floodHistory = 'high';
        break;
      case 'occasional':
        floodHistory = 'medium';
        break;
      case 'rare':
        floodHistory = 'low';
        break;
    }
  }

  // For now, assume no landslide history (could be added to the form later)
  const landslideHistory: UserAreaData['landslideHistory'] = 'low';

  const userData: UserAreaData = {
    population: area.exposure.population,
    terrainType,
    floodHistory,
    landslideHistory
  };

  // Convert rainfall intensity (mm/hr) to 24h accumulation estimate
  // Assume current intensity continues for some duration
  const estimatedRainfall24h = area.weather.rainfall * 6; // Assume 6 hours of current intensity

  const weatherData: WeatherData = {
    rainfall24h: estimatedRainfall24h,
    forecastRain48h: area.weather.forecastRainfall,
    windSpeed: area.weather.windSpeed / 3.6, // Convert km/h to m/s
    humidity: 70 // Default humidity since it's not collected in the form
  };

  return { userData, weatherData };
}

// Helper function to map RiskResult level to FloodLevel
export function mapRiskResultToFloodLevel(riskResult: RiskResult): FloodLevel {
  switch (riskResult.level) {
    case 'Low':
      return riskResult.score < 20 ? 'Very Low' : 'Low';
    case 'Medium':
      return 'Moderate';
    case 'High':
      return riskResult.score >= 85 ? 'Severe' : 'High';
    default:
      return 'Low';
  }
}