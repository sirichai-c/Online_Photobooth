"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createRoomCode } from "@/lib/roomCode";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/components/LanguageProvider";
import { translations } from "@/lib/i18n";

export function LandingPage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const { language } = useLanguage();
  const copy = translations[language];
  const landing = copy.landing;

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
        <div className="header-controls">
          <span className="header-note">{copy.common.tagline}</span>
          <LanguageSwitcher tone="light" />
        </div>
      </header>

      <div className="landing-grid">
        <section className="landing-content">
          <p className="landing-kicker"><span className="kicker-dot" /> {landing.kicker}</p>
          <h1>{landing.titleStart} <em>{landing.titleEmphasis}</em></h1>
          <p className="landing-description">{landing.description}</p>

          <div className="landing-actions">
            <button type="button" onClick={createRoom} className="button button-coral button-large">
              {landing.createRoom}
              <span className="button-symbol" aria-hidden="true">↗</span>
            </button>
            <p className="action-hint">{landing.createHint}</p>

            <div className="action-divider"><span>{landing.alreadyCode}</span></div>

            <form onSubmit={joinRoom} className="join-form">
              <label htmlFor="room-code">{landing.joinRoom}</label>
              <div className="join-fields">
                <input
                  id="room-code"
                  value={roomCode}
                  onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                  placeholder={landing.enterCode}
                  maxLength={6}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button type="submit" className="button button-light">{landing.join}</button>
              </div>
              <p className="join-hint">{landing.codeHint}</p>
            </form>
          </div>
        </section>

        <div className="landing-art" aria-hidden="true">
          <div className="art-orbit art-orbit-one" />
          <div className="art-orbit art-orbit-two" />
          <div className="art-note art-note-top">{landing.artTop}</div>
          <div className="demo-strip">
            <div className="demo-strip-header">LDR photo booth <span>♥</span></div>
            {[0, 1, 2, 3].map((frame) => (
              <div className={`demo-frame demo-frame-${frame + 1}`} key={frame}>
                <div className="demo-half demo-half-left"><span className="demo-person demo-person-left" /></div>
                <div className="demo-half demo-half-right"><span className="demo-person demo-person-right" /></div>
              </div>
            ))}
            <div className="demo-strip-footer">{landing.artFooter}</div>
          </div>
          <div className="art-note art-note-bottom">{landing.artBottom}</div>
          <span className="art-spark art-spark-one">✳</span>
          <span className="art-spark art-spark-two">✳</span>
        </div>
      </div>

      <footer className="landing-footer">
        <span>{landing.footerNoSignup}</span>
        <span>{landing.footerTakeMoment}</span>
      </footer>
    </div>
  );
}
