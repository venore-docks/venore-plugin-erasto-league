import Link from "next/link";
import type { ReactNode } from "react";

// Seção da página inicial: título, ação opcional (ex: assinar agenda) e link "ver todos". `compact`
// = coluna lateral (título menor).
export function HomeSection({
  title,
  href,
  hrefLabel = "Ver todos",
  action,
  compact = false,
  className = "",
  children,
}: {
  title: string;
  href?: string;
  hrefLabel?: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`min-w-0 space-y-3 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 className={`font-semibold text-foreground ${compact ? "text-lg" : "text-2xl"}`}>{title}</h2>
        {(action || href) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {action}
            {href && (
              <Link href={href} className="text-sm font-semibold text-primary hover:underline">
                {hrefLabel} →
              </Link>
            )}
          </div>
        )}
      </div>
      {children}
    </section>
  );
}
