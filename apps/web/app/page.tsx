import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight">Rhymix-TS</h1>
      <p className="mt-4 text-lg text-[rgb(var(--color-muted))]">
        TypeScript + Next.js 16 redesign of Rhymix CMS.
      </p>
      <p className="mt-2 text-sm text-[rgb(var(--color-muted))]">
        Status: <strong>scaffolded — install pending</strong>. SPECs are in{' '}
        <code className="rounded bg-black/10 px-1">.moai/specs/</code>.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/install"
          className="rounded-md bg-[rgb(var(--color-primary))] px-4 py-2 text-white hover:opacity-90"
        >
          Begin installation
        </Link>
      </div>
    </main>
  );
}
