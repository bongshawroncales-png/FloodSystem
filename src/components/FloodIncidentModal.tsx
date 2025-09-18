import React, { useState } from 'react';
import { X, AlertTriangle, MapPin, Calendar, Users, Camera, FileText, Cloud, Home, Zap, Shield, Droplets } from 'lucide-react';
import { FloodRiskArea, FloodIncident } from '../types';

interface FloodIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (incident: Omit<FloodIncident, 'id' | 'createdAt'>) => void;
  area: FloodRiskArea;
  user: any;
}

const FLOOD_CAUSES = [
  'Heavy rainfall',
  'Dam release',
  'Storm surge',
  'Typhoon',
  'Monsoon',
  'River overflow',
  'Flash flood',
  'Coastal flooding',
  'Other'
];

const VULNERABLE_GROUPS = [
  'Children (0-12 years)',
  'Elderly (60+ years)',
  'Persons with Disabilities (PWDs)',
  'Pregnant women',
  'Infants and toddlers',
  'Chronically ill persons',
  'Indigenous peoples'
];

const INFRASTRUCTURE_TYPES = [
  'Roads',
  'Bridges',
  'Schools',
  'Hospitals',
  'Health centers',
  'Power supply',
  'Water supply',
  'Communication towers',
  'Government buildings',
  'Markets',
  'Churches',
  'Ports/Airports'
];

const RESPONDING_AGENCIES = [
  'Local Government Unit (LGU)',
  'NDRRMC',
  'Philippine Red Cross',
  'DSWD',
  'DOH',
  'PNP',
  'AFP',
  'BFP',
  'Coast Guard',
  'DPWH',
  'NGOs',
  'Volunteers'
];

export const FloodIncidentModal: React.FC<FloodIncidentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  area,
  user
}) => {
  const [activeSection, setActiveSection] = useState(0);
  const [formData, setFormData] = useState({
    // Core Details
    incidentId: `FLD-${Date.now()}`,
    title: `Flood Incident - ${area.basicInfo.name}`,
    description: '',
    location: area.basicInfo.name,
    barangay: '',
    municipality: 'Oras',
    province: 'Eastern Samar',
    gpsCoordinates: '',
    onsetDateTime: '',
    endDateTime: '',
    cause: 'Heavy rainfall',
    severity: 'Medium' as 'Low' | 'Medium' | 'High' | 'Critical',
    floodDepth: 0,
    duration: '',
    areaExtent: '',
    
    // Human Impact
    casualties: {
      dead: 0,
      missing: 0,
      injured: 0
    },
    evacuatedPeople: 0,
    vulnerableGroupsAffected: [] as string[],
    
    // Property Impact
    housesDamaged: 0,
    housesDestroyed: 0,
    infrastructureAffected: [] as string[],
    agricultureLosses: '',
    economicDamages: 0,
    
    // Environmental Context
    rainfallData: '',
    riverLevel: '',
    weatherEvent: '',
    
    // Response
    respondingAgencies: [] as string[],
    evacuationCenters: '',
    reliefProvided: '',
    challengesEncountered: '',
    
    // Additional
    affectedPopulation: area.exposure.population || 0
  });

  const sections = [
    { title: 'Core Details', icon: AlertTriangle },
    { title: 'Human Impact', icon: Users },
    { title: 'Property & Infrastructure', icon: Home },
    { title: 'Environmental Context', icon: Cloud },
    { title: 'Response & Actions', icon: Shield }
  ];

  const handleArrayFieldChange = (field: string, value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked
        ? [...(prev[field as keyof typeof prev] as string[]), value]
        : (prev[field as keyof typeof prev] as string[]).filter(item => item !== value)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get coordinates from area geometry
    let coordinates: number[];
    if (area.geometry.type === 'Point') {
      coordinates = area.geometry.coordinates as number[];
    } else if (area.geometry.type === 'Polygon') {
      // Use centroid of polygon
      const coords = area.geometry.coordinates as number[][][];
      const firstRing = coords[0];
      const sumLat = firstRing.reduce((sum, coord) => sum + coord[1], 0);
      const sumLng = firstRing.reduce((sum, coord) => sum + coord[0], 0);
      coordinates = [sumLng / firstRing.length, sumLat / firstRing.length];
    } else {
      coordinates = [0, 0];
    }

    const incident: Omit<FloodIncident, 'id' | 'createdAt'> = {
      incidentId: formData.incidentId,
      title: formData.title,
      description: formData.description,
      location: formData.location,
      barangay: formData.barangay,
      municipality: formData.municipality,
      province: formData.province,
      coordinates: coordinates,
      gpsCoordinates: `${coordinates[1].toFixed(6)}, ${coordinates[0].toFixed(6)}`,
      onsetDateTime: formData.onsetDateTime,
      endDateTime: formData.endDateTime,
      cause: formData.cause,
      severity: formData.severity,
      floodDepth: formData.floodDepth,
      duration: formData.duration,
      areaExtent: formData.areaExtent,
      casualties: formData.casualties,
      evacuatedPeople: formData.evacuatedPeople,
      vulnerableGroupsAffected: formData.vulnerableGroupsAffected,
      housesDamaged: formData.housesDamaged,
      housesDestroyed: formData.housesDestroyed,
      infrastructureAffected: formData.infrastructureAffected,
      agricultureLosses: formData.agricultureLosses,
      economicDamages: formData.economicDamages,
      rainfallData: formData.rainfallData,
      riverLevel: formData.riverLevel,
      weatherEvent: formData.weatherEvent,
      respondingAgencies: formData.respondingAgencies,
      evacuationCenters: formData.evacuationCenters,
      reliefProvided: formData.reliefProvided,
      challengesEncountered: formData.challengesEncountered,
      status: 'Pending',
      reportedBy: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      },
      affectedPopulation: formData.affectedPopulation,
      relatedAreaId: area.id
    };

    onSubmit(incident);
    onClose();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'High': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'Medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Report Flood Incident
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Comprehensive flood incident documentation for: {area.basicInfo.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Section Navigation */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex overflow-x-auto">
            {sections.map((section, index) => {
              const Icon = section.icon;
              return (
                <button
                  key={index}
                  onClick={() => setActiveSection(index)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeSection === index
                      ? 'border-blue-500 text-blue-600 bg-white'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {section.title}
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-6">
            {/* Section 0: Core Details */}
            {activeSection === 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Incident ID / Reference Number *
                    </label>
                    <input
                      type="text"
                      value={formData.incidentId}
                      onChange={(e) => setFormData(prev => ({ ...prev, incidentId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Incident Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Barangay
                    </label>
                    <input
                      type="text"
                      value={formData.barangay}
                      onChange={(e) => setFormData(prev => ({ ...prev, barangay: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Municipality
                    </label>
                    <input
                      type="text"
                      value={formData.municipality}
                      onChange={(e) => setFormData(prev => ({ ...prev, municipality: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Province
                    </label>
                    <input
                      type="text"
                      value={formData.province}
                      onChange={(e) => setFormData(prev => ({ ...prev, province: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Onset Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.onsetDateTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, onsetDateTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.endDateTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, endDateTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cause/Trigger *
                    </label>
                    <select
                      value={formData.cause}
                      onChange={(e) => setFormData(prev => ({ ...prev, cause: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      {FLOOD_CAUSES.map(cause => (
                        <option key={cause} value={cause}>{cause}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Severity Level *
                    </label>
                    <select
                      value={formData.severity}
                      onChange={(e) => setFormData(prev => ({ ...prev, severity: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="Low">Low - Minor flooding</option>
                      <option value="Medium">Medium - Moderate flooding</option>
                      <option value="High">High - Significant flooding</option>
                      <option value="Critical">Critical - Severe flooding</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Flood Depth (meters)
                    </label>
                    <input
                      type="number"
                      value={formData.floodDepth}
                      onChange={(e) => setFormData(prev => ({ ...prev, floodDepth: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      step="0.1"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration
                    </label>
                    <input
                      type="text"
                      value={formData.duration}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                      placeholder="e.g., 6 hours, 2 days"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Area Extent
                    </label>
                    <input
                      type="text"
                      value={formData.areaExtent}
                      onChange={(e) => setFormData(prev => ({ ...prev, areaExtent: e.target.value }))}
                      placeholder="e.g., 5 hectares, 2 barangays"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Incident Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={4}
                    placeholder="Detailed description of the flood incident, affected areas, and current situation..."
                    required
                  />
                </div>
              </div>
            )}

            {/* Section 1: Human Impact */}
            {activeSection === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total Population Affected
                    </label>
                    <input
                      type="number"
                      value={formData.affectedPopulation}
                      onChange={(e) => setFormData(prev => ({ ...prev, affectedPopulation: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Evacuated/Displaced People
                    </label>
                    <input
                      type="number"
                      value={formData.evacuatedPeople}
                      onChange={(e) => setFormData(prev => ({ ...prev, evacuatedPeople: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Casualties
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Dead</label>
                      <input
                        type="number"
                        value={formData.casualties.dead}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          casualties: { ...prev.casualties, dead: Number(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Missing</label>
                      <input
                        type="number"
                        value={formData.casualties.missing}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          casualties: { ...prev.casualties, missing: Number(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Injured</label>
                      <input
                        type="number"
                        value={formData.casualties.injured}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          casualties: { ...prev.casualties, injured: Number(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vulnerable Groups Affected
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {VULNERABLE_GROUPS.map(group => (
                      <label key={group} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.vulnerableGroupsAffected.includes(group)}
                          onChange={(e) => handleArrayFieldChange('vulnerableGroupsAffected', group, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{group}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Section 2: Property & Infrastructure */}
            {activeSection === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Houses Damaged
                    </label>
                    <input
                      type="number"
                      value={formData.housesDamaged}
                      onChange={(e) => setFormData(prev => ({ ...prev, housesDamaged: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Houses Destroyed
                    </label>
                    <input
                      type="number"
                      value={formData.housesDestroyed}
                      onChange={(e) => setFormData(prev => ({ ...prev, housesDestroyed: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Infrastructure Affected
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {INFRASTRUCTURE_TYPES.map(infra => (
                      <label key={infra} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.infrastructureAffected.includes(infra)}
                          onChange={(e) => handleArrayFieldChange('infrastructureAffected', infra, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{infra}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Agriculture & Livelihood Losses
                  </label>
                  <textarea
                    value={formData.agricultureLosses}
                    onChange={(e) => setFormData(prev => ({ ...prev, agricultureLosses: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={3}
                    placeholder="Describe crops, livestock, fisheries, and other livelihood losses..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estimated Economic Damages (₱)
                  </label>
                  <input
                    type="number"
                    value={formData.economicDamages}
                    onChange={(e) => setFormData(prev => ({ ...prev, economicDamages: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="1000"
                  />
                </div>
              </div>
            )}

            {/* Section 3: Environmental Context */}
            {activeSection === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rainfall Data
                  </label>
                  <input
                    type="text"
                    value={formData.rainfallData}
                    onChange={(e) => setFormData(prev => ({ ...prev, rainfallData: e.target.value }))}
                    placeholder="e.g., 150mm in 24h, 300mm cumulative"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    River/Stream Level at Peak
                  </label>
                  <input
                    type="text"
                    value={formData.riverLevel}
                    onChange={(e) => setFormData(prev => ({ ...prev, riverLevel: e.target.value }))}
                    placeholder="e.g., 5.2m above normal, critical level"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Weather Event Context
                  </label>
                  <input
                    type="text"
                    value={formData.weatherEvent}
                    onChange={(e) => setFormData(prev => ({ ...prev, weatherEvent: e.target.value }))}
                    placeholder="e.g., Typhoon 'Egay', ITCZ, Low Pressure Area"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Current Weather Context */}
                {area.weather.rainfall > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="font-medium text-blue-900 mb-2">Current Weather Conditions</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
                      <div><strong>Rainfall:</strong> {area.weather.rainfall}mm/hr</div>
                      <div><strong>Wind Speed:</strong> {area.weather.windSpeed}km/h</div>
                      <div><strong>Temperature:</strong> {area.weather.temperature}°C</div>
                      <div><strong>Forecast:</strong> {area.weather.forecastRainfall}mm expected</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Section 4: Response & Actions */}
            {activeSection === 4 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Responding Agencies/Organizations
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {RESPONDING_AGENCIES.map(agency => (
                      <label key={agency} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.respondingAgencies.includes(agency)}
                          onChange={(e) => handleArrayFieldChange('respondingAgencies', agency, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{agency}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Evacuation Centers Used
                  </label>
                  <textarea
                    value={formData.evacuationCenters}
                    onChange={(e) => setFormData(prev => ({ ...prev, evacuationCenters: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={3}
                    placeholder="List evacuation centers, schools, or facilities used..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Relief Provided
                  </label>
                  <textarea
                    value={formData.reliefProvided}
                    onChange={(e) => setFormData(prev => ({ ...prev, reliefProvided: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={3}
                    placeholder="Food packs, medical aid, rescue operations, etc..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Challenges Encountered
                  </label>
                  <textarea
                    value={formData.challengesEncountered}
                    onChange={(e) => setFormData(prev => ({ ...prev, challengesEncountered: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={3}
                    placeholder="Road blockages, communication failures, resource limitations, etc..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Navigation and Submit */}
          <div className="border-t border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => setActiveSection(Math.max(0, activeSection - 1))}
                disabled={activeSection === 0}
                className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              <div className={`px-3 py-1 rounded-lg border ${getSeverityColor(formData.severity)}`}>
                <span className="text-sm font-medium">Severity: {formData.severity}</span>
              </div>
              
              {activeSection < sections.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setActiveSection(Math.min(sections.length - 1, activeSection + 1))}
                  className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-6 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Submit Incident Report
                </button>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel - No Incident
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};