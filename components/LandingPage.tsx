"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createRoomCode } from "@/lib/roomCode";

export function LandingPage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");

  const createRoom = () => {
    router.push(`/room/${createRoomCode()}`);
  };

  const joinRoom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = roomCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

    if (code.length >= 4 && code.length <= 6) {
      router.push(`/room/${code}`);
    }
  };

  return (
    <div className="landing-shell">
      <header className="landing-header">
        <div className="brand brand-light" aria-label="LDR Photobooth">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
          <span>LDR Photobooth</span>
        </div>
        <span className="header-note">A little moment, together.</span>
      </header>

      <div className="landing-grid">
        <section className="landing-content">
          <p className="landing-kicker"><span className="kicker-dot" /> Made for two, anywhere</p>
          <h1>Make a little moment <em>together.</em></h1>
          <p className="landing-description">
            Turn two cameras into one photo booth. Meet in a room, count down together,
            and keep four little moments from wherever you are.
          </p>

          <div className="landing-actions">
            <button type="button" onClick={createRoom} className="button button-coral button-large">
              Create a Room
              <span className="button-symbol" aria-hidden="true">↗</span>
            </button>
            <p className="action-hint">Start a room and share its code with your person.</p>

            <div className="action-divider"><span>Already have a code?</span></div>

            <form onSubmit={joinRoom} className="join-form">
              <label htmlFor="room-code">Join Room</label>
              <div className="join-fields">
                <input
                  id="room-code"
                  value={roomCode}
                  onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                  placeholder="Enter room code"
                  maxLength={6}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button type="submit" className="button button-light">Join</button>
              </div>
              <p className="join-hint">Your code has 4–6 letters or numbers.</p>
            </form>
          </div>
        </section>

        <div className="landing-art" aria-hidden="true">
          <div className="art-orbit art-orbit-one" />
          <div className="art-orbit art-orbit-two" />
          <div className="art-note art-note-top">you + me</div>
          <div className="demo-strip">
            <div className="demo-strip-header">LDR photo booth <span>♥</span></div>
            {[0, 1, 2, 3].map((frame) => (
              <div className={`demo-frame demo-frame-${frame + 1}`} key={frame}>
                <div className="demo-half demo-half-left"><span className="demo-person demo-person-left" /></div>
                <div className="demo-half demo-half-right"><span className="demo-person demo-person-right" /></div>
              </div>
            ))}
            <div className="demo-strip-footer">The best days are the ones we make.</div>
          </div>
          <div className="art-note art-note-bottom">four frames, one memory</div>
          <span className="art-spark art-spark-one">✳</span>
          <span className="art-spark art-spark-two">✳</span>
        </div>
      </div>

      <footer className="landing-footer">
        <span>No sign-up. Just your cameras and a room code.</span>
        <span>Take the moment with you.</span>
      </footer>
    </div>
  );
}
