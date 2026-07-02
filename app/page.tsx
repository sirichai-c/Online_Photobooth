import { LandingPage } from "@/components/LandingPage";

export default function Home() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#f8eceb] px-5 py-12 text-[#29151d]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_18%_12%,rgba(174,66,83,0.30),transparent_30rem),radial-gradient(circle_at_88%_18%,rgba(112,75,109,0.24),transparent_28rem),linear-gradient(135deg,#fff7f3_0%,#f6dadd_46%,#e8dce8_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-[-10%] z-0 scale-110 bg-[url('/images.jpg')] bg-cover bg-center opacity-[0.18] blur-3xl saturate-[0.85]"
      />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 bg-[#fff8f4]/65" />
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-6rem)] max-w-5xl items-center justify-center">
        <LandingPage />
      </div>
    </main>
  );
}
