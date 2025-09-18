import React, { useState, useCallback } from 'react';
import Map, { ViewState, Source, Layer } from 'react-map-gl/maplibre';
import { 
  Search, 
  Plus, 
  Minus, 
  Crosshair, 
  Layers, 
  Cloud, 
  Droplets,
  MapPin,
  ChevronDown,
  Edit3,
  Square,
  Trash2
} from 'lucide-react';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { FloodReport, FloodLevel, DrawingState, FloodRiskArea } from './types';
import { FloodReportModal } from './components/FloodReportModal';
import { FloodRiskAreaModal } from './components/FloodRiskAreaModal';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';

const SATELLITE_STYLE = {
  version: 8,
  name: 'Satellite',
  metadata: {
    'mapbox:autocomposite': false,
    'mapbox:type': 'template'
  },
  sources: {
    satellite: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256,
      attribution: '© Esri'
    }
  },
  layers: [
    {
      id: 'satellite',
      type: 'raster',
      source: 'satellite',
      minzoom: 0,
      maxzoom: 22
    }
  ]
} as const;

const STREET_STYLE = {
  version: 8,
  name: 'Streets',
  metadata: {
    'mapbox:autocomposite': false,
    'mapbox:type': 'template'
  },
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: [
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors'
    }
  },
  layers: [
    {
      id: 'osm-tiles',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19
    }
  ]
} as const;

const TERRAIN_STYLE = {
  version: 8,
  name: 'Terrain',
  metadata: {
    'mapbox:autocomposite': false,
    'mapbox:type': 'template'
  },
  sources: {
    terrain: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256,
      attribution: '© Esri'
    }
  },
  layers: [
    {
      id: 'terrain',
      type: 'raster',
      source: 'terrain',
      minzoom: 0,
      maxzoom: 13
    }
  ]
} as const;

const TOPO_STYLE = {
  version: 8,
  name: 'Topographic',
  metadata: {
    'mapbox:autocomposite': false,
    'mapbox:type': 'template'
  },
  sources: {
    topo: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256,
      attribution: '© Esri'
    }
  },
  layers: [
    {
      id: 'topo',
      type: 'raster',
      source: 'topo',
      minzoom: 0,
      maxzoom: 19
    }
  ]
} as const;

const DARK_STYLE = {
  version: 8,
  name: 'Dark',
  metadata: {
    'mapbox:autocomposite': false,
    'mapbox:type': 'template'
  },
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: [
        'https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution: '© CartoDB'
    }
  },
  layers: [
    {
      id: 'carto-dark',
      type: 'raster',
      source: 'carto-dark',
      minzoom: 0,
      maxzoom: 18
    }
  ]
} as const;

const BASEMAPS = {
  satellite: { name: 'Satellite', style: SATELLITE_STYLE },
  streets: { name: 'Streets', style: STREET_STYLE },
  terrain: { name: 'Terrain', style: TERRAIN_STYLE },
  topographic: { name: 'Topographic', style: TOPO_STYLE },
  dark: { name: 'Dark', style: DARK_STYLE }
} as const;

type BasemapKey = keyof typeof BASEMAPS;

const RISK_COLORS = {
  'Very Low': '#3B82F6', // Blue
  'Low': '#10B981',      // Green
  'Moderate': '#F59E0B', // Yellow
  'High': '#F97316',     // Orange
  'Severe': '#EF4444'    // Red
};

function App() {
  const [viewState, setViewState] = useState<ViewState>({
    longitude: -74.006,
    latitude: 40.7128,
    zoom: 10,
    bearing: 0,
    pitch: 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 }
  });

  const [showWeather, setShowWeather] = useState(false);
  const [showFlood, setShowFlood] = useState(false);
  const [currentLayer, setCurrentLayer] = useState<BasemapKey>('satellite');
  const [showBasemapMenu, setShowBasemapMenu] = useState(false);
  const [floodReports, setFloodReports] = useState<FloodReport[]>([]);
  const [floodRiskAreas, setFloodRiskAreas] = useState<FloodRiskArea[]>([]);
  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    currentTool: null,
    pendingGeometry: null
  });
  const [showReportModal, setShowReportModal] = useState(false);
  const [showRiskAreaModal, setShowRiskAreaModal] = useState(false);
  const [polygonPoints, setPolygonPoints] = useState<number[][]>([]);
  const [selectedReport, setSelectedReport] = useState<FloodReport | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const mapRef = useRef<any>(null);

  // Effect to open risk area modal when geometry is ready
  useEffect(() => {
    if (drawingState.pendingGeometry && !showRiskAreaModal && !showReportModal) {
      setShowRiskAreaModal(true);
    }
  }, [drawingState.pendingGeometry, showRiskAreaModal, showReportModal]);

  const handleZoomIn = useCallback(() => {
    setViewState(prev => ({ ...prev, zoom: Math.min(prev.zoom + 1, 20) }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setViewState(prev => ({ ...prev, zoom: Math.max(prev.zoom - 1, 0) }));
  }, []);

  const handleCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setViewState(prev => ({
            ...prev,
            longitude: position.coords.longitude,
            latitude: position.coords.latitude,
            zoom: 12
          }));
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get your location. Please check your browser permissions.');
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  }, []);

  const handleBasemapSelect = useCallback((basemap: BasemapKey) => {
    setCurrentLayer(basemap);
    setShowBasemapMenu(false);
  }, []);

  // Load flood reports from Firebase
  const loadFloodReports = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'floodReports'));
      const reports: FloodReport[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Parse geometry coordinates back from JSON string for polygons
        const report = {
          id: doc.id,
          ...data,
          geometry: {
            ...data.geometry,
            coordinates: data.geometry.type === 'Polygon' && typeof data.geometry.coordinates === 'string'
              ? JSON.parse(data.geometry.coordinates)
              : data.geometry.coordinates
          }
        } as FloodReport;
        reports.push(report);
      });
      setFloodReports(reports);
    } catch (error) {
      console.error('Error loading flood reports:', error);
    }
  }, []);

  // Save flood report to Firebase
  const saveFloodReport = useCallback(async (report: Omit<FloodReport, 'id' | 'createdAt'>) => {
    try {
      // Serialize polygon coordinates for Firestore compatibility
      const reportToSave = {
        ...report,
        geometry: {
          ...report.geometry,
          coordinates: report.geometry.type === 'Polygon' 
            ? JSON.stringify(report.geometry.coordinates)
            : report.geometry.coordinates
        }
      };
      
      const docRef = await addDoc(collection(db, 'floodReports'), {
        ...reportToSave,
        createdAt: new Date().toISOString()
      });
      loadFloodReports();
    } catch (error) {
      console.error('Error saving flood report:', error);
      alert('Failed to save report. Please try again.');
    }
  }, [loadFloodReports]);

  // Load flood risk areas from Firebase
  const loadFloodRiskAreas = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'floodRiskAreas'));
      const areas: FloodRiskArea[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Parse geometry coordinates back from JSON string for polygons
        const area = {
          id: doc.id,
          ...data,
          geometry: {
            ...data.geometry,
            coordinates: data.geometry.type === 'Polygon' && typeof data.geometry.coordinates === 'string'
              ? JSON.parse(data.geometry.coordinates)
              : data.geometry.coordinates
          }
        } as FloodRiskArea;
        areas.push(area);
      });
      setFloodRiskAreas(areas);
    } catch (error) {
      console.error('Error loading flood risk areas:', error);
      // Don't show alert for permission errors during initial load
      if (error instanceof Error && !error.message.includes('Missing or insufficient permissions')) {
        alert('Failed to load flood risk areas. Please try again.');
      }
    }
  }, []);

  // Save flood risk area to Firebase
  const saveFloodRiskArea = useCallback(async (area: Omit<FloodRiskArea, 'id' | 'createdAt'>) => {
    try {
      // Serialize polygon coordinates for Firestore compatibility
      const areaToSave = {
        ...area,
        geometry: {
          ...area.geometry,
          coordinates: area.geometry.type === 'Polygon' 
            ? JSON.stringify(area.geometry.coordinates)
            : area.geometry.coordinates
        }
      };
      
      const docRef = await addDoc(collection(db, 'floodRiskAreas'), {
        ...areaToSave,
        createdAt: new Date().toISOString()
      });
      loadFloodRiskAreas();
    } catch (error) {
      console.error('Error saving flood risk area:', error);
      alert('Failed to save risk area. Please try again.');
    }
  }, [loadFloodRiskAreas]);

  // Delete flood report
  const deleteFloodReport = useCallback(async (reportId: string) => {
    try {
      await deleteDoc(doc(db, 'floodReports', reportId));
      loadFloodReports();
    } catch (error) {
      console.error('Error deleting flood report:', error);
      alert('Failed to delete report. Please try again.');
    }
  }, [loadFloodReports]);

  // Handle drawing tool selection
  const handleDrawingTool = useCallback((tool: 'marker' | 'polygon' | 'delete') => {
    setDrawingState({
      isDrawing: true,
      currentTool: drawingState.currentTool === tool ? null : tool,
      pendingGeometry: null
    });
    setPolygonPoints([]);
  }, [drawingState.currentTool]);

  // Handle map click for drawing
  const handleMapClick = useCallback((event: any) => {
    if (!drawingState.currentTool) return;

    const { lng, lat } = event.lngLat;

    if (drawingState.currentTool === 'marker') {
      const geometry = {
        type: 'Point' as const,
        coordinates: [lng, lat]
      };
      setDrawingState(prev => ({ ...prev, pendingGeometry: geometry }));
      setShowReportModal(true);
    } else if (drawingState.currentTool === 'polygon') {
      // Add point to polygon
      setPolygonPoints(prev => [...prev, [lng, lat]]);
    } else if (drawingState.currentTool === 'delete') {
      // Handle deletion of existing shapes
      const features = mapRef.current?.queryRenderedFeatures(event.point);
      if (features && features.length > 0) {
        const reportFeature = features.find((f: any) => f.source === 'flood-reports');
        if (reportFeature && reportFeature.properties?.reportId) {
          deleteFloodReport(reportFeature.properties.reportId);
        }
        const feature = features.find((f: any) => f.source === 'flood-reports');
        if (feature && feature.properties?.reportId) {
          deleteFloodReport(feature.properties.reportId);
        }
      }
    }
  }, [drawingState, deleteFloodReport]);

  // Complete polygon drawing
  const completePolygon = useCallback(() => {
    if (polygonPoints.length >= 3) {
      const geometry = {
        type: 'Polygon' as const,
        coordinates: [[...polygonPoints, polygonPoints[0]]] // Close the polygon
      };
      setDrawingState(prev => ({ ...prev, pendingGeometry: geometry }));
      setShowReportModal(true);
      setPolygonPoints([]);
    }
  }, [polygonPoints]);

  // Handle report submission
  const handleReportSubmit = useCallback((report: Omit<FloodReport, 'id' | 'createdAt'>) => {
    saveFloodReport(report);
    setDrawingState({ isDrawing: false, currentTool: null, pendingGeometry: null });
    setShowReportModal(false);
  }, [saveFloodReport]);

  // Handle risk area submission
  const handleRiskAreaSubmit = useCallback((area: Omit<FloodRiskArea, 'id' | 'createdAt'>) => {
    saveFloodRiskArea(area);
    setDrawingState({ isDrawing: false, currentTool: null, pendingGeometry: null });
    setShowRiskAreaModal(false);
  }, [saveFloodRiskArea]);

  // Handle shape click to show popup
  const handleShapeClick = useCallback((event: any) => {
    if (drawingState.currentTool === 'delete') return;

    const features = mapRef.current?.queryRenderedFeatures(event.point);
    if (features && features.length > 0) {
      const feature = features.find((f: any) => f.source === 'flood-reports');
      if (feature && feature.properties?.reportId) {
        const report = floodReports.find(r => r.id === feature.properties.reportId);
        if (report) {
          setSelectedReport(report);
          setPopupPosition({ x: event.point.x, y: event.point.y });
        }
      }
    }
  }, [drawingState.currentTool, floodReports]);

  // Load reports on component mount
  useEffect(() => {
    loadFloodReports();
    loadFloodRiskAreas();
  }, [loadFloodReports, loadFloodRiskAreas]);

  // Create GeoJSON data for flood reports
  const floodReportsGeoJSON = {
    type: 'FeatureCollection' as const,
    features: floodReports.map(report => ({
      type: 'Feature' as const,
      properties: {
        reportId: report.id,
        riskLevel: report.riskLevel,
        color: RISK_COLORS[report.riskLevel]
      },
      geometry: report.geometry
    }))
  };

  // Create GeoJSON data for flood risk areas
  const floodRiskAreasGeoJSON = {
    type: 'FeatureCollection' as const,
    features: floodRiskAreas.map(area => ({
      type: 'Feature' as const,
      properties: {
        areaId: area.id,
        riskLevel: area.riskLevel,
        name: area.basicInfo.name,
        color: RISK_COLORS[area.riskLevel]
      },
      geometry: area.geometry
    }))
  };

  const isDarkTheme = currentLayer === 'streets' || currentLayer === 'terrain' || currentLayer === 'topographic';
  const panelClasses = isDarkTheme 
    ? 'bg-gray-900/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-700/50'
    : 'bg-white/20 backdrop-blur-md rounded-xl shadow-lg border border-white/30';
  const textClasses = isDarkTheme ? 'text-white' : 'text-white';
  const inputClasses = isDarkTheme
    ? 'w-full pl-10 pr-4 py-2.5 bg-gray-800/80 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-200'
    : 'w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-200';
  const buttonClasses = isDarkTheme
    ? 'bg-gray-800/80 hover:bg-gray-700/80'
    : 'bg-white/10 hover:bg-white/20';
  const iconBgClasses = isDarkTheme
    ? 'p-2 bg-blue-600/90 rounded-lg'
    : 'p-2 bg-blue-500/80 rounded-lg';
  const formatCoordinate = (value: number, isLongitude: boolean) => {
    const direction = isLongitude 
      ? (value >= 0 ? 'E' : 'W')
      : (value >= 0 ? 'N' : 'S');
    return `${Math.abs(value).toFixed(4)}° ${direction}`;
  };

  const getCurrentMapStyle = () => {
    return BASEMAPS[currentLayer].style;
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        onClick={handleMapClick}
        mapStyle={getCurrentMapStyle()}
        style={{ width: '100%', height: '100%' }}
        scrollZoom={{ smooth: true }}
        dragPan={{ inertia: 300 }}
        dragRotate={true}
        touchZoom={true}
        touchRotate={true}
        keyboard={true}
        doubleClickZoom={true}
        interactiveLayerIds={['flood-reports-fill', 'flood-reports-circle']}
        onMouseEnter={() => {
          if (mapRef.current) {
            mapRef.current.getCanvas().style.cursor = drawingState.currentTool ? 'crosshair' : 'pointer';
          }
        }}
        onMouseLeave={() => {
          if (mapRef.current) {
            mapRef.current.getCanvas().style.cursor = '';
          }
        }}
      >
        {/* Flood Risk Areas Layer */}
        <Source id="flood-risk-areas" type="geojson" data={floodRiskAreasGeoJSON}>
          {/* Polygon fill layer */}
          <Layer
            id="flood-risk-areas-fill"
            type="fill"
            filter={['==', ['geometry-type'], 'Polygon']}
            paint={{
              'fill-color': ['get', 'color'],
              'fill-opacity': 0.2
            }}
          />
          {/* Polygon outline layer */}
          <Layer
            id="flood-risk-areas-outline"
            type="line"
            filter={['==', ['geometry-type'], 'Polygon']}
            paint={{
              'line-color': ['get', 'color'],
              'line-width': 3,
              'line-opacity': 0.9
            }}
          />
          {/* Point/marker layer */}
          <Layer
            id="flood-risk-areas-circle"
            type="circle"
            filter={['==', ['geometry-type'], 'Point']}
            paint={{
              'circle-color': ['get', 'color'],
              'circle-radius': 10,
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 3,
              'circle-opacity': 0.8
            }}
          />
        </Source>

        {/* Flood Reports Layer */}
        <Source id="flood-reports" type="geojson" data={floodReportsGeoJSON}>
          {/* Polygon fill layer */}
          <Layer
            id="flood-reports-fill"
            type="fill"
            filter={['==', ['geometry-type'], 'Polygon']}
            paint={{
              'fill-color': ['get', 'color'],
              'fill-opacity': 0.3
            }}
          />
          {/* Polygon outline layer */}
          <Layer
            id="flood-reports-outline"
            type="line"
            filter={['==', ['geometry-type'], 'Polygon']}
            paint={{
              'line-color': ['get', 'color'],
              'line-width': 2,
              'line-opacity': 0.8
            }}
          />
          {/* Point/marker layer */}
          <Layer
            id="flood-reports-circle"
            type="circle"
            filter={['==', ['geometry-type'], 'Point']}
            paint={{
              'circle-color': ['get', 'color'],
              'circle-radius': 8,
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 2,
              'circle-opacity': 0.8
            }}
          />
        </Source>

        {/* Drawing preview for polygon */}
        {drawingState.currentTool === 'polygon' && polygonPoints.length > 0 && (
          <Source
            id="polygon-preview"
            type="geojson"
            data={{
              type: 'FeatureCollection',
              features: [{
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: polygonPoints
                }
              }]
            }}
          >
            <Layer
              id="polygon-preview-line"
              type="line"
              paint={{
                'line-color': '#3B82F6',
                'line-width': 2,
                'line-dasharray': [2, 2]
              }}
            />
          </Source>
        )}
      </Map>

      {/* Top Left Panel - App Title & Search */}
      <div className="absolute top-4 left-4 z-10">
        <div className={`${panelClasses} p-4 min-w-80`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={iconBgClasses}>
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <h1 className={`${textClasses} font-semibold text-lg tracking-tight`}>
              Earth Explorer
            </h1>
          </div>
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isDarkTheme ? 'text-gray-400' : 'text-gray-300'}`} />
            <input
              type="text"
              placeholder="Search places..."
              className={inputClasses}
            />
          </div>
        </div>
      </div>

      {/* Top Right Panel - Map Controls */}
      <div className="absolute top-4 right-4 z-10">
        <div className={`${panelClasses} p-3`}>
          <div className="flex flex-col gap-2">
            {/* Zoom Controls */}
            <div className="flex flex-col">
              <button
                onClick={handleZoomIn}
                className={`p-2.5 ${buttonClasses} rounded-t-lg border-b ${isDarkTheme ? 'border-gray-600/50' : 'border-white/20'} 
                         ${textClasses} transition-all duration-200 hover:scale-105 active:scale-95`}
                title="Zoom In"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={handleZoomOut}
                className={`p-2.5 ${buttonClasses} rounded-b-lg 
                         ${textClasses} transition-all duration-200 hover:scale-105 active:scale-95`}
                title="Zoom Out"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>

            {/* Location Button */}
            <button
              onClick={handleCurrentLocation}
              className={`p-2.5 ${buttonClasses} hover:bg-blue-500/50 rounded-lg mt-2
                       ${textClasses} transition-all duration-200 hover:scale-105 active:scale-95`}
              title="Go to Current Location"
            >
              <Crosshair className="w-4 h-4" />
            </button>

            {/* Basemap Selector */}
            <div className="relative">
              <button
                onClick={() => setShowBasemapMenu(!showBasemapMenu)}
                className={`p-2.5 ${buttonClasses} hover:bg-green-500/50 rounded-lg
                         ${textClasses} transition-all duration-200 hover:scale-105 active:scale-95
                         flex items-center gap-1`}
                title="Select Basemap"
              >
                <Layers className="w-4 h-4" />
                <ChevronDown className="w-3 h-3" />
              </button>
              
              {showBasemapMenu && (
                <div className={`absolute right-0 top-full mt-2 ${panelClasses} min-w-40 z-20`}>
                  {Object.entries(BASEMAPS).map(([key, basemap]) => (
                    <button
                      key={key}
                      onClick={() => handleBasemapSelect(key as BasemapKey)}
                      className={`w-full text-left px-3 py-2 text-sm ${textClasses} ${isDarkTheme ? 'hover:bg-gray-700/80' : 'hover:bg-white/20'} 
                                transition-colors duration-200 first:rounded-t-lg last:rounded-b-lg
                                ${currentLayer === key ? (isDarkTheme ? 'bg-green-600/40' : 'bg-green-500/30') : ''}`}
                    >
                      {basemap.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Right Panel - Additional Tools */}
      <div className="absolute bottom-4 right-4 z-10 space-y-3">
        {/* Drawing Tools Panel */}
        <div className={`${panelClasses} p-3`}>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleDrawingTool('marker')}
              className={`p-2.5 rounded-lg text-white transition-all duration-200 hover:scale-105 active:scale-95 ${
                drawingState.currentTool === 'marker'
                  ? (isDarkTheme ? 'bg-green-600/70 hover:bg-green-600/90' : 'bg-green-500/60 hover:bg-green-500/80')
                  : `${buttonClasses} hover:bg-green-500/50`
              }`}
              title="Add Marker"
            >
              <MapPin className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => handleDrawingTool('polygon')}
              className={`p-2.5 rounded-lg text-white transition-all duration-200 hover:scale-105 active:scale-95 ${
                drawingState.currentTool === 'polygon'
                  ? (isDarkTheme ? 'bg-purple-600/70 hover:bg-purple-600/90' : 'bg-purple-500/60 hover:bg-purple-500/80')
                  : `${buttonClasses} hover:bg-purple-500/50`
              }`}
              title="Draw Polygon"
            >
              <Square className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => handleDrawingTool('delete')}
              className={`p-2.5 rounded-lg text-white transition-all duration-200 hover:scale-105 active:scale-95 ${
                drawingState.currentTool === 'delete'
                  ? (isDarkTheme ? 'bg-red-600/70 hover:bg-red-600/90' : 'bg-red-500/60 hover:bg-red-500/80')
                  : `${buttonClasses} hover:bg-red-500/50`
              }`}
              title="Delete Shapes"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Weather Tools Panel */}
        <div className={`${panelClasses} p-3`}>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setShowWeather(!showWeather)}
              className={`p-2.5 rounded-lg text-white transition-all duration-200 hover:scale-105 active:scale-95 ${
                showWeather 
                  ? (isDarkTheme ? 'bg-blue-600/70 hover:bg-blue-600/90' : 'bg-blue-500/60 hover:bg-blue-500/80')
                  : `${buttonClasses} hover:bg-blue-500/50`
              }`}
              title="Toggle Weather Layer"
            >
              <Cloud className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => setShowFlood(!showFlood)}
              className={`p-2.5 rounded-lg text-white transition-all duration-200 hover:scale-105 active:scale-95 ${
                showFlood 
                  ? (isDarkTheme ? 'bg-blue-700/70 hover:bg-blue-700/90' : 'bg-blue-600/60 hover:bg-blue-600/80')
                  : `${buttonClasses} hover:bg-blue-600/50`
              }`}
              title="Toggle Flood Reports"
            >
              <Droplets className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Left Panel - Coordinates, Zoom & Legend */}
      <div className="absolute bottom-4 left-4 z-10">
        <div className={`${panelClasses} p-3 space-y-4`}>
          {/* Coordinates & Zoom */}
          <div className={`${textClasses} text-sm font-mono space-y-1`}>
            <div className="flex items-center gap-2">
              <span className={isDarkTheme ? 'text-gray-400' : 'text-gray-300'}>Lat:</span>
              <span>{formatCoordinate(viewState.latitude, false)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={isDarkTheme ? 'text-gray-400' : 'text-gray-300'}>Lng:</span>
              <span>{formatCoordinate(viewState.longitude, true)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={isDarkTheme ? 'text-gray-400' : 'text-gray-300'}>Zoom:</span>
              <span>{viewState.zoom.toFixed(1)}</span>
            </div>
            <div className={`flex items-center gap-2 pt-1 border-t ${isDarkTheme ? 'border-gray-600/50' : 'border-white/20'}`}>
              <span className={isDarkTheme ? 'text-gray-400' : 'text-gray-300'}>Layer:</span>
              <span>{BASEMAPS[currentLayer].name}</span>
            </div>
          </div>

          {/* Risk Level Legend */}
          <div className={`pt-3 border-t ${isDarkTheme ? 'border-gray-600/50' : 'border-white/20'}`}>
            <h3 className={`${textClasses} text-sm font-semibold mb-2`}>Risk Levels</h3>
            <div className="space-y-1">
              {Object.entries(RISK_COLORS).map(([level, color]) => (
                <div key={level} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full border border-white/50"
                    style={{ backgroundColor: color }}
                  />
                  <span className={`${textClasses} text-xs`}>{level}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Status Indicators */}
      {(showWeather || showFlood) && (
        <div className="absolute top-20 right-4 z-10">
          <div className={`${panelClasses} p-3`}>
            <div className={`${textClasses} text-sm space-y-2`}>
              {showWeather && (
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-blue-400" />
                  <span>Weather Layer Active</span>
                </div>
              )}
              {showFlood && (
                <div className="flex items-center gap-2">
                  <Droplets className={`w-4 h-4 ${isDarkTheme ? 'text-blue-500' : 'text-blue-600'}`} />
                  <span>Flood Reports Active</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Drawing Instructions */}
      {drawingState.currentTool && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
          <div className={`${panelClasses} p-4 max-w-sm`}>
            <p className={`${textClasses} text-sm text-center`}>
              {drawingState.currentTool === 'marker' && 'Click on the map to place a flood marker'}
              {drawingState.currentTool === 'polygon' && (
                <>
                  Click to add points ({polygonPoints.length} points added).
                  <br />
                  Double-click to finish polygon (minimum 3 points).
                </>
              )}
              {drawingState.currentTool === 'delete' && 'Click on any shape to delete it'}
            </p>
            <button
              onClick={() => setDrawingState({ isDrawing: false, currentTool: null, pendingGeometry: null })}
              className={`mt-2 w-full px-3 py-1.5 ${buttonClasses} rounded-lg ${textClasses} text-sm transition-colors`}
            >
              Cancel
            </button>
            {drawingState.currentTool === 'polygon' && polygonPoints.length >= 3 && (
              <button
                onClick={completePolygon}
                className={`mt-2 w-full px-3 py-1.5 bg-green-500/60 hover:bg-green-500/80 rounded-lg ${textClasses} text-sm transition-colors`}
              >
                Finish Polygon
              </button>
            )}
          </div>
        </div>
      )}

      {/* Flood Report Modal */}
      <FloodReportModal
        isOpen={showReportModal}
        onClose={() => {
          setShowReportModal(false);
          setDrawingState({ isDrawing: false, currentTool: null, pendingGeometry: null });
          setPolygonPoints([]);
        }}
        onSubmit={handleReportSubmit}
        geometry={drawingState.pendingGeometry}
        location={`${formatCoordinate(viewState.latitude, false)}, ${formatCoordinate(viewState.longitude, true)}`}
      />

      {/* Flood Risk Area Modal */}
      <FloodRiskAreaModal
        isOpen={showRiskAreaModal}
        onClose={() => {
          setShowRiskAreaModal(false);
          setDrawingState({ isDrawing: false, currentTool: null, pendingGeometry: null });
          setPolygonPoints([]);
        }}
        onSubmit={handleRiskAreaSubmit}
        geometry={drawingState.pendingGeometry}
        location={`${formatCoordinate(viewState.latitude, false)}, ${formatCoordinate(viewState.longitude, true)}`}
      />

      {/* Flood Report Popup */}
      {selectedReport && popupPosition && (
        <FloodReportPopup
          report={selectedReport}
          position={popupPosition}
          onClose={() => {
            setSelectedReport(null);
            setPopupPosition(null);
          }}
        />
      )}
    </div>
  );
}

export default App;