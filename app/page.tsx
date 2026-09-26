import ValuationCalculator from "@/components/ValuationCalculator";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-[#0E1B22]/15 px-4 py-6 sm:px-8">
        <p className="mx-auto max-w-5xl text-sm font-medium uppercase tracking-[0.4em]">
          TerraVault
        </p>
      </header>
      <ValuationCalculator />
    </main>
  );
}
