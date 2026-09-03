export type DeadlineState = 'ok' | 'warning' | 'critical' | 'none';

export type Vehicle = {
  id?: string;
  plate: string;
  vehicle: string;
  firstRegistration: string;
  location: string;
  locationAge: string;
  mileage: string;
  tuv: string;
  tuvState: DeadlineState;
  sp?: string;
  spState?: DeadlineState;
  tacho?: string;
  tachoState?: DeadlineState;
  camera: boolean | null;
  wrapped: boolean | null;
  samsara: boolean;
  vin: string;
  inventory: string;
  insurance: string;
  taxNumber: string;
  finance: string;
  rate: string;
  documentCount?: number;
  documentsNotes?: string;
};
