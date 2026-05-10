import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl p-8 space-y-8">
      <header className="space-y-2">
        <h1 className="text-4xl font-bold">Casino</h1>
        <p className="text-white/70">
          Provably-fair casino for Czech Republic & Slovakia. 18+. Hraní může
          být návykové. Hraj zodpovědně.
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <GameCard href="/games/dice" name="Dice" status="live" />
        <GameCard href="/games/slots" name="Slots" status="soon" />
        <GameCard href="/games/blackjack" name="Blackjack" status="soon" />
        <GameCard href="/games/roulette" name="Roulette" status="soon" />
        <GameCard href="/games/crash" name="Crash" status="soon" />
        <GameCard href="/games/plinko" name="Plinko" status="soon" />
      </section>

      <footer className="text-xs text-white/50 pt-8 border-t border-white/10">
        Operated under licence — see /legal. Self-exclusion: /responsible.
      </footer>
    </main>
  );
}

function GameCard({
  href,
  name,
  status,
}: {
  href: string;
  name: string;
  status: "live" | "soon";
}) {
  const live = status === "live";
  const Inner = (
    <div className="rounded-lg bg-panel p-6 hover:bg-white/5 transition border border-white/5 h-32 flex flex-col justify-between">
      <div className="text-xl font-semibold">{name}</div>
      <div className={live ? "text-win text-xs" : "text-white/40 text-xs"}>
        {live ? "Play now" : "Coming soon"}
      </div>
    </div>
  );
  return live ? <Link href={href}>{Inner}</Link> : <div>{Inner}</div>;
}
