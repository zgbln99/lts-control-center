import { DriverProfile } from '@/components/driver-profile';

export default async function DriverProfilePage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  return <DriverProfile driverId={id}/>;
}
