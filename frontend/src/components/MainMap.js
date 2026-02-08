"use client";
import { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, ScaleControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';

import MapStuff from './MapStuff';
import GeoAI from './panel/geoai';
import BasemapPanel, { BASEMAP_OPTIONS } from './panel/basemap';
import LayersPanel from './panel/layers';
import RadiusPanel from './panel/radius';
import AnalysisPanel from './panel/analysis';

export default function MainMap({ activePanel, setActivePanel }) {
  // STATE UTAMA
  const [currentBasemap, setCurrentBasemap] = useState(BASEMAP_OPTIONS[0].url);
  const [activeLayers, setActiveLayers] = useState([]);
  const [data, setData] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [goHome, setGoHome] = useState(false);
  const [activeRadius, setActiveRadius] = useState(null);
  
  // STATE UNTUK ANALYSIS
  const [activeAnalysisId, setActiveAnalysisId] = useState(null);
  const [activeAnalysisData, setActiveAnalysisData] = useState(null);
  
  // DATA RBI
  const [rbiData, setRbiData] = useState({});

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch data awal dari MongoDB
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/features/');
        if (!res.ok) throw new Error('Gagal mengambil data');
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Error:", err);
        toast.error('Gagal memuat data peta');
      }
    };
    
    fetchData();
  }, []);

  // Fetch data analysis detail
  useEffect(() => {
    if (!activeAnalysisId) {
      setActiveAnalysisData(null);
      return;
    }

    const fetchAnalysisDetail = async () => {
      try {
        const response = await axios.get(`http://127.0.0.1:8000/api/analysis/${activeAnalysisId}/`);
        setActiveAnalysisData(response.data);
        toast.success('Data analisis dimuat');
      } catch (error) {
        console.error('Error fetching analysis detail:', error);
        toast.error('Gagal memuat detail analisis');
        setActiveAnalysisId(null);
      }
    };

    fetchAnalysisDetail();
  }, [activeAnalysisId]);
  
  // Fetch data RBI
  useEffect(() => {
    activeLayers.forEach(layerId => {
      if (layerId.startsWith('batas_')) return;
      
      if (!rbiData[layerId]) {
        const parts = layerId.split('_');
        const kategori = parts[0];
        const wilayah = parts.slice(1).join('_');
        
        const endpoint = kategori === 'pendidikan' 
          ? '/api/rbi-pendidikan/' 
          : '/api/rbi-kesehatan/';
        
        axios.get(`http://127.0.0.1:8000${endpoint}?wilayah=${wilayah}`)
          .then(res => {
            setRbiData(prev => ({ ...prev, [layerId]: res.data }));
          })
          .catch(err => {
            console.error(`Gagal ambil data ${layerId}`, err);
            toast.error(`Gagal memuat data ${layerId}`);
          });
      }
    });
  }, [activeLayers]);
  
  // Helper functions
  const getCategoryColor = (cat) => {
    switch (cat?.toLowerCase()) {
      case 'bangunan': return '#f59e0b';
      case 'pepohonan': return '#16a34a';
      case 'perairan': return '#2563eb';
      case 'jalan': return '#64748b';
      case 'pendidikan': return '#3b82f6';
      case 'kesehatan': return '#10b981';
      default: return '#ef4444';
    }
  };
  
  const toggleLayer = (layerId) => {
    setActiveLayers(prev => 
      prev.includes(layerId) 
        ? prev.filter(id => id !== layerId) 
        : [...prev, layerId]
    );
  };
  
  const toggleProvinsi = (cities, isSelected) => {
    if (isSelected) {
      setActiveLayers(prev => prev.filter(id => !cities.includes(id)));
    } else {
      setActiveLayers(prev => {
        const newLayers = [...prev];
        cities.forEach(city => {
          if (!newLayers.includes(city)) newLayers.push(city);
        });
        return newLayers;
      });
    }
  };

  // Panel positioning - desktop vs mobile
  const getPanelClasses = () => {
    if (isMobile) {
      return "fixed top-16 bottom-20 left-0 right-0 w-full rounded-none";
    } else {
      return "fixed top-20 bottom-20 right-20 w-80 rounded-2xl";
    }
  };

  return (
    <div className="h-screen w-full relative overflow-hidden bg-slate-900">
      
      {/* PANEL BASEMAP - DI LUAR MAP (tidak butuh useMap) */}
      {activePanel === 'basemap' && (
        <aside className={`${getPanelClasses()} shadow-2xl z-[1050] bg-white dark:bg-slate-900 overflow-hidden`}>
          <BasemapPanel 
            activeUrl={currentBasemap}
            onSelect={(url) => setCurrentBasemap(url)}
          />
        </aside>
      )}
      
      {/* PANEL LAYERS - DI LUAR MAP (tidak butuh useMap) */}
      {activePanel === 'layers' && (
        <aside className={`${getPanelClasses()} shadow-2xl z-[1050] bg-white dark:bg-slate-900 overflow-hidden`}>
          <LayersPanel 
            activeLayers={activeLayers} 
            onToggleLayer={toggleLayer}
            rbiData={rbiData}
            onToggleProvinsi={toggleProvinsi}
          />
        </aside>
      )}

      {/* PANEL ANALYSIS - DI LUAR MAP (tidak butuh useMap) */}
      {activePanel === 'analysis' && (
        <aside className={`${getPanelClasses()} shadow-2xl z-[1050] bg-white dark:bg-slate-900 overflow-hidden`}>
          <AnalysisPanel 
            onClose={() => setActivePanel(null)}
            activeAnalysisId={activeAnalysisId}
            setActiveAnalysisId={setActiveAnalysisId}
          />
        </aside>
      )}

      {/* PETA UTAMA */}
      <MapContainer
        center={[-2.5, 118]}
        zoom={5}
        minZoom={3}
        maxZoom={22}
        className="h-full w-full z-0"
        zoomControl={false}
        doubleClickZoom={false}
      >
        <TileLayer
          url={currentBasemap}
          attribution='&copy; OpenStreetMap'
          maxZoom={22}
        />
        
        {/* MAP COMPONENTS */}
        <MapStuff
          activePanel={activePanel}
          activeLayers={activeLayers}
          data={data}
          previewData={previewData}
          goHome={goHome}
          rbiData={rbiData}
          activeAnalysisData={activeAnalysisData}
          
          setGoHome={setGoHome}
          setPreviewData={setPreviewData}
          setActivePanel={setActivePanel}
          getCategoryColor={getCategoryColor}
          
          onRefreshData={() => {
            fetch('http://127.0.0.1:8000/api/features/')
              .then(res => res.json())
              .then(json => setData(json));
          }}
        />

        {/* PANEL RADIUS - DI DALAM MAP (butuh useMap) */}
        {activePanel === 'radius' && (
          <div className="leaflet-top leaflet-right" style={{ pointerEvents: 'none' }}>
            <aside className={`${getPanelClasses()} shadow-2xl z-[1050] bg-white dark:bg-slate-900 overflow-hidden`} style={{ pointerEvents: 'auto' }}>
              <RadiusPanel 
                activeRadius={activeRadius}
                setActiveRadius={setActiveRadius}
                onRadiusCreated={(radius) => {
                  console.log('Radius dibuat:', radius);
                }}
                onRadiusCleared={(id) => {
                  console.log('Radius dihapus:', id);
                }}
              />
            </aside>
          </div>
        )}
        
        {/* PANEL GEOAI - DI DALAM MAP (butuh useMap) */}
        {activePanel === 'geoai' && (
          <div className="leaflet-top leaflet-right" style={{ pointerEvents: 'none' }}>
            <aside className={`${getPanelClasses()} shadow-2xl z-[1050] bg-white dark:bg-slate-900 overflow-hidden`} style={{ pointerEvents: 'auto' }}>
              <GeoAI 
                onNewData={() => {
                  fetch('http://127.0.0.1:8000/api/features/')
                    .then(res => res.json())
                    .then(json => setData(json));
                }}
                onDetectionComplete={(res) => setPreviewData(res)}
                onClearPreview={() => setPreviewData([])}
                previewData={previewData}
                setPreviewData={setPreviewData}
              />
            </aside>
          </div>
        )}

        <ScaleControl position="bottomleft" />
      </MapContainer>
    </div>
  );
}