export type Vehicle = {
  plate: string;
  vehicle: string;
  firstRegistration: string;
  location: string;
  locationAge: string;
  mileage: string;
  tuv: string;
  tuvState: 'ok' | 'warning' | 'critical';
  camera: boolean;
  wrapped: boolean;
  samsara: boolean;
  vin: string;
  inventory: string;
  insurance: string;
  taxNumber: string;
  finance: string;
  rate: string;
};

export const vehicles: Vehicle[] = [
  { plate:'TF-LS 200', vehicle:'Mercedes-Benz Vito', firstRegistration:'16.10.2025', location:'Autohaus Mettchen', locationAge:'vor 5 Min.', mileage:'12.541 km', tuv:'10/2027', tuvState:'ok', camera:true, wrapped:true, samsara:true, vin:'W1VVLBEZ6T4569411', inventory:'—', insurance:'89048735014', taxNumber:'K125.5141.0497', finance:'bank11 · Vertrag 14213 · bis 30.11.2029', rate:'871,25 €' },
  { plate:'TF-LS 300', vehicle:'Mercedes-Benz Vito', firstRegistration:'16.10.2025', location:'Thiendorf', locationAge:'vor 3 Min.', mileage:'18.904 km', tuv:'10/2027', tuvState:'ok', camera:true, wrapped:true, samsara:true, vin:'W1VVLBEZ2T4569180', inventory:'—', insurance:'89048746326', taxNumber:'K125.5141.2089', finance:'bank11 · Vertrag 14213 · bis 30.11.2029', rate:'871,25 €' },
  { plate:'TF-LS 777', vehicle:'Anhänger Niewiadów', firstRegistration:'18.03.2019', location:'Radeburg', locationAge:'vor 11 Min.', mileage:'—', tuv:'09/2026', tuvState:'warning', camera:false, wrapped:false, samsara:false, vin:'SZRBR2000K0011252', inventory:'560014', insurance:'89048743236', taxNumber:'K117.1047.6857', finance:'abbezahlt', rate:'—' },
  { plate:'TF-LS 999', vehicle:'Mercedes-Benz Atego', firstRegistration:'15.04.2014', location:'Unterwegs · A9 Leipzig', locationAge:'vor 2 Min.', mileage:'534.880 km', tuv:'09/2026', tuvState:'critical', camera:true, wrapped:false, samsara:true, vin:'WDB9670251L850289', inventory:'540072', insurance:'89048784784', taxNumber:'K11500136872', finance:'abbezahlt', rate:'—' },
  { plate:'TF-LS 1000', vehicle:'Mercedes-Benz Vito', firstRegistration:'28.04.2025', location:'Wustermark', locationAge:'vor 4 Min.', mileage:'41.112 km', tuv:'04/2028', tuvState:'ok', camera:true, wrapped:true, samsara:true, vin:'W1VVLFEZ1S4486197', inventory:'520005', insurance:'89048714440', taxNumber:'K124.9054.2834', finance:'MB Bank · bis 30.04.2029', rate:'934,27 €' },
  { plate:'TF-LS 1116', vehicle:'Anhänger', firstRegistration:'04.09.2017', location:'Magdeburg', locationAge:'vor 8 Min.', mileage:'—', tuv:'02/2027', tuvState:'ok', camera:false, wrapped:true, samsara:false, vin:'W09HTKS1105M39665', inventory:'560017', insurance:'89048789867', taxNumber:'K117.4447.1602', finance:'abbezahlt', rate:'—' },
  { plate:'TF-LS 1131', vehicle:'Mercedes-Benz Atego', firstRegistration:'04.10.2016', location:'Unterwegs · A2', locationAge:'vor 1 Min.', mileage:'487.221 km', tuv:'08/2025', tuvState:'critical', camera:true, wrapped:false, samsara:true, vin:'WDB96702510083009', inventory:'540207', insurance:'89048747684', taxNumber:'K119.0319.4134', finance:'MB Bank', rate:'701,42 €' },
  { plate:'TF-LS 1152', vehicle:'Mercedes-Benz Atego', firstRegistration:'28.07.2016', location:'Bürstadt', locationAge:'vor 6 Min.', mileage:'501.233 km', tuv:'01/2027', tuvState:'ok', camera:false, wrapped:true, samsara:true, vin:'WDB96702710069026', inventory:'540236', insurance:'89048730353', taxNumber:'K119.7571.0863', finance:'MB Bank', rate:'805,17 €' }
];
