import { MapIcon, Satellite, Map, Navigation } from 'lucide-react';

export const BASEMAP_OPTIONS = [
    {
        id: 'satellite',
        name: 'Citra Satelit',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        thumbnail: '/icons/basemaps/satelit.png',
        attribution: '&copy; Esri',
        icon: 'Satellite'
    },
    {
        id: 'rbi-big',
        name: 'Rupabumi Indonesia',
        url: 'https://peta.big.go.id/arcgis/rest/services/BASEMAP/Rupabumi_Indonesia/MapServer',
        thumbnail: '/icons/basemaps/satelit.png',
        attribution: 'Badan Informasi Geospasial',
        icon: 'Map'
    },
    {
        id: 'streets',
        name: 'Jalan',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        thumbnail: '/icons/basemaps/satelit.png',
        attribution: '&copy; OpenStreetMap France',
        icon: 'Navigation'
    },
];

export default function BasemapPanel({ onSelect, activeUrl }) {
  const getIcon = (iconName) => {
    switch(iconName) {
      case 'Satellite': return <Satellite size={18} />;
      case 'Map': return <Map size={18} />;
      case 'Navigation': return <Navigation size={18} />;
      default: return <MapIcon size={18} />;
    }
  };

  return (
    <div 
      className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800"
      onWheel={(e) => e.stopPropagation()}
    >
      {/* HEADER */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50">
        <h3 className="font-black text-lg uppercase tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <MapIcon size={20}/>
          Basemap
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Pilih peta dasar</p>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {BASEMAP_OPTIONS.map((map) => (
          <button
            key={map.id}
            onClick={() => onSelect(map.url, map.attribution)}
            className={`group w-full p-4 rounded-2xl transition-all border-2 flex items-center gap-4 ${
              activeUrl === map.url 
                ? 'border-cyan-500 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 shadow-lg shadow-cyan-500/20' 
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-cyan-300 hover:shadow-md'
            }`}
          >
            <div className={`w-16 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${
              activeUrl === map.url 
                ? 'border-cyan-400 shadow-lg shadow-cyan-500/30' 
                : 'border-slate-200 dark:border-slate-600 group-hover:border-cyan-300'
            }`}>
              <img 
                src={map.thumbnail} 
                alt={map.name} 
                className="w-full h-full object-cover"
                onError={(e) => e.target.src = 'https://via.placeholder.com/150?text=No+Image'} 
              />
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2 mb-1">
                <span className={activeUrl === map.url ? 'text-cyan-600' : 'text-slate-400'}>
                  {getIcon(map.icon)}
                </span>
                <span className={`text-sm font-bold ${
                  activeUrl === map.url 
                    ? 'text-cyan-700 dark:text-cyan-400' 
                    : 'text-slate-700 dark:text-slate-300'
                }`}>
                  {map.name}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {map.attribution}
              </p>
            </div>
            {activeUrl === map.url && (
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/50 animate-pulse" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}