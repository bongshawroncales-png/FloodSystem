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
import { FloodLevel, DrawingState, FloodRiskArea } from './types';
import { FloodRiskAreaModal } from './components/FloodRiskAreaModal';
import { FloodRiskAreaPopup } from './components/FloodRiskAreaPopup';
import { HoverTooltip } from './components/HoverTooltip';
import { Sidebar } from './components/Sidebar';
import { WeatherPanel } from './components/WeatherPanel';
import { LiveRiskMonitor } from './components/LiveRiskMonitor';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';

const SATELLITE_STYLE = {
  version: 8,
  name: 'Satellite',
  metadata: {
    'mapbox:autocomposite': false,
    'mapbox:type': 'template'
  },
  glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
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
  glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
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
  glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
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
  glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
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
  glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
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
    longitude: 125.375,
    latitude: 12.1116,
    zoom: 17,
    bearing: 0,
    pitch: 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 }
  });

  const [currentLayer, setCurrentLayer] = useState<BasemapKey>('satellite');
  const [showBasemapMenu, setShowBasemapMenu] = useState(false);
  const [floodRiskAreas, setFloodRiskAreas] = useState<FloodRiskArea[]>([]);
  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    currentTool: null,
    pendingGeometry: null
  });
  const [showRiskAreaModal, setShowRiskAreaModal] = useState(false);
  const [polygonPoints, setPolygonPoints] = useState<number[][]>([]);
  const [selectedRiskArea, setSelectedRiskArea] = useState<FloodRiskArea | null>(null);
  const [riskAreaPopupPosition, setRiskAreaPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const [hoveredRiskArea, setHoveredRiskArea] = useState<FloodRiskArea | null>(null);
  const [hoverTooltipPosition, setHoverTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [showLegend, setShowLegend] = useState(true);
  const mapRef = useRef<any>(null);


  // Center coordinates for Oras, Eastern Samar
  const CENTER_LAT = 12.1113;
  const CENTER_LNG = 125.3756;
  const MAX_RADIUS_KM = 3; // 3 kilometers radius limit

  // Function to calculate distance between two coordinates in kilometers
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Function to constrain coordinates within radius
  const constrainToRadius = (lat: number, lng: number): { lat: number; lng: number } => {
    const distance = calculateDistance(CENTER_LAT, CENTER_LNG, lat, lng);
    
    if (distance <= MAX_RADIUS_KM) {
      return { lat, lng };
    }
    
    // If outside radius, bounce back to center
    return {
      lat: CENTER_LAT,
      lng: CENTER_LNG
    };
  };
  // Effect to open risk area modal when geometry is ready
  useEffect(() => {
    if (drawingState.pendingGeometry && !showRiskAreaModal) {
      setShowRiskAreaModal(true);
    }
  }, [drawingState.pendingGeometry, showRiskAreaModal]);

  // Handle view state changes with radius constraint
  const handleViewStateChange = useCallback((evt: any) => {
    const constrainedCoords = constrainToRadius(evt.viewState.latitude, evt.viewState.longitude);
    
    // If coordinates were constrained (bounced back), animate to center
    if (constrainedCoords.lat !== evt.viewState.latitude || constrainedCoords.lng !== evt.viewState.longitude) {
      // Bounce back to center with animation
      setViewState(prev => ({
        ...prev,
        latitude: CENTER_LAT,
        longitude: CENTER_LNG,
        zoom: 14, // Zoom in a bit when bouncing back
        transitionDuration: 1000,
        transitionInterpolator: undefined
      }));
    } else {
      // Normal movement within radius
      setViewState({
        ...evt.viewState,
        latitude: constrainedCoords.lat,
        longitude: constrainedCoords.lng
      });
    }
  }, []);

  // Set up animation timer for flashing effects
  useEffect(() => {
    if (!mapRef.current || floodRiskAreas.length === 0) return;

    const map = mapRef.current.getMap();
    if (!map) return;

    const animationInterval = setInterval(() => {
      // Update the GeoJSON data source to trigger re-rendering with new animation time
      const source = map.getSource('flood-risk-areas');
      if (source && source.type === 'geojson') {
        const updatedGeoJSON = {
          ...floodRiskAreasGeoJSON,
          features: floodRiskAreasGeoJSON.features.map(feature => ({
            ...feature,
            properties: {
              ...feature.properties,
              animationTime: Date.now() / 1000
            }
          }))
        };
        source.setData(updatedGeoJSON);
      }
    }, 50); // Update every 50ms for smoother animation

    return () => {
      clearInterval(animationInterval);
    };
  }, [floodRiskAreas]);
  
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

  // Load flood risk areas from Firebase
  const loadFloodRiskAreas = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'floodRiskAreas'));
      const areas: FloodRiskArea[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        console.log('Loading area data:', data);
        
        let geometry = data.geometry;
        
        // Parse polygon coordinates back from JSON string
        if (data.geometry?.type === 'Polygon' && typeof data.geometry.coordinates === 'string') {
          try {
            geometry = {
              ...data.geometry,
              coordinates: JSON.parse(data.geometry.coordinates)
            };
          } catch (e) {
            console.error('Error parsing polygon coordinates:', e);
            return; // Skip this area if coordinates can't be parsed
          }
        }
        
        // Skip areas with empty coordinates
        if (!geometry?.coordinates || 
            (Array.isArray(geometry.coordinates) && geometry.coordinates.length === 0)) {
          console.warn('Skipping area with empty coordinates:', doc.id);
          return;
        }
        
        const area: FloodRiskArea = {
          id: doc.id,
          ...data,
          geometry
        };
        
        areas.push(area);
      });
      
      console.log('Loaded areas with valid coordinates:', areas.length);
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
      // Ensure coordinates are properly saved
      const areaToSave = { ...area };
      
      // For Polygon types, we need to stringify the coordinates for Firestore
      if (area.geometry.type === 'Polygon') {
        areaToSave.geometry = {
          ...area.geometry,
          coordinates: JSON.stringify(area.geometry.coordinates)
        };
      }
      
      console.log('Saving area with geometry:', areaToSave.geometry);
      
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

  // Delete flood risk area
  const deleteFloodRiskArea = useCallback(async (areaId: string) => {
    try {
      await deleteDoc(doc(db, 'floodRiskAreas', areaId));
      loadFloodRiskAreas();
    } catch (error) {
      console.error('Error deleting flood risk area:', error);
      alert('Failed to delete risk area. Please try again.');
    }
  }, [loadFloodRiskAreas]);

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
    console.log('Map click detected, current tool:', drawingState.currentTool);
    if (!drawingState.currentTool) return;

    const { lng, lat } = event.lngLat;
    console.log('Map clicked at coordinates:', lng, lat);

    if (drawingState.currentTool === 'marker') {
      const geometry = {
        type: 'Point' as const,
        coordinates: [lng, lat]
      };
      console.log('Creating Point geometry:', geometry);
      setDrawingState(prev => ({ ...prev, pendingGeometry: geometry }));
    } else if (drawingState.currentTool === 'polygon') {
      // Add point to polygon
      console.log('Adding point to polygon:', [lng, lat]);
      setPolygonPoints(prev => [...prev, [lng, lat]]);
    } else if (drawingState.currentTool === 'delete') {
      // Handle deletion of existing shapes
      const features = mapRef.current?.queryRenderedFeatures(event.point);
      if (features && features.length > 0) {
        const riskAreaFeature = features.find((f: any) => f.source === 'flood-risk-areas');
        if (riskAreaFeature && riskAreaFeature.properties?.areaId) {
          deleteFloodRiskArea(riskAreaFeature.properties.areaId);
        }
      }
    }
  }, [drawingState, deleteFloodRiskArea]);

  // Complete polygon drawing
  const completePolygon = useCallback(() => {
    if (polygonPoints.length >= 3) {
      console.log('Completing polygon with points:', polygonPoints);
      const geometry = {
        type: 'Polygon' as const,
        coordinates: [[...polygonPoints, polygonPoints[0]]] // Close the polygon
      };
      console.log('Created Polygon geometry:', geometry);
      setDrawingState(prev => ({ ...prev, pendingGeometry: geometry }));
      setPolygonPoints([]);
    }
  }, [polygonPoints]);

  // Handle risk area submission
  const handleRiskAreaSubmit = useCallback((area: Omit<FloodRiskArea, 'id' | 'createdAt'>) => {
    console.log('Submitting risk area with geometry:', area.geometry);
    saveFloodRiskArea(area);
    setDrawingState({ isDrawing: false, currentTool: null, pendingGeometry: null });
    setShowRiskAreaModal(false);
  }, [saveFloodRiskArea]);

  // Handle shape click to show popup
  const handleShapeClick = useCallback((event: any) => {
    if (drawingState.currentTool === 'delete') return;

    const features = mapRef.current?.queryRenderedFeatures(event.point);
    if (features && features.length > 0) {
      const feature = features.find((f: any) => f.source === 'flood-risk-areas');
      if (feature && feature.properties?.areaId) {
        const area = floodRiskAreas.find(a => a.id === feature.properties.areaId);
        if (area) {
          setSelectedRiskArea(area);
          setRiskAreaPopupPosition({ x: event.point.x, y: event.point.y });
        }
      }
    }
  }, [drawingState.currentTool, floodRiskAreas]);

  // Handle area selection from sidebar
  const handleAreaSelect = useCallback((area: FloodRiskArea) => {
    // Center map on the selected area
    let centerCoords;
    if (area.geometry.type === 'Point') {
      centerCoords = area.geometry.coordinates as number[];
    } else if (area.geometry.type === 'Polygon') {
      // Calculate centroid of polygon
      const coords = area.geometry.coordinates as number[][][];
      const firstRing = coords[0];
      const sumLat = firstRing.reduce((sum, coord) => sum + coord[1], 0);
      const sumLng = firstRing.reduce((sum, coord) => sum + coord[0], 0);
      centerCoords = [sumLng / firstRing.length, sumLat / firstRing.length];
    }
    
    if (centerCoords) {
      setViewState(prev => ({
        ...prev,
        longitude: centerCoords[0],
        latitude: centerCoords[1],
        zoom: Math.max(prev.zoom, 16),
        transitionDuration: 1000
      }));
      
      // Show popup after a short delay
      setTimeout(() => {
        setSelectedRiskArea(area);
        setRiskAreaPopupPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
      }, 1000);
    }
  }, []);
  // Handle mouse move for hover tooltips
  const handleMouseMove = useCallback((event: any) => {
    if (drawingState.currentTool === 'delete') {
      setHoveredRiskArea(null);
      setHoverTooltipPosition(null);
      return;
    }

    const features = mapRef.current?.queryRenderedFeatures(event.point);
    if (features && features.length > 0) {
      const feature = features.find((f: any) => f.source === 'flood-risk-areas');
      if (feature && feature.properties?.areaId) {
        const area = floodRiskAreas.find(a => a.id === feature.properties.areaId);
        if (area) {
          setHoveredRiskArea(area);
          setHoverTooltipPosition({ x: event.point.x, y: event.point.y });
          return;
        }
      }
    }
    
    // Clear hover state if not hovering over any area
    setHoveredRiskArea(null);
    setHoverTooltipPosition(null);
  }, [drawingState.currentTool, floodRiskAreas]);

  // Handle mouse leave to clear hover tooltips
  const handleMouseLeave = useCallback(() => {
    setHoveredRiskArea(null);
    setHoverTooltipPosition(null);
  }, []);

  // Load reports on component mount
  useEffect(() => {
    loadFloodRiskAreas();
  }, [loadFloodRiskAreas]);

  // Create GeoJSON data for flood risk areas
  const floodRiskAreasGeoJSON = {
    type: 'FeatureCollection' as const,
    features: floodRiskAreas.map(area => ({
      type: 'Feature' as const,
      properties: {
        areaId: area.id,
        riskLevel: area.riskLevel,
        name: area.basicInfo.name,
        color: RISK_COLORS[area.riskLevel],
        isHighRisk: area.riskLevel === 'High' || area.riskLevel === 'Severe',
        isSevereRisk: area.riskLevel === 'Severe',
        isModerateRisk: area.riskLevel === 'Moderate',
        animationTime: Date.now() / 1000 // Current time for animation calculations
      },
      geometry: area.geometry
    }))
  };

  // Debug: Log the GeoJSON data to console
  console.log('floodRiskAreasGeoJSON:', floodRiskAreasGeoJSON);
  console.log('floodRiskAreas state:', floodRiskAreas);
  console.log('GeoJSON features:', floodRiskAreasGeoJSON.features);
  floodRiskAreasGeoJSON.features.forEach((feature, index) => {
    console.log(`Feature ${index}:`, feature);
    console.log(`Feature ${index} geometry:`, feature.geometry);
    console.log(`Feature ${index} coordinates:`, feature.geometry.coordinates);
  });

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
        onMove={handleViewStateChange}
        onClick={handleMapClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        mapStyle={getCurrentMapStyle()}
        style={{ width: '100%', height: '100%' }}
        scrollZoom={{ smooth: true }}
        dragPan={{ inertia: 300 }}
        dragRotate={true}
        touchZoom={true}
        touchRotate={true}
        keyboard={true}
        doubleClickZoom={true}
        maxBounds={[
          [CENTER_LNG - 0.027, CENTER_LAT - 0.027], // Southwest corner (approximately 3km)
          [CENTER_LNG + 0.027, CENTER_LAT + 0.027]  // Northeast corner (approximately 3km)
        ]}
        onMouseEnter={() => {
          if (mapRef.current) {
            mapRef.current.getCanvas().style.cursor = drawingState.currentTool ? 'crosshair' : 'pointer';
          }
        }}
      >
        {/* Flood Risk Areas Layer */}
        <Source id="flood-risk-areas" type="geojson" data={floodRiskAreasGeoJSON}>
          {/* Point markers - simplified and more visible */}
          <Layer
            id="flood-risk-areas-circle"
            type="circle"
            filter={['all', ['==', ['geometry-type'], 'Point']]}
            paint={{
              'circle-color': ['get', 'color'],
              'circle-radius': [
                'case',
                ['get', 'isSevereRisk'], 22,
                ['get', 'isHighRisk'], 21,
                ['get', 'isModerateRisk'], 20,
                18
              ],
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 3,
              'circle-opacity': [
                'case',
                ['get', 'isSevereRisk'], 
                ['+', 0.7, ['*', 0.3, ['+', 1, ['sin', ['*', ['get', 'animationTime'], 4]]]]],
                ['get', 'isHighRisk'], 
                ['+', 0.75, ['*', 0.25, ['+', 1, ['sin', ['*', ['get', 'animationTime'], 3]]]]],
                0.85
              ],
              'circle-stroke-opacity': 1.0
            }}
            layout={{
              'visibility': 'visible'
            }}
          />
          
          {/* Glow effect layer for high/severe risk circles */}
          <Layer
            id="flood-risk-areas-circle-glow"
            type="circle"
            filter={['all', ['==', ['geometry-type'], 'Point'], ['any', ['get', 'isHighRisk'], ['get', 'isSevereRisk']]]}
            paint={{
              'circle-color': [
                'case',
                ['get', 'isSevereRisk'], '#EF4444',
                '#F97316'
              ],
              'circle-radius': [
                'case',
                ['get', 'isSevereRisk'], 
                ['+', 30, ['*', 8, ['+', 1, ['sin', ['*', ['get', 'animationTime'], 4]]]]],
                ['+', 28, ['*', 6, ['+', 1, ['sin', ['*', ['get', 'animationTime'], 3]]]]]
              ],
              'circle-opacity': [
                'case',
                ['get', 'isSevereRisk'], 
                ['*', 0.15, ['+', 1, ['sin', ['*', ['get', 'animationTime'], 4]]]],
                ['*', 0.12, ['+', 1, ['sin', ['*', ['get', 'animationTime'], 3]]]]
              ],
              'circle-blur': 1
            }}
            layout={{
              'visibility': 'visible'
            }}
          />
          
          {/* Polygon fill layer */}
          <Layer
            id="flood-risk-areas-fill"
            type="fill"
            filter={['all', ['==', ['geometry-type'], 'Polygon']]}
            paint={{
              'fill-color': ['get', 'color'],
              'fill-opacity': [
                'case',
                ['get', 'isSevereRisk'], 
                ['+', 0.4, ['*', 0.3, ['+', 1, ['sin', ['*', ['get', 'animationTime'], 4]]]]],
                ['get', 'isHighRisk'], 
                ['+', 0.45, ['*', 0.25, ['+', 1, ['sin', ['*', ['get', 'animationTime'], 3]]]]],
                0.4
              ]
            }}
            layout={{
              'visibility': 'visible'
            }}
          />
          
          {/* Glow effect layer for high/severe risk polygons */}
          <Layer
            id="flood-risk-areas-fill-glow"
            type="fill"
            filter={['all', ['==', ['geometry-type'], 'Polygon'], ['any', ['get', 'isHighRisk'], ['get', 'isSevereRisk']]]}
            paint={{
              'fill-color': [
                'case',
                ['get', 'isSevereRisk'], '#EF4444',
                '#F97316'
              ],
              'fill-opacity': [
                'case',
                ['get', 'isSevereRisk'], 
                ['*', 0.2, ['+', 1, ['sin', ['*', ['get', 'animationTime'], 4]]]],
                ['*', 0.15, ['+', 1, ['sin', ['*', ['get', 'animationTime'], 3]]]]
              ]
            }}
            layout={{
              'visibility': 'visible'
            }}
          />
          
          {/* Polygon outline layer */}
          <Layer
            id="flood-risk-areas-outline"
            type="line"
            filter={['all', ['==', ['geometry-type'], 'Polygon']]}
            paint={{
              'line-color': ['get', 'color'],
              'line-width': 3,
              'line-opacity': [
                'case',
                ['get', 'isSevereRisk'], 
                ['+', 0.7, ['*', 0.3, ['+', 1, ['sin', ['*', ['get', 'animationTime'], 4]]]]],
                ['get', 'isHighRisk'], 
                ['+', 0.75, ['*', 0.25, ['+', 1, ['sin', ['*', ['get', 'animationTime'], 3]]]]],
                0.8
              ]
            }}
            layout={{
              'visibility': 'visible'
            }}
          />
          
          {/* Glow effect layer for high/severe risk polygon outlines */}
          <Layer
            id="flood-risk-areas-outline-glow"
            type="line"
            filter={['all', ['==', ['geometry-type'], 'Polygon'], ['any', ['get', 'isHighRisk'], ['get', 'isSevereRisk']]]}
            paint={{
              'line-color': [
                'case',
                ['get', 'isSevereRisk'], '#EF4444',
                '#F97316'
              ],
              'line-width': 8,
              'line-opacity': [
                'case',
                ['get', 'isSevereRisk'], 
                ['*', 0.3, ['+', 1, ['sin', ['*', ['get', 'animationTime'], 4]]]],
                ['*', 0.25, ['+', 1, ['sin', ['*', ['get', 'animationTime'], 3]]]]
              ],
              'line-blur': 2
            }}
            layout={{
              'visibility': 'visible'
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

      {/* Sidebar */}
      <Sidebar
        floodRiskAreas={floodRiskAreas}
        onAreaSelect={handleAreaSelect}
        onAreaDelete={deleteFloodRiskArea}
        isDarkTheme={isDarkTheme}
      />

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

      {/* Weather Panel - Always visible */}
      <div className="absolute top-4 right-4 z-20 pointer-events-none" style={{ transform: 'translateX(-120px)' }}>
        <div className="pointer-events-auto">
          <WeatherPanel 
            coordinates={{ lat: viewState.latitude, lng: viewState.longitude }}
            isDarkTheme={isDarkTheme}
          />
        </div>
      </div>

      {/* Live Risk Monitor Panel */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none">
        <div className="pointer-events-auto">
          <LiveRiskMonitor 
            onRiskAreasUpdate={loadFloodRiskAreas}
            isDarkTheme={isDarkTheme}
          />
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
              title="Add Flood-Prone Point"
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
              title="Draw Flood-Prone Area"
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
              title="Delete Flood-Prone Areas"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Bottom Left Panel - Coordinates, Zoom & Legend */}
      <div className="absolute bottom-4 left-4 z-10">
        <div className={`${panelClasses} transition-all duration-300`}>
          {/* Collapsible Header */}
          <div className={`p-3 border-b ${isDarkTheme ? 'border-gray-600/50' : 'border-white/20'}`}>
            <button
              onClick={() => setShowLegend(!showLegend)}
              className={`flex items-center justify-between w-full ${textClasses} hover:opacity-80 transition-opacity`}
            >
              <span className="font-semibold text-sm">Legend</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showLegend ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Collapsible Content */}
          {showLegend && (
            <div className="p-3 space-y-4">
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
            <h3 className={`${textClasses} text-sm font-semibold mb-2`}>Flood Risk Levels</h3>
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
            <div className={`mt-2 pt-2 border-t ${isDarkTheme ? 'border-gray-600/50' : 'border-white/20'}`}>
              <p className={`${textClasses} text-xs`}>
                Flood-Prone Areas: {floodRiskAreas.length}
              </p>
              <p className={`${textClasses} text-xs mt-1`}>
                High Risk: {floodRiskAreas.filter(area => area.riskLevel === 'High' || area.riskLevel === 'Severe').length}
              </p>
            </div>
          </div>
        </div>
          )}
        </div>
      </div>

      {/* Drawing Instructions */}
      {drawingState.currentTool && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
          <div className={`${panelClasses} p-4 max-w-sm border-2 border-yellow-400 animate-pulse`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
              <span className={`${textClasses} font-semibold text-sm`}>Drawing Mode Active</span>
            </div>
            <p className={`${textClasses} text-sm text-center`}>
              {drawingState.currentTool === 'marker' && 'Click on the map to add a flood-prone point'}
              {drawingState.currentTool === 'polygon' && (
                <>
                  Click to add points for flood-prone area ({polygonPoints.length} points added).
                  <br />
                  Click "Finish Area" button when done (minimum 3 points).
                </>
              )}
              {drawingState.currentTool === 'delete' && 'Click on any flood-prone area to delete it'}
            </p>
            <button
              onClick={() => {
                console.log('Canceling drawing mode');
                setDrawingState({ isDrawing: false, currentTool: null, pendingGeometry: null });
                setPolygonPoints([]);
              }}
              className={`mt-2 w-full px-3 py-1.5 ${buttonClasses} rounded-lg ${textClasses} text-sm transition-colors`}
            >
              Cancel
            </button>
            {drawingState.currentTool === 'polygon' && polygonPoints.length >= 3 && (
              <button
                onClick={completePolygon}
                className={`mt-2 w-full px-3 py-1.5 bg-green-500/60 hover:bg-green-500/80 rounded-lg ${textClasses} text-sm transition-colors`}
              >
                Finish Area ({polygonPoints.length} points)
              </button>
            )}
          </div>
        </div>
      )}

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

      {/* Flood Risk Area Popup */}
      {selectedRiskArea && riskAreaPopupPosition && (
        <FloodRiskAreaPopup
          area={selectedRiskArea}
          position={riskAreaPopupPosition}
          onClose={() => {
            setSelectedRiskArea(null);
            setRiskAreaPopupPosition(null);
          }}
        />
      )}

      {/* Hover Tooltip */}
      {hoveredRiskArea && hoverTooltipPosition && (
        <HoverTooltip
          area={hoveredRiskArea}
          position={hoverTooltipPosition}
        />
      )}
    </div>
  );
}

export default App;