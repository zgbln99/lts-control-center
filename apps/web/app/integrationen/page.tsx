'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { Bot, Boxes, CalendarRange, CheckCircle2, Database, FolderOpen, MapPin, MessageCircle, RefreshCw, TriangleAlert } from 'lucide-react';

type StatusPayload={
  generatedAt:string;
  integrations:{
    samsara:{configured:boolean;connectedVehicles:number;activeVehicles:number;telemetryRecords:number;lastSyncAt:string|null};
    megaS4:{configured:boolean;documents:number;mappedFolders:number;lastSyncAt:string|null};
    chatwoot:{configured:boolean}; n8n:{configured:boolean}; meta:{configured:boolean}; vacation:{configured:boolean};
  };
};

function formatDate(value:string|null){
  if(!value) return 'Noch keine Synchronisierung';
  return new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
}

function State({ok}:{ok:boolean}){return <span className={'integrationState '+(ok?'connected':'missing')}>{ok?<CheckCircle2 size={13}/>:<TriangleAlert size={13}/>} {ok?'Konfiguriert':'Nicht konfiguriert'}</span>}

export default function IntegrationenPage(){
  const [data,setData]=useState<StatusPayload|null>(null);
  const [loading,setLoading]=useState(true);

  async function load(){
    setLoading(true);
    try{const response=await fetch('/api/integrations/status'); if(response.ok) setData(await response.json())}finally{setLoading(false)}
  }
  useEffect(()=>{void load()},[]);

  const i=data?.integrations;
  return <div className="appShell"><Sidebar/><main className="main"><Topbar title="Integrationen" subtitle="Externe Systeme und Datenquellen" searchPlaceholder="Integration suchen ..."/><div className="content">
    <div className="integrationHeader"><div><h2>Systemstatus</h2><p>Control Center bleibt die zentrale Oberfläche. Integrationen liefern Daten oder übernehmen Spezialfunktionen.</p></div><button className="filterBtn" onClick={()=>void load()} disabled={loading}><RefreshCw size={14}/>{loading?'Prüfen ...':'Status aktualisieren'}</button></div>

    <section className="integrationGrid">
      <article className="integrationCard" id="samsara"><div className="integrationIcon green"><MapPin size={20}/></div><div className="integrationTitle"><div><h3>Samsara</h3><p>Live-Fahrzeugdaten</p></div><State ok={Boolean(i?.samsara.configured)}/></div><div className="integrationStats"><div><span>Fahrzeuge verbunden</span><strong>{i?`${i.samsara.connectedVehicles} / ${i.samsara.activeVehicles}`:'—'}</strong></div><div><span>Telemetrie</span><strong>{i?.samsara.telemetryRecords ?? '—'}</strong></div></div><footer><span>Letzte Daten</span><strong>{formatDate(i?.samsara.lastSyncAt ?? null)}</strong></footer></article>

      <article className="integrationCard" id="mega-s4"><div className="integrationIcon blue"><FolderOpen size={20}/></div><div className="integrationTitle"><div><h3>MEGA S4</h3><p>Fahrzeugkartotheken</p></div><State ok={Boolean(i?.megaS4.configured)}/></div><div className="integrationStats"><div><span>Dokumente</span><strong>{i?.megaS4.documents ?? '—'}</strong></div><div><span>Ordner zugeordnet</span><strong>{i?.megaS4.mappedFolders ?? '—'}</strong></div></div><footer><span>Letzte Änderung</span><strong>{formatDate(i?.megaS4.lastSyncAt ?? null)}</strong></footer></article>

      <article className="integrationCard" id="chatwoot"><div className="integrationIcon cyan"><MessageCircle size={20}/></div><div className="integrationTitle"><div><h3>Chatwoot</h3><p>WhatsApp Communication Center</p></div><State ok={Boolean(i?.chatwoot.configured)}/></div><div className="integrationDescription">Warstwa obsługi rozmów przez pracowników. Logika biznesowa zostaje w Control Center / n8n.</div></article>

      <article className="integrationCard" id="n8n"><div className="integrationIcon purple"><Boxes size={20}/></div><div className="integrationTitle"><div><h3>n8n</h3><p>Automationen & Workflows</p></div><State ok={Boolean(i?.n8n.configured)}/></div><div className="integrationDescription">Przypomnienia TÜV/SP/Tacho, synchronizacje, webhooki i późniejsze eskalacje.</div></article>

      <article className="integrationCard" id="meta"><div className="integrationIcon orange"><Bot size={20}/></div><div className="integrationTitle"><div><h3>Meta WhatsApp</h3><p>Cloud API & Templates</p></div><State ok={Boolean(i?.meta.configured)}/></div><div className="integrationDescription">WABA, numer WhatsApp i zarządzanie template'ami Meta będą widoczne bezpośrednio w Control Center.</div></article>

      <article className="integrationCard" id="urlaub"><div className="integrationIcon red"><CalendarRange size={20}/></div><div className="integrationTitle"><div><h3>Urlaubsportal</h3><p>Osobna aplikacja</p></div><State ok={Boolean(i?.vacation.configured)}/></div><div className="integrationDescription">Portal pozostaje niezależny. Docelowo możemy pobierać tylko dane potrzebne na dashboardzie i linkować do pełnej aplikacji.</div></article>
    </section>

    <section className="integrationArchitecture"><Database size={18}/><div><strong>Zasada integracji</strong><p>PostgreSQL przechowuje dane Control Center. MEGA S4 przechowuje pliki. Samsara dostarcza live data. Pozostałe systemy są podłączane przez API/webhooki zamiast kopiowania całej ich logiki.</p></div></section>
  </div></main></div>
}
