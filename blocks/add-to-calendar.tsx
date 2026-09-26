import type { FixtureCalendarLinks } from "../shared/calendar";

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-3.5 shrink-0">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// "header": ação no cabeçalho de uma seção — no celular o cabeçalho quebra e o botão fica encostado
// à esquerda (menu abre pra direita); a partir de sm ele fica no canto direito (menu abre pra esquerda).
const MENU_ALIGN = {
  left: "left-0",
  center: "left-1/2 -translate-x-1/2",
  right: "right-0",
  header: "left-0 sm:left-auto sm:right-0",
} as const;

// Menu "Adicionar à agenda" — <details> nativo: abre/fecha sem JavaScript, então serve igual em
// server component e dentro de client component (agenda em abas, blocks/schedule-tabs.tsx). Duas
// saídas porque não existe uma que funcione em todo celular: o Google Agenda (Android/web) abre
// pelo link preenchido; iPhone/Outlook/outros importam o .ics (Android não abre .ics sozinho).
function CalendarMenu({
  label,
  items,
  align,
}: {
  label: string;
  items: { href: string; label: string; external?: boolean }[];
  align: keyof typeof MENU_ALIGN;
}) {
  return (
    <details className="relative inline-block text-left">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-primary ui-motion-base hover:bg-primary/10 [&::-webkit-details-marker]:hidden">
        <CalendarIcon />
        {label}
      </summary>
      <div
        className={`absolute top-full z-20 mt-1 w-56 rounded-panel border border-border bg-popover p-1 text-popover-foreground shadow-float ${MENU_ALIGN[align]}`}
      >
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            {...(item.external ? { target: "_blank", rel: "noreferrer" } : {})}
            className="block rounded-md px-3 py-2 text-sm text-foreground ui-motion-base hover:bg-muted"
          >
            {item.label}
          </a>
        ))}
      </div>
    </details>
  );
}

// Um jogo (link por confronto ainda não disputado).
export function AddToCalendar({
  links,
  label = "Adicionar à agenda",
  align = "center",
}: {
  links: FixtureCalendarLinks;
  label?: string;
  align?: keyof typeof MENU_ALIGN;
}) {
  return (
    <CalendarMenu
      label={label}
      align={align}
      items={[
        { href: links.google, label: "Google Agenda", external: true },
        { href: links.ics, label: "iPhone, Outlook e outros (.ics)" },
      ]}
    />
  );
}

// Todos os jogos de uma vez, por assinatura (shared/calendar.ts calendarSubscriptionUrls): jogo
// remarcado ou novo aparece sozinho na agenda de quem assinou.
export function SubscribeCalendar({
  urls,
  label = "Todos os jogos na sua agenda",
  align = "header",
}: {
  urls: { webcal: string; google: string };
  label?: string;
  align?: keyof typeof MENU_ALIGN;
}) {
  return (
    <CalendarMenu
      label={label}
      align={align}
      items={[
        { href: urls.google, label: "Assinar no Google Agenda", external: true },
        { href: urls.webcal, label: "Assinar no iPhone, Outlook e outros" },
      ]}
    />
  );
}
