'use client';

import { FormEvent, useState } from 'react';
import { ImagePlus } from 'lucide-react';

type Photo={id:string;filename:string;createdAt:string}|null;

export function VehiclePhotoPanel({vehicleId,plate,photo,readOnly,onReload}:{vehicleId:string;plate:string;photo:Photo;readOnly:boolean;onReload:()=>void|Promise<void>}){
  const [uploading,setUploading]=useState(false);
  const [message,setMessage]=useState('');

  async function upload(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(readOnly)return;
    const form=new FormData(event.currentTarget);
    const file=form.get('file');
    if(!(file instanceof File)||!file.size)return;
    setUploading(true);setMessage('');
    try{
      const response=await fetch(`/api/vehicles/${vehicleId}/photo`,{method:'POST',body:form});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(payload.error||'Foto konnte nicht gespeichert werden.');
      event.currentTarget.reset();
      setMessage('Fahrzeugfoto in MEGA S4 gespeichert.');
      await onReload();
    }catch(error){setMessage(error instanceof Error?error.message:'Fehler beim Foto-Upload.')}
    finally{setUploading(false)}
  }

  return <section className="drawerSection vehiclePhotoPanel">
    <div className="drawerSectionHead"><div><h3>Fahrzeugfoto</h3><p>Primäres Fahrzeugbild · gespeichert in MEGA S4</p></div><ImagePlus size={17}/></div>
    <div className="vehiclePhotoEditor">
      <div className="vehiclePhotoPreview">
        {photo?<img src={`/api/vehicles/${vehicleId}/photo?v=${photo.id}`} alt={`${plate} Fahrzeug`}/>:<div className="vehiclePhotoEmpty"><ImagePlus size={24}/><span>Noch kein Fahrzeugfoto</span></div>}
      </div>
      {!readOnly&&<form onSubmit={upload} className="vehiclePhotoUpload">
        <input name="file" type="file" accept="image/jpeg,image/png,image/webp" required/>
        <button type="submit" disabled={uploading}><ImagePlus size={14}/>{uploading?'Upload ...':photo?'Foto ersetzen':'Foto hochladen'}</button>
      </form>}
      {message&&<p className="inlineMessage">{message}</p>}
    </div>
  </section>;
}
