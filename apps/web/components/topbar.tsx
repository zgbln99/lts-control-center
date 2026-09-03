import { Bell, Search, Sun } from 'lucide-react';
export function Topbar(){return <header className="topbar">
  <div><h1>Fuhrpark</h1><p>Übersicht aller Fahrzeuge</p></div>
  <div className="topSearch"><Search size={17}/><span>Fahrzeug suchen (Kennzeichen, VIN, Inventarnr. ...)</span><kbd>⌘ K</kbd></div>
  <div className="topActions"><button><Sun size={18}/></button><button className="bell"><Bell size={18}/><em>8</em></button><div className="user"><div className="avatar">C</div><div><strong>Clemens</strong><span>Administrator</span></div></div></div>
</header>}
