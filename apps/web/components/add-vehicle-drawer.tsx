'use client';

import { FormEvent, useState } from 'react';
import { Plus, X } from 'lucide-react';

export function AddVehicleDrawer({open,onClose,onCreated}:{open:boolean;onClose:()=>void;onCreated?:()=>void|Promise<void>}){
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState('');
  if(!open) return null;

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const form=new FormData(event.currentTarget);
    setSaving(true); setMessage('');
    try{
      const payload={
        plate:form.get('plate'),vin:form.get('vin'),category:form.get('category'),manufacturer:form.get('manufacturer'),model:form.get('model'),
        displayName:form.get('displayName'),firstRegistration:form.get('firstRegistration'),insuranceNumber:form.get('insuranceNumber'),
        inventoryNumber:form.get('inventoryNumber'),cameraInstalled:form.get('cameraInstalled'),wrapped:form.get('wrapped'),
        wrapType:form.get('wrapType'),notes:form.get('notes'),
      };
      const response=await fetch('/api/vehicles',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const result=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(result.error || 'Fahrzeug konnte nicht angelegt werden.');
      if(onCreated) await onCreated();
      onClose();
      if(!onCreated) window.location.reload();
    }catch(error){setMessage(error instanceof Error?error.message:'Fehler beim Anlegen.')}finally{setSaving(false)}
  }

  return <div className="drawerBackdrop" onMouseDown={event=>{if(event.target===event.currentTarget) onClose()}}>
    <aside className="vehicleDrawer addVehicleDrawer">
      <header className="drawerHead"><div><span>Fuhrpark</span><h2>Fahrzeug hinzufügen</h2><p>Neues Fahrzeug manuell in den Bestand aufnehmen</p></div><button onClick={onClose}><X size={19}/></button></header>
      <div className="drawerScroll"><form onSubmit={submit}>
        <section className="drawerSection">
          <div className="drawerSectionHead"><div><h3>Fahrzeug</h3><p>Kennzeichen ist Pflichtfeld. VIN wird auf Duplikate geprüft.</p></div><Plus size={17}/></div>
          <div className="drawerFormGrid">
            <label><span>Kennzeichen *</span><input name="plate" required autoFocus placeholder="TF-LS 1234"/></label>
            <label><span>Kategorie</span><select name="category" defaultValue="OTHER"><option value="TRUCK">Lkw</option><option value="VAN">Transporter</option><option value="TRAILER">Anhänger</option><option value="SEMITRAILER">Auflieger</option><option value="OTHER">Sonstiges / noch offen</option></select></label>
            <label><span>Erstzulassung</span><input name="firstRegistration" type="date"/></label>
            <label><span>VIN</span><input name="vin" placeholder="WDB..."/></label>
            <label><span>Hersteller</span><input name="manufacturer" placeholder="Mercedes-Benz"/></label>
            <label><span>Modell</span><input name="model" placeholder="Atego"/></label>
            <label className="wide"><span>Anzeigename</span><input name="displayName" placeholder="Mercedes-Benz Atego"/></label>
            <label><span>Versicherungsnummer</span><input name="insuranceNumber"/></label>
            <label><span>Inventarnummer</span><input name="inventoryNumber"/></label>
          </div>
        </section>
        <section className="drawerSection">
          <div className="drawerSectionHead"><div><h3>Ausstattung</h3><p>Kann jederzeit später ergänzt werden</p></div></div>
          <div className="drawerFormGrid">
            <label><span>Kamera</span><select name="cameraInstalled" defaultValue=""><option value="">Nicht erfasst</option><option value="true">Vorhanden</option><option value="false">Nicht vorhanden</option></select></label>
            <label><span>Beklebung</span><select name="wrapped" defaultValue=""><option value="">Nicht erfasst</option><option value="true">Beklebt</option><option value="false">Nicht beklebt</option></select></label>
            <label className="wide"><span>Art der Beklebung</span><input name="wrapType" placeholder="LTS Standard"/></label>
            <label className="wide"><span>Notiz</span><textarea name="notes" rows={3}/></label>
          </div>
        </section>
        <div className="drawerStickySave"><span className={message?'drawerError':''}>{message}</span><button className="greenBtn" disabled={saving}><Plus size={14}/>{saving?'Anlegen ...':'Fahrzeug anlegen'}</button></div>
      </form></div>
    </aside>
  </div>
}
