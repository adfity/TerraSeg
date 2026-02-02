export const BASEMAP_OPTIONS = [
    {
        id: 'satellite',
        name: 'Citra Satelit',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        thumbnail: '/icons/basemaps/satelit.png',
        attribution: '&copy; Esri'
    },
    {
        id: 'rbi-big',
        name: 'Rupabumi Indonesia',
        url: 'https://peta.big.go.id/arcgis/rest/services/BASEMAP/Rupabumi_Indonesia/MapServer',
        thumbnail: '/icons/basemaps/satelit.png',
        attribution: 'Badan Informasi Geospasial'
    },
    {
        id: 'streets',
        name: 'Jalan',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        thumbnail: '/icons/basemaps/satelit.png',
        attribution: '&copy; OpenStreetMap France'
    },
];

export default function BasemapPanel({ onSelect, activeUrl }) {
  return (
    
    <div className="flex flex-col h-full w-full bg-white/95 backdrop-blur-md p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-xl flex items-center gap-2 text-blue-700">
           Pilih Basemap
        </h3>
      </div>
      
      {BASEMAP_OPTIONS.map((map) => (
        <button
          key={map.id}
          onClick={() => onSelect(map.url, map.attribution)}
          className={`flex items-center gap-4 p-2 rounded-lg transition-all border-2 
            ${activeUrl === map.url ? 'border-cyan-500 bg-cyan-50' : 'border-transparent hover:bg-slate-100'}`}
        >
          <div className="w-16 h-16 rounded overflow-hidden border border-slate-200 flex-shrink-0 bg-slate-200">
            <img 
              src={map.thumbnail} 
              alt={map.name} 
              className="w-full h-full object-cover"
              onError={(e) => e.target.src = 'https://via.placeholder.com/150?text=No+Image'} 
            />
          </div>
          <span className="text-sm font-medium text-left leading-tight text-slate-700">
            {map.name}
          </span>
        </button>
      ))}
    </div>
  );
}