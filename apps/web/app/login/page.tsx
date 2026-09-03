'use client';

import { FormEvent, useState } from 'react';
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react';

export default function LoginPage(){
  const [loading,setLoading]=useState(false);
  const [message,setMessage]=useState('');

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const form=new FormData(event.currentTarget);
    setLoading(true);setMessage('');
    try{
      const response=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:form.get('email'),password:form.get('password')})});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(payload.error || 'Anmeldung fehlgeschlagen.');
      const params=new URLSearchParams(window.location.search);
      const next=params.get('next');
      window.location.href=next&&next.startsWith('/')?next:'/dashboard';
    }catch(error){setMessage(error instanceof Error?error.message:'Anmeldung fehlgeschlagen.')}finally{setLoading(false)}
  }

  return <main className="loginPage">
    <section className="loginBrandPanel"><div className="loginBrand"><div className="loginLogo">L</div><div><strong>LTS</strong><span>LOGISTIK</span></div></div><div className="loginBrandCopy"><span>CONTROL CENTER</span><h1>Ein System.<br/>Der ganze Fuhrpark.</h1><p>Fahrzeuge, Termine, Dokumente und Integrationen in einer zentralen Arbeitsoberfläche.</p></div><div className="loginBrandFooter">LTS Logistik · Internal Operations</div></section>
    <section className="loginFormPanel"><form className="loginCard" onSubmit={submit}><div className="loginCardHead"><span>Anmeldung</span><h2>Willkommen zurück</h2><p>Mit deinem Control-Center-Konto anmelden.</p></div><label><span>E-Mail</span><div className="loginInput"><Mail size={16}/><input name="email" type="email" autoComplete="username" required autoFocus placeholder="name@ltslogistik.de"/></div></label><label><span>Passwort</span><div className="loginInput"><LockKeyhole size={16}/><input name="password" type="password" autoComplete="current-password" required/></div></label>{message&&<div className="loginError">{message}</div>}<button className="loginSubmit" disabled={loading}>{loading?'Anmelden ...':<>Anmelden <ArrowRight size={16}/></>}</button><small>Der Zugang wird zentral durch einen Administrator verwaltet.</small></form></section>
  </main>
}
