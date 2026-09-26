// Brasão redondo (ou as iniciais) — tamanho decidido por quem chama (className).
export function TeamCrest({ name, crestUrl, className }: { name: string; crestUrl: string | null; className: string }) {
  if (crestUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={crestUrl} alt="" loading="lazy" className={`${className} shrink-0 rounded-full object-cover`} />;
  }
  return (
    <span className={`${className} flex shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground`}>
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}
