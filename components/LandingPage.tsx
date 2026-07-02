"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createRoomCode } from "@/lib/roomCode";

const titleFont = { fontFamily: '"Bodoni MT", "Bodoni 72", Didot, Georgia, "Times New Roman", serif' };

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
      <section className="w-full max-w-2xl rounded-[32px] border border-[#9a3445]/25 bg-[#fffaf7]/82 p-8 shadow-[0_24px_80px_rgba(89,31,45,0.14)] backdrop-blur-xl md:p-12">
        <div className="mb-10">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[#7b1e2b]">
            Free LDR Photobooth
          </p>
          <h1 className="text-4xl font-medium leading-tight text-[#351721] md:text-6xl" style={titleFont}>
            Take a four-cut strip together from anywhere.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-[#684a57]">
            Create a private peer-to-peer room, connect webcams, start the same countdown, and download one shared photo strip.
          </p>
        </div>

        <div className="grid gap-5">
          <button
            type="button"
            onClick={createRoom}
            className="rounded-2xl bg-[#7b1e2b] px-6 py-4 text-base font-semibold text-[#fff8f4] shadow-[0_14px_30px_rgba(123,30,43,0.22)] transition hover:bg-[#641725] focus:outline-none focus:ring-4 focus:ring-[#d8a3ad]"
          >
            Create a Room
          </button>

          <form onSubmit={joinRoom} className="rounded-2xl border border-[#c58a99]/40 bg-white/78 p-4">
            <label htmlFor="room-code" className="mb-3 block px-1 text-sm font-semibold text-[#5f3140]">
              Join Room
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="room-code"
                value={roomCode}
                onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                placeholder="ABCD"
                maxLength={6}
                className="min-h-12 flex-1 rounded-xl border border-[#c58a99]/50 bg-[#fffaf7] px-4 text-lg font-semibold uppercase tracking-[0.18em] text-[#351721] outline-none transition placeholder:text-[#b8909b] focus:border-[#7b1e2b]"
              />
              <button
                type="submit"
                className="min-h-12 rounded-xl bg-[#8f3a55] px-6 font-semibold text-[#fff8f4] transition hover:bg-[#773047] focus:outline-none focus:ring-4 focus:ring-[#d9adbd]"
              >
                Join
              </button>
            </div>
          </form>
        </div>
      </section>
  );
}
