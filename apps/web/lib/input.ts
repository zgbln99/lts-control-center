export function cleanString(value:unknown){
  const text=String(value??'').trim();
  return text||null;
}

export function cleanRequired(value:unknown,name:string){
  const text=cleanString(value);
  if(!text) throw new Error(`${name} is required`);
  return text;
}

export function parseDate(value:unknown){
  const text=cleanString(value);
  if(!text) return null;
  const date=new Date(text);
  if(Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${text}`);
  return date;
}

export function parseInteger(value:unknown){
  const text=cleanString(value);
  if(!text) return null;
  const number=Number(text.replace(/\s/g,''));
  if(!Number.isInteger(number)) throw new Error(`Invalid integer: ${text}`);
  return number;
}

export function parseDecimal(value:unknown){
  const text=cleanString(value);
  if(!text) return null;
  const normalized=text.replace(/\./g,'').replace(',','.');
  const number=Number(normalized);
  if(!Number.isFinite(number)) throw new Error(`Invalid number: ${text}`);
  return number;
}

export function parseBoolean(value:unknown){
  if(value===true||value==='true'||value===1||value==='1') return true;
  if(value===false||value==='false'||value===0||value==='0') return false;
  return null;
}

export function parseStringArray(value:unknown){
  if(Array.isArray(value)) return value.map(item=>String(item).trim()).filter(Boolean);
  const text=cleanString(value);
  return text?text.split(/[,;]+/).map(item=>item.trim()).filter(Boolean):[];
}
