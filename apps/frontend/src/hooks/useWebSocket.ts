"use client";

import {
  useRrWebSocket,
  useWebSocket,
  type RrWebSocketContextValue,
} from "@/components/Providers/rrWebSocketProvider";

export { useRrWebSocket, useWebSocket };
export type { RrWebSocketContextValue };
export default useWebSocket;
