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
  deviceType: string;
  deviceName: string;
  constellation?: any;
}

export interface TransferFile {
  name: string;
  size: number;
}

export interface TransferState {
  peerId: string;
  peerName: string;
  direction: "send" | "receive";
  status: "idle" | "connecting" | "encrypting" | "transferring" | "decrypting" | "completed" | "cancelled" | "rejected";
  files: TransferFile[];
  currentFileIndex: number;
  progress: number;
  speed: number;
  eta: number;
  error?: string;
}

export interface IncomingRequest {
  peerId: string;
  peerName: string;
  batchId: string;
  sessionKey: string;
  files: TransferFile[];
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

  const [transfer, setTransfer] = useState<TransferState | null>(null);
  const transferRef = useRef<TransferState | null>(null);

  const isTransferInProgress = useRef<boolean>(false);
  const activeSendingBatch = useRef<{
    batchId: string;
    files: {
      name: string;
      size: number;
      type: string;
      fileObj: File;
    }[];
  } | null>(null);
  const activeFileKey = useRef<string | null>(null);

  const [incomingRequest, setIncomingRequest] = useState<IncomingRequest | null>(null);

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const dataChannels = useRef<Map<string, RTCDataChannel>>(new Map());
  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

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
  const peerEphemeralPublicKeys = useRef<
    Map<string, { ecdhPublicKey: string; mlKemPublicKey: string }>
  >(new Map());

  const receivedChunks = useRef<ArrayBuffer[]>([]);
  const receivedBytes = useRef<number>(0);

  const lastProgressTime = useRef<number>(0);
  const lastProgressBytes = useRef<number>(0);

  const accessToken = session?.accessToken || "";

  useEffect(() => {
    transferRef.current = transfer;
  }, [transfer]);

  // Auto-dismiss completed or terminated transfers after 2 seconds
  useEffect(() => {
    if (transfer && ["completed", "rejected", "cancelled"].includes(transfer.status)) {
      const timer = setTimeout(() => {
        setTransfer(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [transfer?.status]);

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

  // Clean WebRTC connections
  const cleanPeerConnection = useCallback((peerId: string) => {
    const pc = peerConnections.current.get(peerId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(peerId);
    }
    const ch = dataChannels.current.get(peerId);
    if (ch) {
      ch.close();
      dataChannels.current.delete(peerId);
    }
    pendingCandidates.current.delete(peerId);
    ownEphemeralKeys.current.delete(peerId);
    peerEphemeralPublicKeys.current.delete(peerId);
  }, []);

  // Clean up connections on unmount
  useEffect(() => {
    return () => {
      peerConnections.current.forEach((pc) => pc.close());
      dataChannels.current.forEach((ch) => ch.close());
    };
  }, []);

  const sendAskBatchTransferDirect = useCallback(async (ch: RTCDataChannel, peerId: string) => {
    try {
      const batch = activeSendingBatch.current;
      if (!batch) return;

      setTransfer((prev) => prev ? { ...prev, status: "encrypting" } : null);

      const sessionKey = await exportRawKey(await generateFileKey());
      activeFileKey.current = sessionKey;

      const encryptedFiles = await Promise.all(
        batch.files.map(async (f) => {
          const metaStr = JSON.stringify({
            fileName: f.name,
            fileSize: f.size,
            fileType: f.type || "application/octet-stream",
          });
          const encryptedMeta = await encrypt(metaStr, sessionKey);
          return { encryptedMeta };
        })
      );

      const peerKeys = peerEphemeralPublicKeys.current.get(peerId);
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
      setTransfer(null);
      isTransferInProgress.current = false;
      activeSendingBatch.current = null;
      activeFileKey.current = null;
    }
  }, [session]);

  const startBatchFileChunking = useCallback(async (peerId: string, fileIndex: number) => {
    const batch = activeSendingBatch.current;
    const key = activeFileKey.current;
    const ch = dataChannels.current.get(peerId);

    if (!batch || !key || !ch) {
      toast.error("Transfer error. Session details missing.");
      isTransferInProgress.current = false;
      return;
    }

    const currentFile = batch.files[fileIndex];
    if (!currentFile) return;

    try {
      ch.send(JSON.stringify({ type: "START_FILE", batchId: batch.batchId, fileIndex }));
      setTransfer((prev) => prev ? { ...prev, status: "encrypting" } : null);

      const fileBuffer = await currentFile.fileObj.arrayBuffer();
      const encryptedBuffer = await encrypt(fileBuffer, key);
      const totalSize = encryptedBuffer.byteLength;

      setTransfer((prev) => prev ? { ...prev, status: "transferring" } : null);

      let offset = 0;
      lastProgressTime.current = performance.now();
      lastProgressBytes.current = 0;

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
        const elapsed = (now - lastProgressTime.current) / 1000;

        let speed = 0;
        let eta = 0;

        if (elapsed >= 0.5) {
          const sentSinceLast = offset - lastProgressBytes.current;
          speed = Math.round(sentSinceLast / elapsed);
          const remaining = totalSize - offset;
          eta = speed > 0 ? Math.round(remaining / speed) : 0;

          lastProgressTime.current = now;
          lastProgressBytes.current = offset;
        }

        setTransfer((prev) => {
          if (prev && prev.peerId === peerId) {
            const progress = Math.min(100, Math.round((offset / totalSize) * 100));
            return {
              ...prev,
              progress,
              speed: speed || prev.speed,
              eta: eta || prev.eta,
            };
          }
          return prev;
        });
      }

      ch.send(JSON.stringify({ type: "EOF", batchId: batch.batchId, fileIndex }));
    } catch (err) {
      console.error("[WebRTC] File encryption or chunking failed:", err);
      toast.error("Failed to encrypt and send file.");
      setTransfer((prev) => prev ? { ...prev, status: "cancelled", error: "Encryption error." } : null);
      cleanPeerConnection(peerId);
      isTransferInProgress.current = false;
      activeSendingBatch.current = null;
      activeFileKey.current = null;
    }
  }, [cleanPeerConnection]);

  const reconstructBatchFile = useCallback(async (peerId: string, fileIndex: number, batchId: string) => {
    const state = transferRef.current;
    if (!state) return;

    const currentFile = state.files[fileIndex];
    if (!currentFile) return;

    try {
      const totalLen = receivedChunks.current.reduce((acc, c) => acc + c.byteLength, 0);
      const concatenated = new Uint8Array(totalLen);
      let offset = 0;
      for (const chunk of receivedChunks.current) {
        concatenated.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
      }

      const decryptionKey = activeFileKey.current;
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

      receivedChunks.current = [];
      receivedBytes.current = 0;

      const ch = dataChannels.current.get(peerId);
      if (ch) {
        ch.send(JSON.stringify({ type: "FILE_RECEIVED", batchId, fileIndex }));
      }
    } catch (err) {
      console.error("[WebRTC] File decryption failed:", err);
      toast.error(`Failed to decrypt received file: ${currentFile.name}`);
      setTransfer((prev) => prev ? { ...prev, status: "cancelled", error: "Decryption error." } : null);
      cleanPeerConnection(peerId);
      isTransferInProgress.current = false;
      activeFileKey.current = null;
    }
  }, [cleanPeerConnection]);

  const setupDataChannel = useCallback((ch: RTCDataChannel, peerId: string) => {
    ch.binaryType = "arraybuffer";

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

        ownEphemeralKeys.current.set(peerId, {
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
      console.warn(`[WebRTC] Data channel closed with peer: ${peerId}`);
    };

    ch.onerror = (err) => {
      console.error(`[WebRTC] Data channel error with peer ${peerId}:`, err);
    };

    ch.onmessage = async (event) => {
      const data = event.data;

      if (typeof data === "string") {
        try {
          const message = JSON.parse(data);

          if (message.type === "PQ_HANDSHAKE") {
            peerEphemeralPublicKeys.current.set(peerId, {
              ecdhPublicKey: message.ecdhPublicKey,
              mlKemPublicKey: message.mlKemPublicKey,
            });

            const active = transferRef.current;
            if (
              active &&
              active.peerId === peerId &&
              active.direction === "send" &&
              active.status === "connecting"
            ) {
              sendAskBatchTransferDirect(ch, peerId);
            }
            return;
          }

          if (message.type === "ASK_BATCH_TRANSFER") {
            const ownKeys = ownEphemeralKeys.current.get(peerId);
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
            activeFileKey.current = decryptionKey;

            const decryptedFiles = await Promise.all(
              message.files.map(async (f: any) => {
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

            setIncomingRequest({
              peerId,
              peerName: message.senderName || "Local Device",
              batchId: message.batchId,
              sessionKey: decryptionKey || "",
              files: decryptedFiles,
            });
          }

          else if (message.type === "ACCEPT_BATCH_TRANSFER") {
            setTransfer((prev) => {
              if (prev && prev.peerId === peerId) {
                return { ...prev, status: "transferring", progress: 0 };
              }
              return prev;
            });
            startBatchFileChunking(peerId, 0);
          }

          else if (message.type === "REJECT_BATCH_TRANSFER") {
            toast.error("Transfer rejected by receiver.");
            setTransfer((prev) => {
              if (prev && prev.peerId === peerId) {
                return { ...prev, status: "rejected" };
              }
              return prev;
            });
            cleanPeerConnection(peerId);
            isTransferInProgress.current = false;
            activeSendingBatch.current = null;
            activeFileKey.current = null;
          }

          else if (message.type === "START_FILE") {
            setTransfer((prev) => {
              if (prev && prev.peerId === peerId) {
                return { ...prev, currentFileIndex: message.fileIndex, progress: 0 };
              }
              return prev;
            });
            receivedChunks.current = [];
            receivedBytes.current = 0;
            lastProgressTime.current = performance.now();
            lastProgressBytes.current = 0;
          }

          else if (message.type === "EOF") {
            setTransfer((prev) => {
              if (prev && prev.peerId === peerId) {
                return { ...prev, status: "decrypting", progress: 100 };
              }
              return prev;
            });
            await reconstructBatchFile(peerId, message.fileIndex, message.batchId);
          }

          else if (message.type === "FILE_RECEIVED") {
            const batch = activeSendingBatch.current;
            if (batch && message.fileIndex + 1 < batch.files.length) {
              setTransfer((prev) => {
                if (prev && prev.peerId === peerId) {
                  return { ...prev, currentFileIndex: message.fileIndex + 1, progress: 0, status: "transferring" };
                }
                return prev;
              });
              startBatchFileChunking(peerId, message.fileIndex + 1);
            } else if (batch) {
              ch.send(JSON.stringify({ type: "BATCH_COMPLETE", batchId: batch.batchId }));
              setTransfer((prev) => prev ? { ...prev, status: "completed", progress: 100 } : null);
              toast.success("All files sent successfully!");
              isTransferInProgress.current = false;
              activeSendingBatch.current = null;
              activeFileKey.current = null;
            }
          }

          else if (message.type === "BATCH_COMPLETE") {
            setTransfer((prev) => prev ? { ...prev, status: "completed", progress: 100 } : null);
            isTransferInProgress.current = false;
            activeFileKey.current = null;
          }

          else if (message.type === "CANCEL_TRANSFER") {
            toast.error("Transfer cancelled by peer.");
            setTransfer((prev) => {
              if (prev && prev.peerId === peerId) {
                return { ...prev, status: "cancelled", error: "Cancelled by peer." };
              }
              return prev;
            });
            cleanPeerConnection(peerId);
            isTransferInProgress.current = false;
            activeSendingBatch.current = null;
            activeFileKey.current = null;
          }
        } catch (e) {
          console.error("[WebRTC] Error handling string payload:", e);
        }
      } 
      else if (data instanceof ArrayBuffer) {
        receivedChunks.current.push(data);
        receivedBytes.current += data.byteLength;

        const now = performance.now();
        const elapsed = (now - lastProgressTime.current) / 1000;
        
        let speed = 0;
        let eta = 0;

        if (elapsed >= 0.5) {
          const sentSinceLast = receivedBytes.current - lastProgressBytes.current;
          speed = Math.round(sentSinceLast / elapsed);
          const currentFile = transferRef.current?.files[transferRef.current?.currentFileIndex];
          const remaining = (currentFile?.size || 0) - receivedBytes.current;
          eta = speed > 0 ? Math.round(remaining / speed) : 0;

          lastProgressTime.current = now;
          lastProgressBytes.current = receivedBytes.current;
        }

        setTransfer((prev) => {
          if (prev && prev.peerId === peerId) {
            const currentFile = prev.files[prev.currentFileIndex];
            const progress = currentFile ? Math.min(100, Math.round((receivedBytes.current / currentFile.size) * 100)) : 0;
            return {
              ...prev,
              progress,
              speed: speed || prev.speed,
              eta: eta || prev.eta,
            };
          }
          return prev;
        });
      }
    };
  }, [sendAskBatchTransferDirect, startBatchFileChunking, reconstructBatchFile, cleanPeerConnection]);

  const getOrCreatePeerConnection = useCallback((peerId: string, isInitiator: boolean, currentSocket: Socket): RTCPeerConnection => {
    let pc = peerConnections.current.get(peerId);
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
          signal: { candidate: event.candidate },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc?.connectionState === "disconnected" || pc?.connectionState === "failed" || pc?.connectionState === "closed") {
        cleanPeerConnection(peerId);
        setTransfer((prev) => {
          if (prev && prev.peerId === peerId && prev.status !== "completed") {
            return { ...prev, status: "cancelled", error: "Connection lost." };
          }
          return prev;
        });
      }
    };

    if (isInitiator) {
      const ch = pc.createDataChannel("file-transfer", { ordered: true });
      setupDataChannel(ch, peerId);
      dataChannels.current.set(peerId, ch);
    } else {
      pc.ondatachannel = (event) => {
        setupDataChannel(event.channel, peerId);
        dataChannels.current.set(peerId, event.channel);
      };
    }

    peerConnections.current.set(peerId, pc);
    return pc;
  }, [cleanPeerConnection, setupDataChannel]);

  const queueFileForSend = useCallback((peerId: string, peerName: string, filesList: File[]) => {
    if (isTransferInProgress.current) {
      toast.error("A file transfer is already running. Please wait.");
      return;
    }

    isTransferInProgress.current = true;
    const initiateSend = async () => {
      try {
        const batchId = Math.random().toString(36).substring(2, 10);
        activeSendingBatch.current = {
          batchId,
          files: filesList.map((f) => ({
            name: f.name,
            size: f.size,
            type: f.type,
            fileObj: f,
          })),
        };

        setTransfer({
          peerId,
          peerName,
          direction: "send",
          status: "connecting",
          files: filesList.map(f => ({ name: f.name, size: f.size })),
          currentFileIndex: 0,
          progress: 0,
          speed: 0,
          eta: 0,
        });

        if (!socket) {
          isTransferInProgress.current = false;
          activeSendingBatch.current = null;
          return;
        }
        
        const pc = getOrCreatePeerConnection(peerId, true, socket);
        const ch = dataChannels.current.get(peerId);

        if (ch && ch.readyState === "open") {
          await sendAskBatchTransferDirect(ch, peerId);
        } else {
          if (pc.signalingState === "stable") {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("signal", {
              target: peerId,
              signal: { sdp: pc.localDescription },
            });
          }
        }
      } catch (err) {
        console.error("[WebRTC] Failed to initiate send request:", err);
        toast.error("Failed to connect to peer.");
        setTransfer(null);
        isTransferInProgress.current = false;
        activeSendingBatch.current = null;
      }
    };
    initiateSend();
  }, [socket, getOrCreatePeerConnection, sendAskBatchTransferDirect]);

  // Accept incoming transfer
  const acceptIncomingTransfer = async () => {
    if (!incomingRequest || !socket) return;

    isTransferInProgress.current = true;
    const req = incomingRequest;
    setIncomingRequest(null);

    receivedChunks.current = [];
    receivedBytes.current = 0;

    setTransfer({
      peerId: req.peerId,
      peerName: req.peerName,
      direction: "receive",
      status: "transferring",
      files: req.files,
      currentFileIndex: 0,
      progress: 0,
      speed: 0,
      eta: 0,
    });

    const ch = dataChannels.current.get(req.peerId);
    if (ch) {
      ch.send(JSON.stringify({ type: "ACCEPT_BATCH_TRANSFER", batchId: req.batchId }));
    }
  };

  // Decline incoming transfer
  const declineIncomingTransfer = () => {
    if (!incomingRequest) return;
    const req = incomingRequest;
    setIncomingRequest(null);

    const ch = dataChannels.current.get(req.peerId);
    if (ch) {
      ch.send(JSON.stringify({ type: "REJECT_BATCH_TRANSFER", batchId: req.batchId }));
    }
    cleanPeerConnection(req.peerId);
    isTransferInProgress.current = false;
  };

  // Cancel active transfer
  const cancelActiveTransfer = () => {
    const current = transferRef.current;
    if (!current) return;

    const ch = dataChannels.current.get(current.peerId);
    if (ch) {
      try {
        ch.send(JSON.stringify({ type: "CANCEL_TRANSFER" }));
      } catch (e) {}
    }

    cleanPeerConnection(current.peerId);
    setTransfer((prev) => prev ? { ...prev, status: "cancelled", error: "Cancelled by you." } : null);
    isTransferInProgress.current = false;
    activeSendingBatch.current = null;
    activeFileKey.current = null;
    receivedChunks.current = [];
    receivedBytes.current = 0;
  };

  // Stable refs to prevent cascading socket reconnections during active transfers
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
      
      const active = transferRef.current;
      const isTransferringWithThisPeer = active && active.peerId === data.socketId && 
        ["transferring", "encrypting", "decrypting", "connecting"].includes(active.status);

      if (!isTransferringWithThisPeer) {
        setTransfer((prev) => {
          if (prev && prev.peerId === data.socketId && prev.status !== "completed") {
            return { ...prev, status: "cancelled", error: "Peer went offline." };
          }
          return prev;
        });
        cleanPeerConnectionRef.current(data.socketId);
        isTransferInProgress.current = false;
      }
    });

    newSocket.on("signal", async (data: { sender: string; signal: any }) => {
      const { sender, signal } = data;
      const pc = getOrCreatePeerConnectionRef.current(sender, false, newSocket);

      if (signal.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

        const queued = pendingCandidates.current.get(sender);
        if (queued) {
          for (const cand of queued) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (e) {}
          }
          pendingCandidates.current.delete(sender);
        }

        if (signal.sdp.type === "offer") {
          if (signal.sdp.sessionKey) {
            activeFileKey.current = signal.sdp.sessionKey;
          }
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          newSocket.emit("signal", {
            target: sender,
            signal: { sdp: pc.localDescription },
          });
        }
      } else if (signal.candidate) {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch (e) {}
        } else {
          if (!pendingCandidates.current.has(sender)) {
            pendingCandidates.current.set(sender, []);
          }
          pendingCandidates.current.get(sender)!.push(signal.candidate);
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
    transfer,
    incomingRequest,
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
    setTransfer,
  };
}
