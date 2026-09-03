import { NextResponse } from 'next/server';
import { prisma } from '@lts/db';

function formatDate(value: Date | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(value);
}

function deadlineState(dueDate: Date | null) {
  if (!dueDate) return 'none';
  const now = new Date();
  const days = Math.ceil((dueDate.getTime() - now.getTime()) / 86_400_000);
  if (days < 0) return 'critical';
  if (days <= 30) return 'warning';
  return 'ok';
}

export async function GET() {
  const vehicles = await prisma.vehicle.findMany({
    where: { lifecycle: 'ACTIVE' },
    orderBy: [{ sourcePosition: 'asc' }, { plate: 'asc' }],
    include: {
      telemetry: true,
      deadlines: {
        where: { completedAt: null },
        orderBy: { dueDate: 'asc' },
      },
      _count: { select: { documents: true } },
    },
  });

  const rows = vehicles.map(vehicle => {
    const tuv = vehicle.deadlines.find(item => item.type === 'TUV') ?? null;
    const sp = vehicle.deadlines.find(item => item.type === 'SP') ?? null;
    const tacho = vehicle.deadlines.find(item => item.type === 'TACHO') ?? null;

    return {
      id: vehicle.id,
      plate: vehicle.plate,
      plateOriginal: vehicle.plateOriginal,
      plateAliases: vehicle.plateAliases,
      vehicle: vehicle.displayName || [vehicle.manufacturer, vehicle.model].filter(Boolean).join(' ') || '—',
      firstRegistration: formatDate(vehicle.firstRegistration),
      vin: vehicle.vin,
      insuranceNumber: vehicle.insuranceNumber,
      taxNumber: vehicle.taxNumber,
      grossVehicleWeightKg: vehicle.grossVehicleWeightKg,
      inventoryNumber: vehicle.inventoryNumber,
      financingEnd: formatDate(vehicle.financingEnd),
      financingEndRaw: vehicle.financingEndRaw,
      monthlyRate: vehicle.monthlyRate?.toString() ?? vehicle.rateRaw,
      documentsNotes: vehicle.documentsNotes,
      notes: vehicle.notes,
      cameraInstalled: vehicle.cameraInstalled,
      wrapped: vehicle.wrapped,
      wrapType: vehicle.wrapType,
      samsara: {
        connected: Boolean(vehicle.samsaraId),
        id: vehicle.samsaraId,
        online: vehicle.telemetry?.online ?? null,
        location: vehicle.telemetry?.geofenceName || vehicle.telemetry?.locationLabel || vehicle.telemetry?.address || null,
        odometerKm: vehicle.telemetry?.odometerKm ?? null,
        lastSeenAt: vehicle.telemetry?.lastSeenAt?.toISOString() ?? null,
      },
      deadlines: {
        tuv: tuv ? { dueDate: tuv.dueDate.toISOString(), state: deadlineState(tuv.dueDate) } : null,
        sp: sp ? { dueDate: sp.dueDate.toISOString(), state: deadlineState(sp.dueDate) } : null,
        tacho: tacho ? { dueDate: tacho.dueDate.toISOString(), state: deadlineState(tacho.dueDate) } : null,
      },
      documentCount: vehicle._count.documents,
    };
  });

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    total: rows.length,
    vehicles: rows,
  });
}
