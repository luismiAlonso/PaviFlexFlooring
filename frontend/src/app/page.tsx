import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-5xl font-bold tracking-tight mb-4">
        Pavi<span className="text-brand-500">Flex</span>Flooring
      </h1>
      <p className="text-gray-400 text-xl max-w-lg mb-10">
        Visualiza cualquier pavimento en tu espacio antes de comprar.
        Sube una foto y cambia el suelo en segundos.
      </p>
      <Link
        href="/visualizer"
        className="bg-brand-600 hover:bg-brand-700 transition-colors text-white font-semibold px-8 py-3 rounded-xl text-lg"
      >
        Empezar ahora
      </Link>
      <p className="mt-6 text-sm text-gray-600">
        V1 — imagen estática &nbsp;·&nbsp; Pro — tiempo real (proximamente)
      </p>
    </main>
  );
}
