'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';

type LiveVehicle={
  id:string;
  plate:string;
  latitude:number|null;
  longitude:number|null;
  online:boolean;
  location:string;
  locationAge:string;
};

type Props={vehicles:LiveVehicle[];onSelect?:(id:string)=>void};

const TILE=256;
const MIN_ZOOM=3;
const MAX_ZOOM=13;

function clampLat(value:number){return Math.max(-85.05112878,Math.min(85.05112878,value))}
function project(latitude:number,longitude:number,zoom:number){
  const scale=2**zoom*TILE;
  const lat=clampLat(latitude)*Math.PI/180;
  return {
    x:(longitude+180)/360*scale,
    y:(1-Math.log(Math.tan(lat)+1/Math.cos(lat))/Math.PI)/2*scale,
  };
}
function fitView(points:LiveVehicle[],width:number,height:number){
  if(!points.length){const p=project(51.1,10.4,5);return{zoom:5,center:p}}
  if(points.length===1){const p=project(points[0].latitude!,points[0].longitude!,11);return{zoom:11,center:p}}
  for(let zoom=MAX_ZOOM;zoom>=MIN_ZOOM;zoom--){
    const projected=points.map(point=>project(point.latitude!,point.longitude!,zoom));
    const xs=projected.map(p=>p.x),ys=projected.map(p=>p.y);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    if(maxX-minX<=Math.max(80,width-52)&&maxY-minY<=Math.max(80,height-52)){
      return{zoom,center:{x:(minX+maxX)/2,y:(minY+maxY)/2}};
    }
  }
  const projected=points.map(point=>project(point.latitude!,point.longitude!,MIN_ZOOM));
  return{zoom:MIN_ZOOM,center:{x:(Math.min(...projected.map(p=>p.x))+Math.max(...projected.map(p=>p.x)))/2,y:(Math.min(...projected.map(p=>p.y))+Math.max(...projected.map(p=>p.y)))/2}};
}

export function SamsaraMiniMap({vehicles,onSelect}:Props){
  const ref=useRef<HTMLDivElement>(null);
  const [size,setSize]=useState({width:230,height:230});

  useEffect(()=>{
    const node=ref.current;
    if(!node)return;
    const sync=()=>setSize({width:Math.max(160,node.clientWidth),height:Math.max(160,node.clientHeight)});
    sync();
    const observer=new ResizeObserver(sync);
    observer.observe(node);
    return()=>observer.disconnect();
  },[]);

  const positioned=useMemo(()=>vehicles.filter(vehicle=>
    Number.isFinite(vehicle.latitude)&&Number.isFinite(vehicle.longitude)&&
    Math.abs(vehicle.latitude!)<=90&&Math.abs(vehicle.longitude!)<=180
  ),[vehicles]);
  const online=useMemo(()=>positioned.filter(vehicle=>vehicle.online),[positioned]);
  const visible=online.length?online:positioned;
  const view=useMemo(()=>fitView(visible,size.width,size.height),[visible,size.width,size.height]);
  const worldTiles=2**view.zoom;
  const left=view.center.x-size.width/2;
  const top=view.center.y-size.height/2;
  const minTileX=Math.floor(left/TILE)-1,maxTileX=Math.floor((left+size.width)/TILE)+1;
  const minTileY=Math.max(0,Math.floor(top/TILE)-1),maxTileY=Math.min(worldTiles-1,Math.floor((top+size.height)/TILE)+1);
  const tiles=[];
  for(let tx=minTileX;tx<=maxTileX;tx++){
    for(let ty=minTileY;ty<=maxTileY;ty++){
      const wrappedX=((tx%worldTiles)+worldTiles)%worldTiles;
      tiles.push({key:`${tx}-${ty}`,x:tx*TILE-left,y:ty*TILE-top,url:`https://tile.openstreetmap.org/${view.zoom}/${wrappedX}/${ty}.png`});
    }
  }

  if(!visible.length){
    return <div className="miniMap samsaraRealMap samsaraMapEmpty" ref={ref}><MapPin size={22}/><span>Noch keine GPS-Positionen synchronisiert.</span></div>;
  }

  return <div className="miniMap samsaraRealMap" ref={ref} aria-label="Live-Karte der Samsara Fahrzeuge">
    <div className="samsaraTileLayer">{tiles.map(tile=><div key={tile.key} className="samsaraTile" style={{left:tile.x,top:tile.y,backgroundImage:`url("${tile.url}")`}}/>)}</div>
    <div className="samsaraMarkerLayer">{visible.map(vehicle=>{
      const point=project(vehicle.latitude!,vehicle.longitude!,view.zoom);
      const x=point.x-left,y=point.y-top;
      return <button key={vehicle.id} type="button" className={'samsaraMarker '+(vehicle.online?'isOnline':'isStale')} style={{left:x,top:y}} onClick={()=>onSelect?.(vehicle.id)} title={`${vehicle.plate} · ${vehicle.location}`}>
        <span></span>
        <em><strong>{vehicle.plate}</strong><small>{vehicle.location}</small><small>{vehicle.locationAge}</small></em>
      </button>;
    })}</div>
    <div className="samsaraMapMeta"><strong>{online.length||positioned.length}</strong><span>{online.length?'live auf Karte':'letzte Positionen'}</span></div>
    <a className="osmAttribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>
  </div>;
}
