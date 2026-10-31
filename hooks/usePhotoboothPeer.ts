"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Peer from "peerjs";
import type { DataConnection, MediaConnection } from "peerjs";

export type PeerMessage =
  | { type: "capture:start"; at: number; reset?: boolean }
  | { type: "capture:retake"; at: number }
  | { type: "capture:shot"; at: number; image: string }
  | { type: "capture:accept"; next: "capture" | "frame"; at?: number }
  | { type: "frame:selected"; styleId: string }
  | { type: "frame:result"; styleId: string; image: string };

type ConnectionStatus =
  | "idle"
  | "starting"
  | "waiting"
  | "calling"
  | "connected"
  | "disconnected"
  | "error";

type UsePhotoboothPeerOptions = {
  roomCode: string;
  localStream: MediaStream | null;
  onMessage: (message: PeerMessage) => void;
};

type UsePhotoboothPeerResult = {
  status: ConnectionStatus;
  error: string | null;
  isHost: boolean;
  remoteStream: MediaStream | null;
  sendMessage: (message: PeerMessage) => void;
};

const peerOptions = {
  host: "0.peerjs.com",
  port: 443,
  path: "/",
  secure: true,
};

export function usePhotoboothPeer({
  roomCode,
  localStream,
  onMessage,
}: UsePhotoboothPeerOptions): UsePhotoboothPeerResult {
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const dataRef = useRef<DataConnection | null>(null);
  const callRef = useRef<MediaConnection | null>(null);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const bindDataConnection = useCallback((connection: DataConnection) => {
    dataRef.current = connection;

    connection.on("open", () => setStatus("connected"));
    connection.on("data", (data) => {
      if (typeof data === "object" && data !== null && "type" in data) {
        onMessageRef.current(data as PeerMessage);
      }
    });
    connection.on("close", () => setStatus("disconnected"));
    connection.on("error", (connectionError) => {
      setError(connectionError.message);
      setStatus("error");
    });
  }, []);

  useEffect(() => {
    if (!localStream || !roomCode) {
      return;
    }

    const stream = localStream;
    let cancelled = false;
    let localPeer: Peer | null = null;

    async function startPeer() {
      setStatus("starting");
      setError(null);

      const { default: PeerConstructor } = await import("peerjs");

      if (cancelled) {
        return;
      }

      localPeer = new PeerConstructor(roomCode, peerOptions);
      peerRef.current = localPeer;

      localPeer.on("open", () => {
        if (cancelled) {
          return;
        }
        setIsHost(true);
        setStatus("waiting");
      });

      localPeer.on("connection", bindDataConnection);

      localPeer.on("call", (call) => {
        callRef.current = call;
        call.answer(stream);
        call.on("stream", setRemoteStream);
        call.on("close", () => setStatus("disconnected"));
        call.on("error", (callError) => {
          setError(callError.message);
          setStatus("error");
        });
      });

      localPeer.on("error", (peerError) => {
        if (peerError.type === "unavailable-id") {
          const guestPeer = new PeerConstructor(peerOptions);
          localPeer?.destroy();
          localPeer = guestPeer;
          peerRef.current = guestPeer;
          setIsHost(false);
          setStatus("calling");

          guestPeer.on("open", () => {
            const dataConnection = guestPeer.connect(roomCode, { reliable: true });
            bindDataConnection(dataConnection);

            const mediaCall = guestPeer.call(roomCode, stream);
            callRef.current = mediaCall;
            mediaCall.on("stream", setRemoteStream);
            mediaCall.on("close", () => setStatus("disconnected"));
            mediaCall.on("error", (callError) => {
              setError(callError.message);
              setStatus("error");
            });
          });

          guestPeer.on("error", (guestError) => {
            setError(guestError.message);
            setStatus("error");
          });
          guestPeer.on("disconnected", () => setStatus("disconnected"));
          return;
        }

        setError(peerError.message);
        setStatus("error");
      });

      localPeer.on("disconnected", () => setStatus("disconnected"));
    }

    startPeer();

    return () => {
      cancelled = true;
      dataRef.current?.close();
      callRef.current?.close();
      localPeer?.destroy();
      peerRef.current = null;
      dataRef.current = null;
      callRef.current = null;
      setRemoteStream(null);
    };
  }, [bindDataConnection, localStream, roomCode]);

  const sendMessage = useCallback((message: PeerMessage) => {
    const connection = dataRef.current;
    if (connection?.open) {
      connection.send(message);
    }
  }, []);

  return useMemo(
    () => ({ status, error, isHost, remoteStream, sendMessage }),
    [status, error, isHost, remoteStream, sendMessage],
  );
}
