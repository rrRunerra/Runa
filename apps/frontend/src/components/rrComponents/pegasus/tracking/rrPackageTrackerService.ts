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
  // Direct integration for Slovenská pošta API (api.posta.sk)
  if (carrierId === 'skposta') {
    try {
      const apiRes = await fetch(
        `https://api.posta.sk/tracking?q=${encodeURIComponent(trackingNumber)}&l=en`
      );
      if (apiRes.ok) {
        const json = await apiRes.json();
        if (
          json &&
          json.status === 'ok' &&
          Array.isArray(json.results) &&
          json.results.length > 0
        ) {
          const result = json.results[0];
          if (result && result.status === 'ok' && Array.isArray(result.events)) {
            const rawEvents = result.events;
            const mappedEvents: TrackingEvent[] = rawEvents.map((evt: any, idx: number) => {
              const stateUpper = (evt.stateCode || '').toUpperCase();
              let shortTitle = evt.detailDescription || 'Package Event';
              if (stateUpper === 'DELIVERED') shortTitle = 'Delivered to Addressee';
              else if (stateUpper === 'TRANSIT') shortTitle = 'In Transit';
              else if (stateUpper === 'NOTIFIED') shortTitle = 'Stored at Post Office / Ready for Pickup';
              else if (stateUpper === 'RECEIVED') shortTitle = 'Posted at Origin Post Office';

              const detailText = evt.detailDescription && evt.detailDescription !== shortTitle
                ? evt.detailDescription
                : '';

              return {
                id: evt.detailCode || `evt-${idx}`,
                timestamp: evt.localDate ? new Date(evt.localDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A',
                location: evt.postOffice
                  ? `${evt.postOffice.name}${evt.postOffice.city ? ', ' + evt.postOffice.city : ''}`
                  : 'Slovenská pošta',
                status: shortTitle,
                description: detailText,
                completed: true,
              };
            });

            // Determine latest event & overall package status
            const latestEvent = rawEvents[rawEvents.length - 1];
            const stateCode = (latestEvent?.stateCode || '').toLowerCase();

            let status: DetailedPackageTracking['status'] = 'IN_TRANSIT';
            let statusStepIndex = 2;

            if (stateCode === 'delivered') {
              status = 'DELIVERED';
              statusStepIndex = 3;
            } else if (stateCode === 'notified') {
              status = 'OUT_FOR_DELIVERY';
              statusStepIndex = 2;
            } else if (stateCode === 'transit') {
              status = 'IN_TRANSIT';
              statusStepIndex = 2;
            } else if (stateCode === 'received') {
              status = 'SHIPPED';
              statusStepIndex = 1;
            }

            const estDeliv = status === 'DELIVERED'
              ? (latestEvent?.localDate ? `Delivered (${new Date(latestEvent.localDate).toLocaleDateString()})` : 'Delivered')
              : (latestEvent?.retainedTill ? `Pickup until ${latestEvent.retainedTill}` : 'In transit');

            return {
              trackingNumber: result.number || trackingNumber,
              carrierId: 'skposta',
              carrierName: 'Slovenská pošta',
              status,
              statusStepIndex,
              estimatedDelivery: estDeliv,
              origin: rawEvents[0]?.postOffice?.name || 'Slovakia',
              destination: latestEvent?.postOffice?.name || 'Destination',
              carrierUrl: `https://posta.sk/sledovanie-zasielok?q=${encodeURIComponent(trackingNumber)}`,
              events: mappedEvents,
              lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
          }
        }
      }
    } catch (_err) {
      // Fallthrough to backend proxy if direct fetch fails
    }
  }

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
