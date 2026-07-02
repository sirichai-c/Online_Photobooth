"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import Link from "next/link";
import { usePhotoboothPeer } from "@/hooks/usePhotoboothPeer";
import type { PeerMessage } from "@/hooks/usePhotoboothPeer";

type PhotoboothRoomProps = {
  roomCode: string;
};

type CaptureState = "idle" | "countdown" | "shooting" | "review" | "framing" | "complete";
type NextStep = "capture" | "frame";
type FrameStyle = {
  id: string;
  name: string;
  background: string;
  mat: string;
  accent: string;
  text: string;
};

const countdownSeconds = 3;
const shotCount = 4;
const shotDelayMs = 950;
const stripWidth = 900;
const pairHeight = 560;
const stripPadding = 48;
const stripGap = 28;
const titleFont = { fontFamily: '"Bodoni MT", "Bodoni 72", Didot, Georgia, "Times New Roman", serif' };
const frameStyles: FrameStyle[] = [
  { id: "classic", name: "Classic Rose", background: "#fff6f3", mat: "#ffffff", accent: "#7b1e2b", text: "#705066" },
  { id: "midnight", name: "Midnight", background: "#241820", mat: "#fffaf7", accent: "#d9adbd", text: "#fff8f4" },
  { id: "film", name: "Film Strip", background: "#f5f0e8", mat: "#161616", accent: "#a23d4f", text: "#3d332d" },
  { id: "soft", name: "Soft Bloom", background: "#f8eef3", mat: "#ffffff", accent: "#8f6aa8", text: "#5d466c" },
];

export function PhotoboothRoom({ roomCode }: PhotoboothRoomProps) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [captureState, setCaptureState] = useState<CaptureState>("idle");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [shots, setShots] = useState<string[]>([]);
  const [pendingShot, setPendingShot] = useState<string | null>(null);
  const [selectedFrameId, setSelectedFrameId] = useState(frameStyles[0].id);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    navigator.mediaDevices
      .getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: true,
      })
      .then((stream) => {
        if (active) {
          setLocalStream(stream);
        } else {
          stream.getTracks().forEach((track) => track.stop());
        }
      })
      .catch((error: Error) => {
        setCameraError(error.message);
      });

    return () => {
      active = false;
      setLocalStream((stream) => {
        stream?.getTracks().forEach((track) => track.stop());
        return null;
      });
    };
  }, []);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const drawVideoCover = (
    context: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    x: number,
    y: number,
    width: number,
    height: number,
  ) => {
    const sourceWidth = video.videoWidth || width;
    const sourceHeight = video.videoHeight || height;
    const sourceRatio = sourceWidth / sourceHeight;
    const targetRatio = width / height;
    let cropWidth = sourceWidth;
    let cropHeight = sourceHeight;
    let sourceX = 0;
    let sourceY = 0;

    if (sourceRatio > targetRatio) {
      cropWidth = sourceHeight * targetRatio;
      sourceX = (sourceWidth - cropWidth) / 2;
    } else {
      cropHeight = sourceWidth / targetRatio;
      sourceY = (sourceHeight - cropHeight) / 2;
    }

    context.drawImage(video, sourceX, sourceY, cropWidth, cropHeight, x, y, width, height);
  };

  const buildStrip = useCallback(async (capturedShots: string[], frameStyle: FrameStyle) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    const stripHeight = stripPadding * 2 + pairHeight * shotCount + stripGap * (shotCount - 1) + 92;
    canvas.width = stripWidth;
    canvas.height = stripHeight;

    context.fillStyle = frameStyle.background;
    context.fillRect(0, 0, stripWidth, stripHeight);
    context.fillStyle = frameStyle.accent;
    context.fillRect(0, 0, stripWidth, 84);
    context.fillStyle = frameStyle.text;
    context.font = "600 34px Georgia";
    context.textAlign = "center";
    context.fillText("LDR PHOTOBOOTH", stripWidth / 2, 50);

    const images = await Promise.all(
      capturedShots.map(
        (shot) =>
          new Promise<HTMLImageElement>((resolve) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.src = shot;
          }),
      ),
    );

    images.forEach((image, index) => {
      const y = stripPadding + 34 + index * (pairHeight + stripGap);
      context.fillStyle = frameStyle.mat;
      context.fillRect(stripPadding - 14, y - 14, stripWidth - stripPadding * 2 + 28, pairHeight + 28);
      context.drawImage(image, stripPadding, y, stripWidth - stripPadding * 2, pairHeight);
    });

    context.fillStyle = frameStyle.text;
    context.font = "500 22px Arial";
    context.fillText(frameStyle.name, stripWidth / 2, stripHeight - 64);
    context.fillText(new Date().toLocaleDateString(), stripWidth / 2, stripHeight - 32);
    setDownloadUrl(canvas.toDataURL("image/png"));
  }, []);

  const captureOneShot = useCallback(() => {
    const localVideo = localVideoRef.current;
    const remoteVideo = remoteVideoRef.current;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!localVideo || !remoteVideo || !context) {
      return null;
    }

    canvas.width = stripWidth - stripPadding * 2;
    canvas.height = pairHeight;

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    drawVideoCover(context, localVideo, 0, 0, canvas.width / 2, canvas.height);
    drawVideoCover(context, remoteVideo, canvas.width / 2, 0, canvas.width / 2, canvas.height);

    context.strokeStyle = "#fff6f3";
    context.lineWidth = 12;
    context.beginPath();
    context.moveTo(canvas.width / 2, 0);
    context.lineTo(canvas.width / 2, canvas.height);
    context.stroke();

    return canvas.toDataURL("image/png");
  }, []);

  const takeCurrentShot = useCallback(async () => {
    setCaptureState("shooting");
    setPendingShot(null);

    await new Promise((resolve) => window.setTimeout(resolve, shotDelayMs));
    const shot = captureOneShot();
    if (shot) {
      setPendingShot(shot);
    }
    setCaptureState("review");
  }, [captureOneShot]);

  const startCountdown = useCallback(
    (startAt: number, reset = false) => {
      if (reset) {
        setShots([]);
        setDownloadUrl(null);
        setSelectedFrameId(frameStyles[0].id);
      }

      setCaptureState("countdown");
      setDownloadUrl(null);
      setPendingShot(null);

      const tick = () => {
        const remaining = Math.ceil((startAt - Date.now()) / 1000);
        setCountdown(Math.max(remaining, 0));

        if (remaining <= 0) {
          setCountdown(null);
          takeCurrentShot();
          return;
        }

        window.setTimeout(tick, 100);
      };

      tick();
    },
    [takeCurrentShot],
  );

  const acceptPendingShot = useCallback(
    (next: NextStep, at?: number) => {
      if (!pendingShot) {
        return;
      }

      const acceptedShots = [...shots, pendingShot];
      setShots(acceptedShots);
      setPendingShot(null);

      if (next === "capture" && at) {
        startCountdown(at);
        return;
      }

      setCaptureState("framing");
    },
    [pendingShot, shots, startCountdown],
  );

  const applyFrameStyle = useCallback(
    (styleId: string) => {
      const frameStyle = frameStyles.find((style) => style.id === styleId) ?? frameStyles[0];
      setSelectedFrameId(frameStyle.id);
      setCaptureState("complete");
      buildStrip(shots, frameStyle);
    },
    [buildStrip, shots],
  );

  const handlePeerMessage = useCallback(
    (message: PeerMessage) => {
      if (message.type === "capture:start") {
        startCountdown(message.at, message.reset);
      }
      if (message.type === "capture:retake") {
        startCountdown(message.at);
      }
      if (message.type === "capture:accept") {
        acceptPendingShot(message.next, message.at);
      }
      if (message.type === "frame:selected") {
        applyFrameStyle(message.styleId);
      }
    },
    [acceptPendingShot, applyFrameStyle, startCountdown],
  );

  const { status, error, isHost, remoteStream, sendMessage } = usePhotoboothPeer({
    roomCode,
    localStream,
    onMessage: handlePeerMessage,
  });

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const startCapture = () => {
    const at = Date.now() + countdownSeconds * 1000 + 600;
    sendMessage({ type: "capture:start", at, reset: true });
    startCountdown(at, true);
  };

  const retakeShot = () => {
    const at = Date.now() + countdownSeconds * 1000 + 600;
    sendMessage({ type: "capture:retake", at });
    startCountdown(at);
  };

  const continueToNextShot = () => {
    const at = Date.now() + countdownSeconds * 1000 + 600;
    sendMessage({ type: "capture:accept", next: "capture", at });
    acceptPendingShot("capture", at);
  };

  const finishCapture = () => {
    sendMessage({ type: "capture:accept", next: "frame" });
    acceptPendingShot("frame");
  };

  const selectFrame = (styleId: string) => {
    sendMessage({ type: "frame:selected", styleId });
    applyFrameStyle(styleId);
  };

  const canCapture = status === "connected" && (captureState === "idle" || captureState === "complete");
  const acceptedCount = shots.length;
  const currentShotNumber = Math.min(acceptedCount + 1, shotCount);
  const isLastPendingShot = acceptedCount + 1 >= shotCount;

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#f8eceb] px-5 py-8 text-[#29151d] md:px-10 md:py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_15%_10%,rgba(174,66,83,0.30),transparent_32rem),radial-gradient(circle_at_90%_12%,rgba(112,75,109,0.24),transparent_30rem),linear-gradient(135deg,#fff7f3_0%,#f6dadd_48%,#e8dce8_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-[-10%] z-0 scale-110 bg-[url('/images.jpg')] bg-cover bg-center opacity-[0.16] blur-3xl saturate-[0.85]"
      />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 bg-[#fff8f4]/62" />

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-5 rounded-[32px] border border-[#9a3445]/25 bg-[#fffaf7]/80 p-7 shadow-[0_24px_80px_rgba(89,31,45,0.13)] backdrop-blur-xl md:flex-row md:items-center md:justify-between md:p-9">
          <div>
            <Link href="/" className="text-sm font-semibold text-[#7b1e2b] transition hover:text-[#351721]">
              LDR Photobooth
            </Link>
            <h1 className="mt-3 text-4xl font-medium leading-tight text-[#351721] md:text-5xl" style={titleFont}>
              Room {roomCode}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#684a57]">
              Share this code with your partner. One person creates the room, the other joins with the same code.
            </p>
          </div>
          <div className="rounded-2xl border border-[#c58a99]/40 bg-white/78 px-5 py-4 text-sm shadow-[0_12px_35px_rgba(89,31,45,0.08)]">
            <span className="font-medium text-[#705066]">Status</span>
            <span className="ml-2 inline-flex items-center gap-2 font-semibold capitalize text-[#351721]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#7b1e2b]" />
              {status}
            </span>
            <span className="ml-3 text-[#8f6d7b]">{isHost ? "Host" : "Guest"}</span>
          </div>
        </header>

        {(cameraError || error) && (
          <div className="rounded-2xl border border-[#b64a5c]/35 bg-[#fff1f1]/88 px-5 py-4 text-sm font-medium text-[#7b1e2b]">
            {cameraError || error}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-2">
          <VideoPanel label="You" videoRef={localVideoRef} muted />
          <VideoPanel label="Partner" videoRef={remoteVideoRef} waiting={!remoteStream} />
        </section>

        <section className="grid gap-6 rounded-[32px] border border-[#9a3445]/25 bg-[#fffaf7]/80 p-7 shadow-[0_24px_80px_rgba(89,31,45,0.12)] backdrop-blur-xl md:grid-cols-[1fr_auto] md:items-center md:p-8">
          <div>
            <h2 className="text-2xl font-medium text-[#351721]" style={titleFont}>
              Four-cut session
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#684a57]">
              The countdown starts on both screens. Review each shot, then continue, retake, or finish after the fourth shot.
            </p>
          </div>
          <button
            type="button"
            onClick={startCapture}
            disabled={!canCapture}
            className="rounded-2xl bg-[#7b1e2b] px-8 py-4 font-semibold text-[#fff8f4] shadow-[0_16px_34px_rgba(123,30,43,0.24)] transition hover:bg-[#641725] focus:outline-none focus:ring-4 focus:ring-[#d8a3ad] disabled:cursor-not-allowed disabled:bg-[#c8a8b2] disabled:text-[#fff8f4]/80"
          >
            Start Capture
          </button>
        </section>

        {captureState === "review" && pendingShot && (
          <section className="grid gap-6 rounded-[32px] border border-[#9a3445]/25 bg-[#fffaf7]/82 p-7 shadow-[0_24px_80px_rgba(89,31,45,0.12)] backdrop-blur-xl lg:grid-cols-[320px_1fr] lg:p-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7b1e2b]">
                Shot {currentShotNumber} of {shotCount}
              </p>
              <h2 className="mt-3 text-2xl font-medium text-[#351721]" style={titleFont}>
                Review this shot
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#684a57]">
                {isHost
                  ? "Choose whether to keep this shot or retake it before moving forward."
                  : "Waiting for the room owner to continue, retake, or finish the session."}
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <button
                  type="button"
                  onClick={retakeShot}
                  disabled={!isHost}
                  className="rounded-2xl border border-[#9a3445]/35 bg-white px-6 py-3 font-semibold text-[#7b1e2b] transition hover:bg-[#fff1f1] focus:outline-none focus:ring-4 focus:ring-[#d8a3ad] disabled:cursor-not-allowed disabled:text-[#b99aa4]"
                >
                  ถ่ายใหม่อีกครั้ง
                </button>
                {isLastPendingShot ? (
                  <button
                    type="button"
                    onClick={finishCapture}
                    disabled={!isHost}
                    className="rounded-2xl bg-[#7b1e2b] px-6 py-3 font-semibold text-[#fff8f4] transition hover:bg-[#641725] focus:outline-none focus:ring-4 focus:ring-[#d8a3ad] disabled:cursor-not-allowed disabled:bg-[#c8a8b2]"
                  >
                    เสร็จสิ้น
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={continueToNextShot}
                    disabled={!isHost}
                    className="rounded-2xl bg-[#7b1e2b] px-6 py-3 font-semibold text-[#fff8f4] transition hover:bg-[#641725] focus:outline-none focus:ring-4 focus:ring-[#d8a3ad] disabled:cursor-not-allowed disabled:bg-[#c8a8b2]"
                  >
                    ถ่ายต่อ
                  </button>
                )}
              </div>
            </div>
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pendingShot}
                alt={`Preview shot ${currentShotNumber}`}
                className="max-h-[560px] rounded-[28px] border border-[#9a3445]/30 bg-white object-contain shadow-[0_24px_80px_rgba(89,31,45,0.14)]"
              />
            </div>
          </section>
        )}

        {captureState === "framing" && (
          <section className="grid gap-6 rounded-[32px] border border-[#9a3445]/25 bg-[#fffaf7]/82 p-7 shadow-[0_24px_80px_rgba(89,31,45,0.12)] backdrop-blur-xl lg:grid-cols-[300px_1fr] lg:p-8">
            <div>
              <h2 className="text-2xl font-medium text-[#351721]" style={titleFont}>
                Choose frame style
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#684a57]">
                {isHost
                  ? "Pick one frame style. The final download page will open for both people."
                  : "Waiting for the room owner to choose the final frame style."}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {frameStyles.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => selectFrame(style.id)}
                  disabled={!isHost}
                  className="min-h-36 rounded-[24px] border border-[#9a3445]/25 p-4 text-left shadow-[0_14px_34px_rgba(89,31,45,0.10)] transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-[#d8a3ad] disabled:cursor-not-allowed disabled:opacity-70"
                  style={{ background: style.background, color: style.text }}
                >
                  <span className="block rounded-2xl px-4 py-3 text-base font-semibold" style={{ background: style.mat, color: style.accent }}>
                    {style.name}
                  </span>
                  <span className="mt-4 block h-4 w-24 rounded-full" style={{ background: style.accent }} />
                  {selectedFrameId === style.id && (
                    <span className="mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: style.accent }}>
                      Selected
                    </span>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {countdown !== null && (
          <div className="fixed inset-0 z-20 grid place-items-center bg-[#351721]/72 backdrop-blur-md">
            <div className="grid h-40 w-40 place-items-center rounded-full border border-[#e7c6cc] bg-[#fff8f4] text-7xl font-bold text-[#7b1e2b] shadow-[0_24px_80px_rgba(89,31,45,0.28)]">
              {countdown || "Go"}
            </div>
          </div>
        )}

        {(shots.length > 0 || downloadUrl) && (
          <section className="grid gap-6 rounded-[32px] border border-[#9a3445]/25 bg-[#fffaf7]/82 p-7 shadow-[0_24px_80px_rgba(89,31,45,0.12)] backdrop-blur-xl lg:grid-cols-[300px_1fr] lg:p-8">
            <div>
              <h2 className="text-2xl font-medium text-[#351721]" style={titleFont}>
                Result
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#684a57]">
                {captureState === "complete" ? "Your strip is ready." : `Captured ${shots.length} of ${shotCount}.`}
              </p>
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  download={`ldr-photobooth-${roomCode}.png`}
                  className="mt-5 inline-flex rounded-2xl bg-[#705066] px-6 py-3 font-semibold text-[#fff8f4] transition hover:bg-[#5c4054] focus:outline-none focus:ring-4 focus:ring-[#d8bdcf]"
                >
                  Download Photo
                </a>
              )}
            </div>
            <div className="flex justify-center">
              {downloadUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={downloadUrl}
                  alt="Four-cut photobooth result"
                  className="max-h-[760px] rounded-[28px] border border-[#9a3445]/30 bg-white object-contain shadow-[0_24px_80px_rgba(89,31,45,0.14)]"
                />
              ) : (
                <div className="grid w-full max-w-lg gap-4">
                  {shots.map((shot, index) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={`${index}-${shot}`} src={shot} alt={`Captured shot ${index + 1}`} className="rounded-2xl border border-[#9a3445]/25" />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </main>
  );
}

type VideoPanelProps = {
  label: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  muted?: boolean;
  waiting?: boolean;
};

function VideoPanel({ label, videoRef, muted = false, waiting = false }: VideoPanelProps) {
  return (
    <div className="overflow-hidden rounded-[32px] border-[6px] border-[#7b1e2b]/75 bg-[#351721] shadow-[0_24px_80px_rgba(89,31,45,0.18)]">
      <div className="relative aspect-video">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className="h-full w-full scale-x-[-1] object-cover"
        />
        {waiting && (
          <div className="absolute inset-0 grid place-items-center bg-[#351721]/82 px-8 text-center text-[#fff8f4] backdrop-blur-sm">
            <div>
              <p className="text-lg font-semibold">Waiting for partner</p>
              <p className="mt-2 text-sm text-[#e8cfd6]">Keep this room open and share the room code.</p>
            </div>
          </div>
        )}
        <div className="absolute left-4 top-4 rounded-full border border-[#efd4d8] bg-[#fff8f4]/92 px-4 py-1.5 text-sm font-semibold text-[#7b1e2b] shadow-[0_10px_24px_rgba(89,31,45,0.14)]">
          {label}
        </div>
      </div>
    </div>
  );
}
