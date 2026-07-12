"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import {
  encrypt,
  decrypt,
  generateFileKey,
  exportRawKey,
} from "@runa/crypto/browser";

export interface Peer {
  socketId: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  deviceType: string;
  deviceName: string;
  constellation?: any;
}

export interface TransferFile {
  name: string;
  size: number;
  progress: number;
  status: "idle" | "encrypting" | "transferring" | "decrypting" | "completed" | "cancelled" | "rejected";
  speed: number;
  eta: number;
  error?: string;
}

export interface TransferState {
  batchId: string;
  peerId: string;
  peerName: string;
  direction: "send" | "receive";
  status: "connecting" | "transferring" | "completed" | "cancelled" | "rejected";
  files: TransferFile[];
}

export interface IncomingRequest {
  peerId: string;
  peerName: string;
  batchId: string;
  sessionKey: string;
  files: { name: string; size: number }[];
}

const CHUNK_SIZE = 16384; // 16 KB
const BUFFER_THRESHOLD = 16 * 1024 * 1024; // 16 MB

const getDeviceType = (): "mobile" | "tablet" | "desktop" => {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "tablet";
  }
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return "mobile";
  }
  return "desktop";
};

const getDeviceName = (): string => {
  if (typeof window === "undefined") return "Browser";
  const ua = navigator.userAgent;
  let browserName = "Browser";
  if (ua.indexOf("Firefox") > -1) browserName = "Firefox";
  else if (ua.indexOf("SamsungBrowser") > -1) browserName = "Samsung Browser";
  else if (ua.indexOf("Opera") > -1 || ua.indexOf("OPR") > -1) browserName = "Opera";
  else if (ua.indexOf("Trident") > -1) browserName = "IE";
  else if (ua.indexOf("Edge") > -1 || ua.indexOf("Edg") > -1) browserName = "Edge";
  else if (ua.indexOf("Chrome") > -1) browserName = "Chrome";
  else if (ua.indexOf("Safari") > -1) browserName = "Safari";

  const os = ua.indexOf("Windows") > -1 ? "Windows" :
             ua.indexOf("Macintosh") > -1 ? "macOS" :
             ua.indexOf("Linux") > -1 ? "Linux" :
             ua.indexOf("Android") > -1 ? "Android" :
             ua.indexOf("like Mac") > -1 ? "iOS" : "OS";

  return `${browserName} on ${os}`;
};

export function useLacertaSharing() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [isHidden, setIsHidden] = useState<boolean>(false);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [selectedPeerId, setSelectedPeerId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Map of active transfers (keyed by batchId)
  const [transfers, setTransfers] = useState<Record<string, TransferState>>({});
  const transfersRef = useRef<Record<string, TransferState>>({});

  const activeSendingBatches = useRef<Map<string, {
    batchId: string;
    files: {
      name: string;
      size: number;
      type: string;
      fileObj: File;
    }[];
  }>>(new Map());

  // Keyed by `${batchId}-${fileIndex}`
  const activeFileKeys = useRef<Map<string, string>>(new Map());

  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>([]);

  // Keyed by `${peerId}-${batchId}`
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  // Keyed by `${batchId}-${fileIndex}`
  const dataChannels = useRef<Map<string, RTCDataChannel>>(new Map());
  // Keyed by `${peerId}-${batchId}`
  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  // Keyed by `${batchId}-${fileIndex}`
  const ownEphemeralKeys = useRef<
    Map<
      string,
      {
        ecdhPrivateKey: CryptoKey;
        ecdhPublicKeyBase64: string;
        mlKemPrivateKey: Uint8Array;
        mlKemPublicKeyBase64: string;
      }
    >
  >(new Map());

  // Keyed by `${batchId}-${fileIndex}`
  const peerEphemeralPublicKeys = useRef<
    Map<string, { ecdhPublicKey: string; mlKemPublicKey: string }>
  >(new Map());

  // Keyed by `${batchId}-${fileIndex}`
  const receivedChunks = useRef<Map<string, ArrayBuffer[]>>(new Map());
  const receivedBytes = useRef<Map<string, number>>(new Map());

  // Keyed by `${batchId}-${fileIndex}`
  const lastProgressTime = useRef<Map<string, number>>(new Map());
  const lastProgressBytes = useRef<Map<string, number>>(new Map());

  const accessToken = session?.accessToken || "";

  useEffect(() => {
    transfersRef.current = transfers;
  }, [transfers]);

  // Auto-dismiss completed or terminated transfers after 4 seconds
  useEffect(() => {
    const activeTerminated = Object.values(transfers).filter((t) =>
      ["completed", "rejected", "cancelled"].includes(t.status)
    );

    if (activeTerminated.length > 0) {
      const timers = activeTerminated.map((t) => {
        return setTimeout(() => {
          setTransfers((prev) => {
            const next = { ...prev };
            delete next[t.batchId];
            return next;
          });
        }, 4000);
      });
      return () => timers.forEach((timer) => clearTimeout(timer));
    }
  }, [transfers]);

  // Read visibility config from local storage
  useEffect(() => {
    const savedHidden = localStorage.getItem("lacerta_drop_hidden");
    if (savedHidden === "true") {
      setIsHidden(true);
    }
  }, []);

  // Enforce authentication redirect
  useEffect(() => {
    if (status === "unauthenticated") {
      toast.error("Access denied. Please sign in to use Lacerta Drop.");
      router.push("/api/auth/signin?callbackUrl=/lacerta/drop");
    }
  }, [status, router]);

  // Clean WebRTC connections for a specific batch
  const cleanPeerConnection = useCallback((peerId: string, batchId: string) => {
    const connKey = `${peerId}-${batchId}`;
    const pc = peerConnections.current.get(connKey);
    if (pc) {
      pc.close();
      peerConnections.current.delete(connKey);
    }

    // Close all channels for this batch
    const batch = transfersRef.current[batchId];
    if (batch) {
      batch.files.forEach((_, idx) => {
        const channelKey = `${batchId}-${idx}`;
        const ch = dataChannels.current.get(channelKey);
        if (ch) {
          ch.close();
          dataChannels.current.delete(channelKey);
        }
        ownEphemeralKeys.current.delete(channelKey);
        peerEphemeralPublicKeys.current.delete(channelKey);
        receivedChunks.current.delete(channelKey);
        receivedBytes.current.delete(channelKey);
        lastProgressTime.current.delete(channelKey);
        lastProgressBytes.current.delete(channelKey);
        activeFileKeys.current.delete(channelKey);
      });
    }

    pendingCandidates.current.delete(connKey);
    activeSendingBatches.current.delete(batchId);
  }, []);

  // Clean up connections on unmount
  useEffect(() => {
    return () => {
      peerConnections.current.forEach((pc) => pc.close());
      dataChannels.current.forEach((ch) => ch.close());
    };
  }, []);

  const sendAskBatchTransferDirect = useCallback(async (ch: RTCDataChannel, peerId: string, batchId: string) => {
    try {
      const batch = activeSendingBatches.current.get(batchId);
      if (!batch) return;

      setTransfers((prev) => {
        const current = prev[batchId];
        if (!current) return prev;
        return {
          ...prev,
          [batchId]: {
            ...current,
            files: current.files.map((f) => ({ ...f, status: "encrypting" })),
          },
        };
      });

      const sessionKey = await exportRawKey(await generateFileKey());
      
      const encryptedFiles = await Promise.all(
        batch.files.map(async (f, idx) => {
          activeFileKeys.current.set(`${batchId}-${idx}`, sessionKey);
          const metaStr = JSON.stringify({
            fileName: f.name,
            fileSize: f.size,
            fileType: f.type || "application/octet-stream",
          });
          const encryptedMeta = await encrypt(metaStr, sessionKey);
          return { encryptedMeta };
        })
      );

      const peerKeys = peerEphemeralPublicKeys.current.get(`${batchId}-0`);
      if (!peerKeys) {
        throw new Error("P2P PQ Cryptographic handshake not completed.");
      }

      const { hybridWrapKey, base64UrlToBuffer } = await import("@runa/crypto/browser");
      const peerMlKemBytes = new Uint8Array(
        base64UrlToBuffer(peerKeys.mlKemPublicKey)
      );

      const wrappedSessionKey = await hybridWrapKey(
        sessionKey,
        peerKeys.ecdhPublicKey,
        peerMlKemBytes
      );

      ch.send(JSON.stringify({
        type: "ASK_BATCH_TRANSFER",
        batchId: batch.batchId,
        senderName: session?.user?.username || "Local Device",
        files: encryptedFiles,
        wrappedSessionKey: JSON.stringify(wrappedSessionKey),
      }));
    } catch (err) {
      console.error("[WebRTC] Failed to send ASK_BATCH_TRANSFER request:", err);
      toast.error("Failed to prepare file transfer.");
      setTransfers((prev) => {
        const next = { ...prev };
        delete next[batchId];
        return next;
      });
      cleanPeerConnection(peerId, batchId);
    }
  }, [session, cleanPeerConnection]);

  const startBatchFileChunking = useCallback(async (peerId: string, batchId: string, fileIndex: number) => {
    const batch = activeSendingBatches.current.get(batchId);
    const channelKey = `${batchId}-${fileIndex}`;
    const key = activeFileKeys.current.get(channelKey);
    const ch = dataChannels.current.get(channelKey);

    if (!batch || !key || !ch) {
      toast.error("Transfer error. Session details missing.");
      return;
    }

    const currentFile = batch.files[fileIndex];
    if (!currentFile) return;

    try {
      ch.send(JSON.stringify({ type: "START_FILE", batchId, fileIndex }));
      
      setTransfers((prev) => {
        const current = prev[batchId];
        if (!current) return prev;
        const newFiles = [...current.files];
        newFiles[fileIndex] = { ...newFiles[fileIndex], status: "encrypting" };
        return { ...prev, [batchId]: { ...current, files: newFiles } };
      });

      const fileBuffer = await currentFile.fileObj.arrayBuffer();
      const encryptedBuffer = await encrypt(fileBuffer, key);
      const totalSize = encryptedBuffer.byteLength;

      setTransfers((prev) => {
        const current = prev[batchId];
        if (!current) return prev;
        const newFiles = [...current.files];
        newFiles[fileIndex] = { ...newFiles[fileIndex], status: "transferring" };
        return { ...prev, [batchId]: { ...current, files: newFiles } };
      });

      let offset = 0;
      lastProgressTime.current.set(channelKey, performance.now());
      lastProgressBytes.current.set(channelKey, 0);

      while (offset < totalSize) {
        if (ch.bufferedAmount > BUFFER_THRESHOLD) {
          await new Promise<void>((resolve) => {
            ch.onbufferedamountlow = () => {
              ch.onbufferedamountlow = null;
              resolve();
            };
          });
        }

        const chunk = encryptedBuffer.slice(offset, offset + CHUNK_SIZE);
        ch.send(chunk);
        offset += chunk.byteLength;

        const now = performance.now();
        const lastTime = lastProgressTime.current.get(channelKey) || now;
        const elapsed = (now - lastTime) / 1000;

        let speed = 0;
        let eta = 0;

        if (elapsed >= 0.5) {
          const lastBytes = lastProgressBytes.current.get(channelKey) || 0;
          const sentSinceLast = offset - lastBytes;
          speed = Math.round(sentSinceLast / elapsed);
          const remaining = totalSize - offset;
          eta = speed > 0 ? Math.round(remaining / speed) : 0;

          lastProgressTime.current.set(channelKey, now);
          lastProgressBytes.current.set(channelKey, offset);
        }

        setTransfers((prev) => {
          const current = prev[batchId];
          if (!current) return prev;
          const newFiles = [...current.files];
          const progress = Math.min(100, Math.round((offset / totalSize) * 100));
          newFiles[fileIndex] = {
            ...newFiles[fileIndex],
            progress,
            speed: speed || newFiles[fileIndex].speed,
            eta: eta || newFiles[fileIndex].eta,
          };
          return { ...prev, [batchId]: { ...current, files: newFiles } };
        });
      }

      ch.send(JSON.stringify({ type: "EOF", batchId, fileIndex }));
    } catch (err) {
      console.error("[WebRTC] File encryption or chunking failed:", err);
      toast.error(`Failed to send file: ${currentFile.name}`);
      setTransfers((prev) => {
        const current = prev[batchId];
        if (!current) return prev;
        const newFiles = [...current.files];
        newFiles[fileIndex] = { ...newFiles[fileIndex], status: "cancelled", error: "Encryption error." };
        return { ...prev, [batchId]: { ...current, status: "cancelled", files: newFiles } };
      });
      cleanPeerConnection(peerId, batchId);
    }
  }, [cleanPeerConnection]);

  const reconstructBatchFile = useCallback(async (peerId: string, batchId: string, fileIndex: number) => {
    const state = transfersRef.current[batchId];
    if (!state) return;

    const currentFile = state.files[fileIndex];
    if (!currentFile) return;

    const channelKey = `${batchId}-${fileIndex}`;
    const chunks = receivedChunks.current.get(channelKey) || [];

    try {
      const totalLen = chunks.reduce((acc, c) => acc + c.byteLength, 0);
      const concatenated = new Uint8Array(totalLen);
      let offset = 0;
      for (const chunk of chunks) {
        concatenated.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
      }

      const decryptionKey = activeFileKeys.current.get(channelKey);
      if (!decryptionKey) {
        throw new Error("Missing decryption key.");
      }

      const decryptedBuffer = await decrypt(concatenated.buffer, decryptionKey);

      const blob = new Blob([decryptedBuffer], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = currentFile.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      receivedChunks.current.delete(channelKey);
      receivedBytes.current.delete(channelKey);

      const ch = dataChannels.current.get(channelKey);
      if (ch) {
        ch.send(JSON.stringify({ type: "FILE_RECEIVED", batchId, fileIndex }));
      }
    } catch (err) {
      console.error("[WebRTC] File decryption failed:", err);
      toast.error(`Failed to decrypt received file: ${currentFile.name}`);
      setTransfers((prev) => {
        const current = prev[batchId];
        if (!current) return prev;
        const newFiles = [...current.files];
        newFiles[fileIndex] = { ...newFiles[fileIndex], status: "cancelled", error: "Decryption error." };
        return { ...prev, [batchId]: { ...current, status: "cancelled", files: newFiles } };
      });
      cleanPeerConnection(peerId, batchId);
    }
  }, [cleanPeerConnection]);

  const setupDataChannel = useCallback((ch: RTCDataChannel, peerId: string, batchId: string, fileIndex: number) => {
    ch.binaryType = "arraybuffer";
    const channelKey = `${batchId}-${fileIndex}`;

    const generateAndSendPQHandshake = async () => {
      try {
        const { generateKeyPair, exportPublicKey, generateMlKemKeyPair, bufferToBase64Url } = await import("@runa/crypto/browser");
        const ownEcdh = await generateKeyPair();
        const ownEcdhPub = await exportPublicKey(ownEcdh.publicKey);

        const ownMlKem = await generateMlKemKeyPair();
        const ownMlKemPub = bufferToBase64Url(
          ownMlKem.publicKey.buffer.slice(
            ownMlKem.publicKey.byteOffset,
            ownMlKem.publicKey.byteOffset + ownMlKem.publicKey.byteLength
          ) as ArrayBuffer
        );

        ownEphemeralKeys.current.set(channelKey, {
          ecdhPrivateKey: ownEcdh.privateKey,
          ecdhPublicKeyBase64: ownEcdhPub,
          mlKemPrivateKey: ownMlKem.secretKey,
          mlKemPublicKeyBase64: ownMlKemPub,
        });

        ch.send(
          JSON.stringify({
            type: "PQ_HANDSHAKE",
            ecdhPublicKey: ownEcdhPub,
            mlKemPublicKey: ownMlKemPub,
            batchId,
            fileIndex,
          })
        );
      } catch (err) {
        console.error("[WebRTC] PQ Handshake generation failed:", err);
      }
    };

    if (ch.readyState === "open") {
      generateAndSendPQHandshake();
    } else {
      ch.onopen = () => {
        generateAndSendPQHandshake();
      };
    }

    ch.onclose = () => {
      console.warn(`[WebRTC] Data channel closed with peer: ${peerId}, channel: ${channelKey}`);
    };

    ch.onerror = (err) => {
      console.error(`[WebRTC] Data channel error with peer ${peerId}, channel: ${channelKey}:`, err);
    };

    ch.onmessage = async (event) => {
      const data = event.data;

      if (typeof data === "string") {
        try {
          const message = JSON.parse(data);

          if (message.type === "PQ_HANDSHAKE") {
            peerEphemeralPublicKeys.current.set(channelKey, {
              ecdhPublicKey: message.ecdhPublicKey,
              mlKemPublicKey: message.mlKemPublicKey,
            });

            const active = transfersRef.current[batchId];
            if (
              active &&
              active.peerId === peerId &&
              active.direction === "send" &&
              active.status === "connecting" &&
              fileIndex === 0
            ) {
              sendAskBatchTransferDirect(ch, peerId, batchId);
            }
            return;
          }

          if (message.type === "ASK_BATCH_TRANSFER") {
            const ownKeys = ownEphemeralKeys.current.get(`${batchId}-0`);
            if (!ownKeys) {
              throw new Error("No private key available for unwrapping. Encryption handshake not completed.");
            }

            const { hybridUnwrapKey, exportRawKey } = await import("@runa/crypto/browser");
            const wrappedSessionKey = JSON.parse(message.wrappedSessionKey);

            const unwrappedKey = await hybridUnwrapKey(
              wrappedSessionKey,
              ownKeys.ecdhPrivateKey,
              ownKeys.mlKemPrivateKey
            );
            const decryptionKey = await exportRawKey(unwrappedKey);

            const decryptedFiles = await Promise.all(
              message.files.map(async (f: any, idx: number) => {
                activeFileKeys.current.set(`${batchId}-${idx}`, decryptionKey || "");
                if (decryptionKey && f.encryptedMeta) {
                  const decryptedResult = await decrypt(f.encryptedMeta, decryptionKey);
                  const decryptedMeta = typeof decryptedResult === "string" ? JSON.parse(decryptedResult) : decryptedResult;
                  return {
                    name: decryptedMeta.fileName,
                    size: decryptedMeta.fileSize,
                  };
                }
                return { name: "Encrypted File", size: 0 };
              })
            );

            setIncomingRequests((prev) => [
              ...prev,
              {
                peerId,
                peerName: message.senderName || "Local Device",
                batchId: message.batchId,
                sessionKey: decryptionKey || "",
                files: decryptedFiles,
              }
            ]);
          }

          else if (message.type === "ACCEPT_BATCH_TRANSFER") {
            setTransfers((prev) => {
              const current = prev[batchId];
              if (!current) return prev;
              return {
                ...prev,
                [batchId]: {
                  ...current,
                  status: "transferring",
                  files: current.files.map((f) => ({ ...f, status: "transferring" })),
                },
              };
            });

            // Start sending ALL files concurrently!
            const batch = activeSendingBatches.current.get(batchId);
            if (batch) {
              batch.files.forEach((_, idx) => {
                startBatchFileChunking(peerId, batchId, idx);
              });
            }
          }

          else if (message.type === "REJECT_BATCH_TRANSFER") {
            toast.error("Transfer rejected by receiver.");
            setTransfers((prev) => {
              const current = prev[batchId];
              if (!current) return prev;
              return {
                ...prev,
                [batchId]: {
                  ...current,
                  status: "rejected",
                  files: current.files.map((f) => ({ ...f, status: "rejected" })),
                },
              };
            });
            cleanPeerConnection(peerId, batchId);
          }

          else if (message.type === "START_FILE") {
            setTransfers((prev) => {
              const current = prev[batchId];
              if (!current) return prev;
              const newFiles = [...current.files];
              newFiles[fileIndex] = { ...newFiles[fileIndex], status: "transferring", progress: 0 };
              return { ...prev, [batchId]: { ...current, files: newFiles } };
            });
            receivedChunks.current.set(channelKey, []);
            receivedBytes.current.set(channelKey, 0);
            lastProgressTime.current.set(channelKey, performance.now());
            lastProgressBytes.current.set(channelKey, 0);
          }

          else if (message.type === "EOF") {
            setTransfers((prev) => {
              const current = prev[batchId];
              if (!current) return prev;
              const newFiles = [...current.files];
              newFiles[fileIndex] = { ...newFiles[fileIndex], status: "decrypting", progress: 100 };
              return { ...prev, [batchId]: { ...current, files: newFiles } };
            });
            await reconstructBatchFile(peerId, batchId, fileIndex);
          }

          else if (message.type === "FILE_RECEIVED") {
            setTransfers((prev) => {
              const current = prev[batchId];
              if (!current) return prev;
              const newFiles = [...current.files];
              newFiles[fileIndex] = { ...newFiles[fileIndex], status: "completed", progress: 100 };
              
              // Check if all files in the batch are completed
              const allDone = newFiles.every((f) => f.status === "completed" || f.status === "cancelled" || f.status === "rejected");
              const nextStatus = allDone ? "completed" as const : current.status;
              
              if (allDone) {
                toast.success("All files sent successfully!");
                // Cleanup peer connection after a small delay to make sure signals completed
                setTimeout(() => cleanPeerConnection(peerId, batchId), 1000);
              }

              return { ...prev, [batchId]: { ...current, status: nextStatus, files: newFiles } };
            });
          }

          else if (message.type === "CANCEL_TRANSFER") {
            toast.error("Transfer cancelled by peer.");
            setTransfers((prev) => {
              const current = prev[batchId];
              if (!current) return prev;
              return {
                ...prev,
                [batchId]: {
                  ...current,
                  status: "cancelled",
                  files: current.files.map((f) => ({ ...f, status: "cancelled", error: "Cancelled by peer." })),
                },
              };
            });
            cleanPeerConnection(peerId, batchId);
          }
        } catch (e) {
          console.error("[WebRTC] Error handling string payload:", e);
        }
      } 
      else if (data instanceof ArrayBuffer) {
        const chunks = receivedChunks.current.get(channelKey) || [];
        chunks.push(data);
        receivedChunks.current.set(channelKey, chunks);

        const currentBytes = (receivedBytes.current.get(channelKey) || 0) + data.byteLength;
        receivedBytes.current.set(channelKey, currentBytes);

        const now = performance.now();
        const lastTime = lastProgressTime.current.get(channelKey) || now;
        const elapsed = (now - lastTime) / 1000;
        
        let speed = 0;
        let eta = 0;

        if (elapsed >= 0.5) {
          const lastBytes = lastProgressBytes.current.get(channelKey) || 0;
          const sentSinceLast = currentBytes - lastBytes;
          speed = Math.round(sentSinceLast / elapsed);
          
          const current = transfersRef.current[batchId];
          const currentFile = current?.files[fileIndex];
          const remaining = (currentFile?.size || 0) - currentBytes;
          eta = speed > 0 ? Math.round(remaining / speed) : 0;

          lastProgressTime.current.set(channelKey, now);
          lastProgressBytes.current.set(channelKey, currentBytes);
        }

        setTransfers((prev) => {
          const current = prev[batchId];
          if (!current) return prev;
          const newFiles = [...current.files];
          const currentFile = newFiles[fileIndex];
          if (currentFile) {
            const progress = Math.min(100, Math.round((currentBytes / currentFile.size) * 100));
            newFiles[fileIndex] = {
              ...currentFile,
              progress,
              speed: speed || currentFile.speed,
              eta: eta || currentFile.eta,
            };
          }
          return { ...prev, [batchId]: { ...current, files: newFiles } };
        });
      }
    };
  }, [sendAskBatchTransferDirect, startBatchFileChunking, reconstructBatchFile, cleanPeerConnection]);

  const getOrCreatePeerConnection = useCallback((peerId: string, batchId: string, isInitiator: boolean, currentSocket: Socket): RTCPeerConnection => {
    const connKey = `${peerId}-${batchId}`;
    let pc = peerConnections.current.get(connKey);
    if (pc) return pc;

    pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        currentSocket.emit("signal", {
          target: peerId,
          signal: { candidate: event.candidate, batchId },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc?.connectionState === "disconnected" || pc?.connectionState === "failed" || pc?.connectionState === "closed") {
        cleanPeerConnection(peerId, batchId);
        setTransfers((prev) => {
          const current = prev[batchId];
          if (current && current.status !== "completed") {
            return {
              ...prev,
              [batchId]: {
                ...current,
                status: "cancelled",
                files: current.files.map((f) => ({ ...f, status: "cancelled", error: "Connection lost." })),
              },
            };
          }
          return prev;
        });
      }
    };

    if (isInitiator) {
      // Data channels will be created dynamically inside queueFileForSend
    } else {
      pc.ondatachannel = (event) => {
        const label = event.channel.label;
        if (label.startsWith("file-transfer-")) {
          const parts = label.substring("file-transfer-".length).split("-");
          const bId = parts[0];
          const fIdx = parseInt(parts[1], 10);
          setupDataChannel(event.channel, peerId, bId, fIdx);
          dataChannels.current.set(`${bId}-${fIdx}`, event.channel);
        }
      };
    }

    peerConnections.current.set(connKey, pc);
    return pc;
  }, [cleanPeerConnection, setupDataChannel]);

  const queueFileForSend = useCallback((peerId: string, peerName: string, filesList: File[]) => {
    const initiateSend = async () => {
      try {
        const batchId = Math.random().toString(36).substring(2, 10);
        
        activeSendingBatches.current.set(batchId, {
          batchId,
          files: filesList.map((f) => ({
            name: f.name,
            size: f.size,
            type: f.type,
            fileObj: f,
          })),
        });

        setTransfers((prev) => ({
          ...prev,
          [batchId]: {
            batchId,
            peerId,
            peerName,
            direction: "send",
            status: "connecting",
            files: filesList.map(f => ({
              name: f.name,
              size: f.size,
              progress: 0,
              status: "idle",
              speed: 0,
              eta: 0,
            })),
          },
        }));

        if (!socket) {
          activeSendingBatches.current.delete(batchId);
          return;
        }
        
        const pc = getOrCreatePeerConnection(peerId, batchId, true, socket);

        // Create data channels for all files in parallel
        filesList.forEach((_, idx) => {
          const ch = pc.createDataChannel(`file-transfer-${batchId}-${idx}`, { ordered: true });
          setupDataChannel(ch, peerId, batchId, idx);
          dataChannels.current.set(`${batchId}-${idx}`, ch);
        });

        if (pc.signalingState === "stable") {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("signal", {
            target: peerId,
            signal: { sdp: pc.localDescription, batchId },
          });
        }
      } catch (err) {
        console.error("[WebRTC] Failed to initiate send request:", err);
        toast.error("Failed to connect to peer.");
      }
    };
    initiateSend();
  }, [socket, getOrCreatePeerConnection, setupDataChannel]);

  // Accept incoming transfer
  const acceptIncomingTransfer = async (batchId: string) => {
    const req = incomingRequests.find((r) => r.batchId === batchId);
    if (!req || !socket) return;

    setIncomingRequests((prev) => prev.filter((r) => r.batchId !== batchId));

    setTransfers((prev) => ({
      ...prev,
      [batchId]: {
        batchId,
        peerId: req.peerId,
        peerName: req.peerName,
        direction: "receive",
        status: "transferring",
        files: req.files.map((f) => ({
          name: f.name,
          size: f.size,
          progress: 0,
          status: "transferring",
          speed: 0,
          eta: 0,
        })),
      },
    }));

    // Setup channels on receiver side are already done via ondatachannel
    // We send accepting signal on the control channel (fileIndex 0)
    const ch = dataChannels.current.get(`${batchId}-0`);
    if (ch) {
      ch.send(JSON.stringify({ type: "ACCEPT_BATCH_TRANSFER", batchId }));
    }
  };

  // Decline incoming transfer
  const declineIncomingTransfer = (batchId: string) => {
    const req = incomingRequests.find((r) => r.batchId === batchId);
    if (!req) return;

    setIncomingRequests((prev) => prev.filter((r) => r.batchId !== batchId));

    const ch = dataChannels.current.get(`${batchId}-0`);
    if (ch) {
      ch.send(JSON.stringify({ type: "REJECT_BATCH_TRANSFER", batchId }));
    }
    cleanPeerConnection(req.peerId, batchId);
  };

  // Cancel active transfer
  const cancelActiveTransfer = (batchId: string) => {
    const current = transfersRef.current[batchId];
    if (!current) return;

    // Send CANCEL on first data channel
    const ch = dataChannels.current.get(`${batchId}-0`);
    if (ch) {
      try {
        ch.send(JSON.stringify({ type: "CANCEL_TRANSFER" }));
      } catch (e) {}
    }

    cleanPeerConnection(current.peerId, batchId);
    setTransfers((prev) => {
      const curr = prev[batchId];
      if (!curr) return prev;
      return {
        ...prev,
        [batchId]: {
          ...curr,
          status: "cancelled",
          files: curr.files.map((f) => ({ ...f, status: "cancelled", error: "Cancelled by you." })),
        },
      };
    });
  };

  const getOrCreatePeerConnectionRef = useRef(getOrCreatePeerConnection);
  const cleanPeerConnectionRef = useRef(cleanPeerConnection);
  const sessionRef = useRef(session);
  const isHiddenRef = useRef(isHidden);

  useEffect(() => {
    getOrCreatePeerConnectionRef.current = getOrCreatePeerConnection;
    cleanPeerConnectionRef.current = cleanPeerConnection;
    sessionRef.current = session;
    isHiddenRef.current = isHidden;
  });

  // Socket setup
  const setupSocketConnection = useCallback(() => {
    if (status !== "authenticated" || !accessToken) return () => {};

    const apiBase = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? window.location.origin : "");
    const deviceType = getDeviceType();
    const deviceName = getDeviceName();

    const newSocket = io(`${apiBase}/lacerta-sharing`, {
      query: {
        token: accessToken,
        deviceType,
        deviceName,
      },
      transports: ["websocket"],
    });

    newSocket.on("connect", () => {
      newSocket.emit("register", { isHidden: isHiddenRef.current });
    });

    newSocket.on("peers-list", (peersList: Peer[]) => {
      setPeers(peersList);
    });

    newSocket.on("peer-joined", (data: Peer) => {
      setPeers((prev) => {
        if (prev.some((p) => p.socketId === data.socketId)) {
          return prev.map((p) => p.socketId === data.socketId ? data : p);
        }
        return [...prev, data];
      });
      
      const isMyDevice = data.userId === sessionRef.current?.user?.id;
      const displayName = isMyDevice ? `My Device (${data.deviceName})` : `${data.username} (${data.deviceName})`;
      toast.info(`${displayName} is online.`);
    });

    newSocket.on("peer-left", (data: { socketId: string }) => {
      setPeers((prev) => prev.filter((p) => p.socketId !== data.socketId));
      
      // Cancel active transfers with this peer
      const activeBatches = Object.values(transfersRef.current).filter(
        (t) => t.peerId === data.socketId && ["connecting", "transferring"].includes(t.status)
      );

      activeBatches.forEach((batch) => {
        setTransfers((prev) => {
          const current = prev[batch.batchId];
          if (!current) return prev;
          return {
            ...prev,
            [batch.batchId]: {
              ...current,
              status: "cancelled",
              files: current.files.map((f) => ({ ...f, status: "cancelled", error: "Peer went offline." })),
            },
          };
        });
        cleanPeerConnectionRef.current(data.socketId, batch.batchId);
      });
    });

    newSocket.on("signal", async (data: { sender: string; signal: any }) => {
      const { sender, signal } = data;
      const batchId = signal.batchId;
      if (!batchId) return;

      const pc = getOrCreatePeerConnectionRef.current(sender, batchId, false, newSocket);

      if (signal.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

        const queued = pendingCandidates.current.get(`${sender}-${batchId}`);
        if (queued) {
          for (const cand of queued) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (e) {}
          }
          pendingCandidates.current.delete(`${sender}-${batchId}`);
        }

        if (signal.sdp.type === "offer") {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          newSocket.emit("signal", {
            target: sender,
            signal: { sdp: pc.localDescription, batchId },
          });
        }
      } else if (signal.candidate) {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch (e) {}
        } else {
          const connKey = `${sender}-${batchId}`;
          if (!pendingCandidates.current.has(connKey)) {
            pendingCandidates.current.set(connKey, []);
          }
          pendingCandidates.current.get(connKey)!.push(signal.candidate);
        }
      }
    });

    setSocket(newSocket);
    return () => {
      newSocket.disconnect();
    };
  }, [status, accessToken]);

  // Load custom constellation from profileSettings
  const [myConstellation, setMyConstellation] = useState<any>(null);
  
  useEffect(() => {
    if (session?.user?.username && accessToken) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${session.user.username}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.profileSettings?.lacerta_drop_constellation) {
            try {
              const parsed = typeof data.profileSettings.lacerta_drop_constellation === "string"
                ? JSON.parse(data.profileSettings.lacerta_drop_constellation)
                : data.profileSettings.lacerta_drop_constellation;
              setMyConstellation(parsed);
            } catch (e) {}
          }
        })
        .catch(() => {});
    }
  }, [session, accessToken]);

  // Sync dynamically with custom events when constellation is saved in settings
  useEffect(() => {
    const handleConstellationChanged = () => {
      if (session?.user?.username && accessToken) {
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${session.user.username}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
          .then((res) => res.json())
          .then((data) => {
            if (data?.profileSettings?.lacerta_drop_constellation) {
              try {
                const parsed = typeof data.profileSettings.lacerta_drop_constellation === "string"
                  ? JSON.parse(data.profileSettings.lacerta_drop_constellation)
                  : data.profileSettings.lacerta_drop_constellation;
                setMyConstellation(parsed);
              } catch (e) {}
            }
          })
          .catch(() => {});
      }
    };

    window.addEventListener("runa-constellation-changed", handleConstellationChanged);
    return () => {
      window.removeEventListener("runa-constellation-changed", handleConstellationChanged);
    };
  }, [session, accessToken]);

  // Connect socket on mount
  useEffect(() => {
    const cleanup = setupSocketConnection();
    return () => {
      cleanup();
    };
  }, [setupSocketConnection]);

  // Sync dynamically with local visibility and constellation configuration states without reconnecting
  useEffect(() => {
    if (socket) {
      socket.emit("register", { isHidden, constellation: myConstellation });
    }
  }, [socket, isHidden, myConstellation]);

  // Handle setting visibility status
  const handleToggleHidden = () => {
    const nextHidden = !isHidden;
    setIsHidden(nextHidden);
    localStorage.setItem("lacerta_drop_hidden", String(nextHidden));
    toast.success(nextHidden ? "You are now hidden on the network." : "You are now visible on the network.");
  };

  // Click peer trigger selection
  const handlePeerClick = (peerId: string) => {
    setSelectedPeerId(peerId);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && selectedPeerId) {
      const peer = peers.find((p) => p.socketId === selectedPeerId);
      if (peer) {
        const isMyDevice = peer.userId === session?.user?.id;
        const displayName = isMyDevice ? `My Device (${peer.deviceName})` : `${peer.username} (${peer.deviceName})`;
        queueFileForSend(selectedPeerId, displayName, Array.from(files));
      }
    }
    setSelectedPeerId(null);
  };

  // Drag-and-drop triggers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      if (peers.length === 1) {
        const peer = peers[0];
        const isMyDevice = peer.userId === session?.user?.id;
        const displayName = isMyDevice ? `My Device (${peer.deviceName})` : `${peer.username} (${peer.deviceName})`;
        queueFileForSend(peer.socketId, displayName, Array.from(files));
      } else if (peers.length > 1) {
        toast.info("Select a device constellation node on the StarMap to share files.");
      } else {
        toast.error("No other devices online on this network.");
      }
    }
  };

  return {
    status,
    session,
    peers,
    isHidden,
    isDraggingOver,
    transfers,
    incomingRequests,
    fileInputRef,
    myConstellation,
    handleToggleHidden,
    handlePeerClick,
    handleFileInputChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    acceptIncomingTransfer,
    declineIncomingTransfer,
    cancelActiveTransfer,
    setTransfers,
    dismissTransfer: (batchId: string) => {
      setTransfers((prev) => {
        const next = { ...prev };
        delete next[batchId];
        return next;
      });
    },
  };
}
