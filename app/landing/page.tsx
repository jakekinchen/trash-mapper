import React from "react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden" style={{ backgroundColor: '#f1ffe9' }}>
      {/* Decorative background shapes */}
      <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-[#c7e55b]/30 blur-3xl z-0 animate-pulse" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-[#5ac8fa]/20 blur-2xl z-0 animate-pulse" />
      <div className="absolute inset-0 pointer-events-none z-0" />

      <section className="z-10 flex flex-col items-center justify-center px-6 py-16">
        <h1 className="text-5xl sm:text-7xl font-extrabold text-[#057c3d] text-center drop-shadow-lg mb-4 tracking-tight">
          Keep Austin Beautiful<br />
          <span className="text-[#057c3d]">Keep Austin Clean</span>
        </h1>
        <p className="mt-6 text-lg sm:text-2xl text-[#057c3d] max-w-2xl text-center font-medium">
          Join us in making Austin a greener, cleaner, and more beautiful city for everyone. Report pollution, find trash bins, and get involved in community events.
        </p>
        <div className="mt-10 flex gap-4">
          <Link href="/" className="inline-block rounded-full bg-[#057c3d] px-8 py-4 text-lg font-bold text-white shadow-lg hover:bg-[#045d2a] transition">
            Explore the Map
          </Link>
          <Link href="/events" className="inline-block rounded-full bg-[#5ac8fa] px-8 py-4 text-lg font-bold text-white shadow-lg hover:bg-[#3bb2e0] transition">
            Community Cleanup Events
          </Link>
        </div>
      </section>
      <footer className="z-10 absolute bottom-6 w-full flex justify-center">
        <span className="text-[#057c3d] text-sm font-medium">&copy; {new Date().getFullYear()} Trash Mapper ATX</span>
      </footer>
    </main>
  );
}
