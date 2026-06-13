type PrivatePlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PrivatePlaceholderPage({ eyebrow, title, description }: PrivatePlaceholderPageProps) {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <p className="mb-3 text-sm font-medium text-primary">{eyebrow}</p>
      <h1 className="font-heading text-3xl font-semibold text-ink">{title}</h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-ink-2">{description}</p>
    </main>
  );
}
