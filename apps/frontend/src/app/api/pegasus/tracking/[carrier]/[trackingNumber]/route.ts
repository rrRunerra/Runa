import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ carrier: string; trackingNumber: string }> }
) {
  try {
    const { carrier, trackingNumber } = await params;

    if (!trackingNumber) {
      return NextResponse.json(
        { error: "Tracking number is required" },
        { status: 400 }
      );
    }

    const cleanCarrier = (carrier || "unknown").toLowerCase();
    const cleanNum = trackingNumber.trim();

    // 1. Packeta (Zásielkovňa)
    if (cleanCarrier === "packeta" || cleanNum.startsWith("Z")) {
      const packetaData = await fetchPacketaRealData(cleanNum);
      if (packetaData) return NextResponse.json(packetaData);
    }

    // 2. DHL Public Tracking API
    if (cleanCarrier === "dhl") {
      const dhlData = await fetchDhlRealData(cleanNum);
      if (dhlData) return NextResponse.json(dhlData);
    }

    // 3. USPS Public Tracking API
    if (cleanCarrier === "usps" || cleanNum.length >= 20 || cleanNum.endsWith("US")) {
      const uspsData = await fetchUspsRealData(cleanNum);
      if (uspsData) return NextResponse.json(uspsData);
    }

    // 4. Try Universal ParcelsApp API (Supports China Post, DPD, SPS, Packeta, etc.)
    const parcelsData = await fetchParcelsAppRealData(cleanNum, cleanCarrier);
    if (parcelsData) {
      return NextResponse.json(parcelsData);
    }

    // 5. Try 17TRACK REST endpoint
    const track17Data = await fetch17TrackRealData(cleanNum, cleanCarrier);
    if (track17Data) {
      return NextResponse.json(track17Data);
    }

    // Return 404 if no live data is found from real carrier endpoints
    return NextResponse.json(
      { error: "No real tracking data found for this tracking number" },
      { status: 404 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: `Failed to fetch real tracking data: ${err.message || err}` },
      { status: 500 }
    );
  }
}

async function fetchPacketaRealData(num: string) {
  try {
    const url = `https://tracking.packeta.com/api/v2/tracking?id=${encodeURIComponent(num)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && (data.statuses || data.history)) {
        const historyList = data.statuses || data.history || [];
        const events = historyList.map((st: any, idx: number) => ({
          id: `packeta-ev-${idx}`,
          timestamp: st.dateTime || st.date || new Date().toLocaleString(),
          location: st.depot || st.branchName || "Packeta Depot",
          status: st.text || st.title || "Packeta Update",
          description: st.text || st.description || "Package status updated",
          completed: true,
        }));

        const lastText = (historyList[0]?.text || historyList[0]?.title || "").toLowerCase();
        let status: "DELIVERED" | "OUT_FOR_DELIVERY" | "IN_TRANSIT" | "SHIPPED" | "LABEL_CREATED" = "IN_TRANSIT";

        if (lastText.includes("doručen") || lastText.includes("delivered") || lastText.includes("vyzdvihnut")) status = "DELIVERED";
        else if (lastText.includes("doručov") || lastText.includes("courier")) status = "OUT_FOR_DELIVERY";
        else if (lastText.includes("prija") || lastText.includes("depot")) status = "IN_TRANSIT";

        let stepIndex = 2;
        if (status === "DELIVERED") stepIndex = 3;
        else if (status === "OUT_FOR_DELIVERY") stepIndex = 2;

        return {
          trackingNumber: num,
          carrierId: "packeta",
          carrierName: "Packeta (Zásielkovňa)",
          status,
          statusStepIndex: stepIndex,
          estimatedDelivery: data.estimatedDeliveryDate || "Live Status Available",
          origin: data.senderBranch || "Packeta Origin",
          destination: data.destinationBranch || "Packeta Z-BOX / Branch",
          carrierUrl: `https://tracking.packeta.com/cs_CZ/?id=${num}`,
          events,
          lastUpdated: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
      }
    }
  } catch (_e) {
    //
  }
  return null;
}

async function fetchDhlRealData(num: string) {
  try {
    const url = `https://www.dhl.com/utapi/v1/tracking?trackingNumber=${encodeURIComponent(num)}&language=en`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
    });

    if (res.ok) {
      const data = await res.json();
      const shipment = data?.shipments?.[0];
      if (shipment && shipment.events && shipment.events.length > 0) {
        const statusCode = shipment.status?.statusCode?.toLowerCase() || "";
        let status: "DELIVERED" | "OUT_FOR_DELIVERY" | "IN_TRANSIT" | "SHIPPED" | "LABEL_CREATED";

        if (statusCode.includes("delivered")) status = "DELIVERED";
        else if (statusCode.includes("out_for_delivery") || statusCode.includes("with_courier")) status = "OUT_FOR_DELIVERY";
        else if (statusCode.includes("shipped")) status = "SHIPPED";
        else if (statusCode.includes("label") || statusCode.includes("created")) status = "LABEL_CREATED";
        else status = "IN_TRANSIT";

        const events = shipment.events.map((ev: any, idx: number) => ({
          id: `dhl-ev-${idx}`,
          timestamp: ev.timestamp ? new Date(ev.timestamp).toLocaleString() : new Date().toLocaleString(),
          location: ev.location?.address?.addressLocality || ev.location?.address?.countryCode || "DHL Hub",
          status: ev.status || ev.statusCode || "Status Update",
          description: ev.description || ev.status || "Package processed",
          completed: true,
        }));

        let stepIndex = 2;
        if (status === "DELIVERED") stepIndex = 3;
        else if (status === "OUT_FOR_DELIVERY") stepIndex = 2;
        else if (status === "SHIPPED") stepIndex = 1;
        else if (status === "LABEL_CREATED") stepIndex = 0;

        return {
          trackingNumber: num,
          carrierId: "dhl",
          carrierName: "DHL Express",
          status,
          statusStepIndex: stepIndex,
          estimatedDelivery: shipment.estimatedTimeOfDelivery || "Live Status Available",
          origin: shipment.origin?.address?.addressLocality || "Origin Hub",
          destination: shipment.destination?.address?.addressLocality || "Destination Address",
          carrierUrl: `https://www.dhl.com/en/express/tracking.html?AWB=${num}`,
          events,
          lastUpdated: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
      }
    }
  } catch (_e) {
    //
  }
  return null;
}

async function fetchUspsRealData(num: string) {
  try {
    const uspsUrl = `https://tools.usps.com/tools/app/ziplookup/trackReport?trackingNumber=${encodeURIComponent(num)}`;
    const res = await fetch(uspsUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (res.ok) {
      const data = await res.json();
      const trackInfo = data?.m_trackInfo;
      if (trackInfo && trackInfo.m_detailItem && trackInfo.m_detailItem.length > 0) {
        const events = trackInfo.m_detailItem.map((item: any, idx: number) => ({
          id: `usps-ev-${idx}`,
          timestamp: `${item.eventDate || ""} ${item.eventTime || ""}`.trim() || new Date().toLocaleString(),
          location: `${item.eventCity || ""}, ${item.eventState || ""} ${item.eventZIP || ""}`.trim() || "USPS Facility",
          status: item.eventName || "USPS Update",
          description: item.eventName || "In Transit",
          completed: true,
        }));

        const statusSummary = (trackInfo.m_summary || "").toLowerCase();
        let status: "DELIVERED" | "OUT_FOR_DELIVERY" | "IN_TRANSIT" | "SHIPPED" | "LABEL_CREATED" = "IN_TRANSIT";

        if (statusSummary.includes("delivered")) status = "DELIVERED";
        else if (statusSummary.includes("out for delivery")) status = "OUT_FOR_DELIVERY";
        else if (statusSummary.includes("in transit") || statusSummary.includes("moving")) status = "IN_TRANSIT";

        let stepIndex = 2;
        if (status === "DELIVERED") stepIndex = 3;

        return {
          trackingNumber: num,
          carrierId: "usps",
          carrierName: "USPS",
          status,
          statusStepIndex: stepIndex,
          estimatedDelivery: trackInfo.expectedDeliveryDate || "Live Status Available",
          origin: "USPS Facility",
          destination: "Destination Address",
          carrierUrl: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${num}`,
          events,
          lastUpdated: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
      }
    }
  } catch (_e) {
    //
  }
  return null;
}

async function fetchParcelsAppRealData(num: string, carrier: string) {
  try {
    const url = `https://parcelsapp.com/api/v2/parcels`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({
        trackingId: num,
        language: "en",
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.states && data.states.length > 0) {
        const events = data.states.map((st: any, idx: number) => ({
          id: `parcels-ev-${idx}`,
          timestamp: st.date || new Date().toLocaleString(),
          location: st.location || "Logistics Facility",
          status: st.status || "Update",
          description: st.carrier || st.status || "Package checkpoint event",
          completed: true,
        }));

        const lastState = (data.states[0]?.status || "").toLowerCase();
        let status: "DELIVERED" | "OUT_FOR_DELIVERY" | "IN_TRANSIT" | "SHIPPED" | "LABEL_CREATED" = "IN_TRANSIT";

        if (lastState.includes("delivered") || lastState.includes("doručen")) status = "DELIVERED";
        else if (lastState.includes("out for delivery") || lastState.includes("doručovan")) status = "OUT_FOR_DELIVERY";
        else if (lastState.includes("transit") || lastState.includes("ceste")) status = "IN_TRANSIT";
        else if (lastState.includes("shipped") || lastState.includes("odoslan")) status = "SHIPPED";

        let stepIndex = 2;
        if (status === "DELIVERED") stepIndex = 3;
        else if (status === "OUT_FOR_DELIVERY") stepIndex = 2;
        else if (status === "SHIPPED") stepIndex = 1;

        let displayCarrierName = data.carrierName || carrier.toUpperCase();
        if (carrier === "sps") displayCarrierName = "Slovak Parcel Service (SPS)";
        else if (carrier === "chinapost" || num.endsWith("CN")) displayCarrierName = "China Post / EMS";
        else if (carrier === "alza") displayCarrierName = "Alza.sk";
        else if (carrier === "packeta") displayCarrierName = "Packeta (Zásielkovňa)";

        return {
          trackingNumber: num,
          carrierId: carrier,
          carrierName: displayCarrierName,
          status,
          statusStepIndex: stepIndex,
          estimatedDelivery: data.estimatedDeliveryDate || "Live Status Updated",
          origin: data.origin || "Origin Facility",
          destination: data.destination || "Destination Address",
          carrierUrl: `https://www.17track.net/en/track#nums=${num}`,
          events,
          lastUpdated: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
      }
    }
  } catch (_e) {
    //
  }
  return null;
}

async function fetch17TrackRealData(num: string, carrier: string) {
  try {
    const url = `https://t.17track.net/rest/express/v1/gettrackinfo`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: JSON.stringify([{ num }]),
    });

    if (res.ok) {
      const data = await res.json();
      const trackItem = data?.data?.[0];
      const trackData = trackItem?.track;
      if (trackData && trackData.z1 && trackData.z1.length > 0) {
        const events = trackData.z1.map((ev: any, idx: number) => ({
          id: `17t-ev-${idx}`,
          timestamp: ev.a || new Date().toLocaleString(),
          location: ev.c || ev.d || "Postal Exchange",
          status: ev.z || "Checkpoint Event",
          description: ev.z || "Tracking event",
          completed: true,
        }));

        const statusVal = trackItem.e; // 10: In Transit, 40: Delivered, etc.
        let status: "DELIVERED" | "OUT_FOR_DELIVERY" | "IN_TRANSIT" | "SHIPPED" | "LABEL_CREATED" = "IN_TRANSIT";
        let stepIndex = 2;

        if (statusVal === 40 || statusVal === "40") {
          status = "DELIVERED";
          stepIndex = 3;
        } else if (statusVal === 30 || statusVal === "30") {
          status = "OUT_FOR_DELIVERY";
          stepIndex = 2;
        }

        let displayCarrierName = "17TRACK Postal Network";
        if (carrier === "chinapost" || num.endsWith("CN")) displayCarrierName = "China Post / EMS";
        else if (carrier === "sps") displayCarrierName = "Slovak Parcel Service (SPS)";
        else if (carrier === "packeta") displayCarrierName = "Packeta (Zásielkovňa)";

        return {
          trackingNumber: num,
          carrierId: carrier,
          carrierName: displayCarrierName,
          status,
          statusStepIndex: stepIndex,
          estimatedDelivery: "Live Status Available",
          origin: "Origin Facility",
          destination: "Destination Address",
          carrierUrl: `https://www.17track.net/en/track#nums=${num}`,
          events,
          lastUpdated: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
      }
    }
  } catch (_e) {
    //
  }
  return null;
}
