'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Archive, Bell, FileText, Search, Sun, Truck, X } from 'lucide-react';

type SearchResult={type:'vehicle'|'document';id:string;title:string;subtitle:string;lifecycle:string;href:string};

type TopbarProps={title?:string;subtitle?:string;searchPlaceholder?:string};

export function Topbar({title='Fuhrpark',subtitle='Übersicht aller Fahrzeuge',searchPlaceholder='Fahrzeug suchen (Kennzeichen, VIN, Inventarnr. ...)'}:TopbarProps){
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState('');
  const [results,setResults]=useState<SearchResult[]>([]);
  const [loading,setLoading]=useState(false);
  const inputRef=useRef<HTMLInputElement>(null);

  useEffect(()=>{
    const handler=(event:KeyboardEvent)=>{
      if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){
        event.preventDefault();setOpen(true);
      }
      if(event.key==='Escape') setOpen(false);
    };
    window.addEventListener('keydown',handler);
    return()=>window.removeEventListener('keydown',handler);
  },[]);

  useEffect(()=>{if(open) setTimeout(()=>inputRef.current?.focus(),20)},[open]);

  useEffect(()=>{
    if(query.trim().length<2){setResults([]);setLoading(false);return}
    const controller=new AbortController();
    const timer=setTimeout(async()=>{
      setLoading(true);
      try{
        const response=await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`,{signal:controller.signal});
        if(response.ok){const payload=await response.json();setResults(payload.results ?? [])}
      }catch(error){if((error as Error)?.name!=='AbortError') setResults([])}finally{setLoading(false)}
    },180);
    return()=>{clearTimeout(timer);controller.abort()}
  },[query]);

  function close(){setOpen(false);setQuery('');setResults([])}

  return <>
  <header className="topbar">
    <div><h1>{title}</h1><p>{subtitle}</p></div>
    <button className="topSearch" type="button" onClick={()=>setOpen(true)}><Search size={17}/><span>{searchPlaceholder}</span><kbd>⌘ K</kbd></button>
    <div className="topActions"><button><Sun size={18}/></button><button className="bell"><Bell size={18}/><em>8</em></button><div className="user"><div className="avatar">C</div><div><strong>Clemens</strong><span>Administrator</span></div></div></div>
  </header>
  {open&&<div className="globalSearchBackdrop" onMouseDown={event=>{if(event.currentTarget===event.target) close()}}>
    <section className="globalSearchPanel">
      <div className="globalSearchInput"><Search size={19}/><input ref={inputRef} value={query} onChange={event=>setQuery(event.target.value)} placeholder="Kennzeichen, VIN, Inventarnummer, Dokument ..."/><button onClick={close}><X size={17}/></button></div>
      <div className="globalSearchBody">
        {query.trim().length<2&&<div className="globalSearchHint"><strong>Control Center durchsuchen</strong><span>Mindestens 2 Zeichen eingeben. Suche umfasst aktive und archivierte Fahrzeuge sowie Dokumentnamen.</span></div>}
        {loading&&<div className="globalSearchHint"><span>Suche läuft ...</span></div>}
        {!loading&&query.trim().length>=2&&!results.length&&<div className="globalSearchHint"><strong>Keine Treffer</strong><span>Für „{query}“ wurde nichts gefunden.</span></div>}
        {!loading&&results.map(result=><Link href={result.href} onClick={close} className="globalSearchResult" key={`${result.type}-${result.id}`}>
          <span className={'globalSearchResultIcon '+(result.type==='document'?'document':'vehicle')}>{result.type==='document'?<FileText size={16}/>:result.lifecycle==='ACTIVE'?<Truck size={16}/>:<Archive size={16}/>}</span>
          <div><strong>{result.title}</strong><span>{result.subtitle || (result.type==='document'?'Dokument':'Fahrzeug')}</span></div>
          {result.lifecycle!=='ACTIVE'&&<em>Archiv</em>}
        </Link>)}
      </div>
      <footer className="globalSearchFooter"><span><kbd>ESC</kbd> schließen</span><span>Fahrzeuge · VIN · Inventar · Dokumente</span></footer>
    </section>
  </div>}
  </>
}
