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

  const canCapture = isHost && status === "connected" && (captureState === "idle" || captureState === "complete");
  const acceptedCount = shots.length;
  const currentShotNumber = Math.min(acceptedCount + 1, shotCount);
  const isLastPendingShot = acceptedCount + 1 >= shotCount;

    return (
    <main className="room-page">
      <div className="room-shell">
        <header className="room-topbar">
          <Link href="/" className="brand brand-dark" aria-label="LDR Photobooth home">
            <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
            <span>LDR Photobooth</span>
          </Link>
          <span className="room-topbar-note">A little moment, together.</span>
        </header>

        <div className="room-heading-row">
          <div>
            <p className="room-kicker">Your shared space</p>
            <h1>Room {roomCode}</h1>
            <p className="room-description">Share the code, turn on your cameras, and make a memory from anywhere.</p>
          </div>
          <div className="room-meta">
            <div className="room-code-box">
              <span>Invite code</span>
              <strong>{roomCode}</strong>
            </div>
            <div className="connection-box">
              <span className={`connection-light connection-light-${status}`} aria-hidden="true" />
              <span className="connection-text">
                <strong>{status}</strong>
                <small>{isHost ? "Room host" : "Guest"}</small>
              </span>
            </div>
          </div>
        </div>

        {(cameraError || error) && (
          <div role="alert" className="room-alert">
            <strong>Camera or connection needs attention</strong>
            <span>{cameraError || error}</span>
          </div>
        )}

        <div className="room-main-grid">
          <section className="stage-panel" aria-label="Live camera preview">
            <div className="stage-heading">
              <div>
                <p className="stage-eyebrow"><span className="live-dot" /> Live room</p>
                <h2>{remoteStream ? "You’re both here." : "Waiting for your person."}</h2>
              </div>
              <span className="stage-side-note">Two places. One frame.</span>
            </div>
            <div className="video-grid">
              <VideoPanel label="You" videoRef={localVideoRef} muted />
              <VideoPanel label="Partner" videoRef={remoteVideoRef} waiting={!remoteStream} />
            </div>
            <p className="stage-footnote">
              {captureState === "complete" ? "Save your strip below or start another session." : remoteStream ? "You're ready to capture your first moment." : "Keep this page open while your partner joins with the room code."}
            </p>
          </section>

          <aside className="session-panel">
            <div className="session-heading">
              <span className="session-icon" aria-hidden="true">✳</span>
              <p>Photo session</p>
              <h2>Four moments, one strip.</h2>
            </div>
            <div className="session-progress">
              <div className="progress-heading"><span>Your photos</span><strong>{shots.length} / {shotCount}</strong></div>
              <ol aria-label="Photo progress">
                {Array.from({ length: shotCount }, (_, index) => (
                  <li className={index < shots.length ? "progress-done" : index === shots.length ? "progress-current" : ""} key={index}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                  </li>
                ))}
              </ol>
            </div>
            <p className="session-explainer">
              The countdown runs on both screens. Keep each photo or take it again before moving on.
            </p>
            <button type="button" onClick={startCapture} disabled={!canCapture} className="button button-coral session-start">
              {captureState === "complete" ? "Take Another Strip" : "Start Capture"} <span aria-hidden="true">✳</span>
            </button>
            {!isHost && status === "connected" && (
              <p className="session-hint">Your host will start the photo session.</p>
            )}
            {status !== "connected" && (
              <p className="session-hint">The button unlocks when both cameras are connected.</p>
            )}
          </aside>
        </div>

        {captureState === "review" && pendingShot && (
          <section className="flow-panel review-panel">
            <div className="flow-copy">
              <p className="flow-step">Photo {currentShotNumber} of {shotCount}</p>
              <h2>Keep this one?</h2>
              <p>{isHost
                ? "Take a look together. You can keep this photo or try once more."
                : "Your host will choose whether to keep this photo or take it again."}</p>
              <div className="review-actions">
                <button type="button" onClick={retakeShot} disabled={!isHost} className="button button-outline">
                  ถ่ายใหม่อีกครั้ง
                </button>
                {isLastPendingShot ? (
                  <button type="button" onClick={finishCapture} disabled={!isHost} className="button button-dark">
                    เสร็จสิ้น
                  </button>
                ) : (
                  <button type="button" onClick={continueToNextShot} disabled={!isHost} className="button button-dark">
                    ถ่ายต่อ
                  </button>
                )}
              </div>
            </div>
            <div className="review-image-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pendingShot} alt={`Preview shot ${currentShotNumber}`} />
            </div>
          </section>
        )}

        {captureState === "framing" && (
          <section className="flow-panel frame-panel">
            <div className="flow-copy">
              <p className="flow-step">The finishing touch</p>
              <h2>Choose frame style</h2>
              <p>{isHost
                ? "Pick the look that feels like your moment. Your partner will see it too."
                : "Your host is choosing the finishing touch."}</p>
            </div>
            <div className="frame-grid">
              {frameStyles.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => selectFrame(style.id)}
                  disabled={!isHost}
                  aria-pressed={selectedFrameId === style.id}
                  className="frame-option"
                >
                  <span className="frame-swatch" style={{ background: style.background }}>
                    <span style={{ background: style.mat }} />
                    <span style={{ background: style.mat }} />
                    <span style={{ background: style.accent }} />
                  </span>
                  <span className="frame-name">{style.name}</span>
                  <span className="frame-indicator">{selectedFrameId === style.id ? "Selected" : "Choose frame"}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {(shots.length > 0 || downloadUrl) && (
          <section className="flow-panel result-panel">
            <div className="flow-copy">
              <p className="flow-step">Your keepsake</p>
              <h2>{captureState === "complete" ? "Made together. Kept forever." : "Your moments so far."}</h2>
              <p>{captureState === "complete" ? "Your four-cut strip is ready to save." : `Captured ${shots.length} of ${shotCount} photos.`}</p>
              {downloadUrl && (
                <a href={downloadUrl} download={`ldr-photobooth-${roomCode}.png`} className="button button-dark download-button">
                  Download Photo <span aria-hidden="true">↓</span>
                </a>
              )}
            </div>
            <div className="result-preview">
              {downloadUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={downloadUrl} alt="Four-cut photobooth result" className="result-strip" />
              ) : (
                <div className="result-shots">
                  {shots.map((shot, index) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={index} src={shot} alt={`Captured shot ${index + 1}`} />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {countdown !== null && (
          <div className="countdown-overlay" role="status" aria-live="assertive">
            <div className="countdown-content">
              <p>Here we go</p>
              <span>{countdown || "Go"}</span>
              <small>Hold that moment</small>
            </div>
          </div>
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
    <div className="video-panel">
      <div className="video-frame">
        <video ref={videoRef} autoPlay playsInline muted={muted} />
        {waiting && (
          <div className="video-waiting">
            <span className="waiting-spark" aria-hidden="true">✳</span>
            <strong>Waiting for partner</strong>
            <span>Share the room code to bring them in.</span>
          </div>
        )}
        <div className="video-label"><span className="video-label-dot" /> {label}</div>
      </div>
    </div>
  );
}
