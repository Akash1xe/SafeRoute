import Image from 'next/image';

const routeModes = [
  { name: 'Fastest', detail: 'Distance first', weight: '90 / 10' },
  { name: 'Balanced', detail: 'Time meets safety', weight: '50 / 50' },
  { name: 'Safest', detail: 'Risk first', weight: '20 / 80' },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden px-6 py-8 md:px-12 lg:px-20">
      <nav className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-3 text-lg font-semibold tracking-tight">
          <span className="grid size-9 place-items-center rounded-xl bg-[#5df2b6] text-[#07120e]">
            S
          </span>
          SafeRoute
        </div>
        <span className="rounded-full border border-[#29483e] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#9bb9ad]">
          Foundation online
        </span>
      </nav>

      <section className="mx-auto grid max-w-7xl items-center gap-16 py-20 lg:grid-cols-[1.02fr_0.98fr] lg:py-28">
        <div>
          <p className="mb-6 font-mono text-xs uppercase tracking-[0.32em] text-[#5df2b6]">
            Community safety navigation
          </p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.055em] md:text-7xl">
            The shortest path isn&apos;t always the right one.
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-8 text-[#9bb9ad]">
            SafeRoute combines road distance with lighting, incidents,
            isolation, and temporary hazards to find a route that fits the
            moment.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <button className="rounded-full bg-[#5df2b6] px-6 py-3 font-semibold text-[#07120e] transition hover:bg-[#8ff8cd]">
              Explore the architecture
            </button>
            <span className="self-center text-sm text-[#719387]">
              Phase 1 · Platform foundation
            </span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-8 -z-10 rounded-full bg-[#5df2b6]/10 blur-3xl" />
          <Image
            src="/route-grid.svg"
            alt="Abstract street map with a highlighted safer route"
            width={640}
            height={420}
            priority
            className="w-full rounded-[28px] border border-[#29483e] shadow-2xl shadow-black/40"
          />
          <div className="absolute -bottom-8 left-6 right-6 grid gap-2 rounded-2xl border border-[#29483e] bg-[#0a1713]/95 p-3 shadow-xl backdrop-blur md:grid-cols-3">
            {routeModes.map((mode) => (
              <div
                key={mode.name}
                className="rounded-xl px-4 py-3 hover:bg-[#132a22]"
              >
                <p className="font-semibold">{mode.name}</p>
                <p className="mt-1 text-xs text-[#719387]">
                  {mode.detail} · {mode.weight}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
