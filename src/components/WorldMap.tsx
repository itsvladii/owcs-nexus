import React, { useMemo, useState, useEffect } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
// 1. Import the interaction library
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

const GEO_URL = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

const REGION_COORDS: Record<string, { lat: number; lng: number }> = {
  'Korea': { lat: 37.5665, lng: 126.9780 },
  'North America': { lat: 39.8283, lng: -98.5795 },
  'EMEA': { lat: 51.5074, lng: 10.1278 }, 
  'China': { lat: 35.8617, lng: 104.1954 },
  'Japan': { lat: 36.2048, lng: 138.2529 },
  'Pacific': { lat: 13.7563, lng: 100.5018 },
  'Saudi Arabia': { lat: 23.8859, lng: 45.0792 },
};

interface Props {
  teams: any[];
}

export default function FlatWorldMap({ teams }: Props) {
  const [geographies, setGeographies] = useState<any[]>([]);
  const [hoveredTeam, setHoveredTeam] = useState<any | null>(null);

  const projection = geoMercator()
    .scale(140)
    .translate([400, 250]);

  const pathGenerator = geoPath().projection(projection);

  useEffect(() => {
    fetch(GEO_URL)
      .then(res => res.json())
      .then(data => {
        const feats = feature(data, data.objects.countries).features;
        setGeographies(feats);
      });
  }, []);

  const markers = useMemo(() => {
    return teams.map(team => {
      // Support both Manual Lat/Lng props OR Region fallback
      const region = team.data.region;
      const fallback = REGION_COORDS[region] || REGION_COORDS['Korea'];
      
      const lat = team.lat || fallback.lat;
      const lng = team.lng || fallback.lng;
      
      // Add jitter only if we are using region fallback (to prevent stacking)
      const jitter = team.lat ? 0 : (Math.random() - 0.5) * 5;
      
      const [x, y] = projection([lng + jitter, lat + jitter]) || [0, 0];

      return {
        name: team.data.name,
        slug: team.slug,
        logo: team.data.logo?.replace('/upload/', '/upload/w_64,h_64,c_fit,f_auto,q_auto/') || null,
        color: team.data.color || '#f59e0b',
        x,
        y
      };
    });
  }, [teams]);

  return (
    <div className="w-full h-[500px] bg-[#0a0a0a] relative overflow-hidden rounded-3xl border border-neutral-800 shadow-2xl group cursor-move">
      
      <div className="absolute top-6 left-6 z-10 pointer-events-none">
         <h3 className="text-white font-title text-2xl tracking-wide drop-shadow-lg">Global Operations</h3>
         <p className="text-neutral-500 text-xs font-mono uppercase tracking-widest">{teams.length} Active Teams</p>
      </div>

      {/* 2. WRAP THE SVG FOR INTERACTIVITY */}
      <TransformWrapper
        initialScale={4}
        minScale={1}
        maxScale={8}
        centerOnInit={true}
        wheel={{ step: 0.1 }} // Smooth scroll zoom
      >
        <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
          
          <svg viewBox="0 0 800 500" className="w-full h-full">
            
            <g>
              {geographies.map((geo, i) => (
                <path
                  key={i}
                  d={pathGenerator(geo) || ""}
                  fill="#171717"
                  stroke="#262626"
                  strokeWidth={0.5}
                  style={{ transition: 'all 0.3s' }}
                  className="hover:fill-neutral-800 hover:stroke-neutral-700 outline-none"
                />
              ))}
            </g>

            {markers.map((marker) => (
              <g 
                key={marker.name} 
                transform={`translate(${marker.x}, ${marker.y})`}
                className="cursor-pointer"
                // Use onClickcapture to prevent dragging from triggering click
                onClickCapture={(e) => {
                   // Simple check: only navigate if it wasn't a drag operation
                   // (React-zoom-pan-pinch usually handles this, but careful)
                   // Ideally we just use standard onClick
                }}
                onClick={() => window.location.href = `/teams/${marker.slug}`}
                onMouseEnter={() => setHoveredTeam(marker)}
                onMouseLeave={() => setHoveredTeam(null)}
              >
                <circle r={8} fill={marker.color} opacity={0.3}>
                   <animate attributeName="r" from="4" to="12" dur="1.5s" repeatCount="indefinite" />
                   <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite" />
                </circle>
                <circle r={3} fill={marker.color} stroke="white" strokeWidth={1} />
              </g>
            ))}

          </svg>

        </TransformComponent>
      </TransformWrapper>

      {/* Tooltip (Keep outside TransformWrapper so it doesn't scale/move with the map!) */}
      {hoveredTeam && (
        <div 
          className="absolute z-20 bg-neutral-900/90 backdrop-blur-md border border-neutral-700 p-4 rounded-xl shadow-2xl flex items-center gap-4 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-200"
          style={{ bottom: '2rem', left: '2rem' }}
        >
           {hoveredTeam.logo && (
             <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center p-1">
               <img src={hoveredTeam.logo} className="w-full h-full object-contain" />
             </div>
           )}
           <div>
             <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-0.5">Team Profile</p>
             <h4 className="text-lg font-title text-white leading-none">{hoveredTeam.name}</h4>
             <div className="h-0.5 w-full mt-2 rounded-full" style={{ backgroundColor: hoveredTeam.color }}></div>
           </div>
        </div>
      )}

      <div className="absolute inset-0 pointer-events-none opacity-5" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
    </div>
  );
}