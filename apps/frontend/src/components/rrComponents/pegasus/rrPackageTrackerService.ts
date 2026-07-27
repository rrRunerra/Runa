import { CarrierId } from './rrPackageTrackerDetector';

export interface TrackingEvent {
  id: string;
  timestamp: string;
  location: string;
  status: string;
  description: string;
  completed: boolean;
}

export interface DetailedPackageTracking {
  trackingNumber: string;
  carrierId: CarrierId;
  carrierName: string;
  status: 'DELIVERED' | 'OUT_FOR_DELIVERY' | 'IN_TRANSIT' | 'SHIPPED' | 'LABEL_CREATED';
  statusStepIndex: number; // 0: Placed, 1: Shipped, 2: In Transit / Out for delivery, 3: Delivered
  estimatedDelivery: string;
  origin: string;
  destination: string;
  carrierUrl: string;
  events: TrackingEvent[];
  lastUpdated: string;
}

export async function fetchPackageTrackingDetails(
  carrierId: CarrierId,
  trackingNumber: string
): Promise<DetailedPackageTracking | null> {
  try {
    const res = await fetch(
      `/api/pegasus/tracking/${encodeURIComponent(carrierId)}/${encodeURIComponent(trackingNumber)}`
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.trackingNumber && Array.isArray(data.events)) {
        return data;
      }
    }
  } catch (_e) {
    // Return null if real API request fails
  }

  return null;
}
