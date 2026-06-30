/** Ícone da IA — usa a logo da marca. */
export function IAIcon({ className = "" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo-jm.svg" alt="IA" className={className} />;
}
