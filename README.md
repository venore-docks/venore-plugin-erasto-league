# @venore/plugin-erasto-league

Placar de futebol ao vivo pro Venore Docks. Semente do futuro site *Erasto League*.

- **Overlay pro OBS** — `/ext/erasto-league/overlay` — fundo transparente, placar bottom-center
  com logo da liga no medalhão central e **relógio de jogo**, atualiza sozinho via SSE.
- **Controle pelo celular** — `/ext/erasto-league/control` — `+1 GOL` / `−1` por equipe, nomes,
  etiqueta, **relógio** (iniciar/pausar/zerar/±1:00 + atalhos "Fim 1º"/"Fim de jogo"), nova
  partida. Gateado por PIN.
- **Admin** — `/admin/erasto-league` — configura PIN, nomes padrão, duração dos tempos, cor de
  destaque e a logo; atalhos pras telas. Link aparece na nav do admin ao instalar o plugin.
- **Tempo real** — `EventSource` → `/api/erasto-league/events` (SSE). O servidor relê o banco a
  cada 1s (catch-up multi-instância) e o client cai em polling de `/api/erasto-league/state`
  quando o SSE está fora.
- **Persistência** — `erasto_league.match_state` (linha única). Migrations próprias, aplicadas no
  install. Sobrevive a restart e a multi-instância (era a causa do overlay "zerar" no F5).

## Rodar localmente contra o host (venore-docks)

```bash
# no repo do host (ex: c:/dev/venore/venore-claudinho)
npm pkg set dependencies.@venore/plugin-erasto-league="file:../venore-plugin-erasto-league"
npm install
npm run gen:registries
npm run dev
```

Depois: `/admin/plugins` → **Instalar** em "Erasto League" (roda a migration, ~instantâneo) →
o link "Erasto League" aparece na nav do admin.

## Configuração

Tudo em `/admin/erasto-league` (contexts/settings do host):

| Setting | Default | Pra quê |
| --- | --- | --- |
| `erasto-league.pin` | *(vazio)* | PIN do controle. Vazio = env `ERASTO_LEAGUE_PIN`, ou `1234`. |
| `erasto-league.defaultHomeName` / `defaultAwayName` | Casa / Visitante | Nomes ao começar nova partida. |
| `erasto-league.periodMinutes` | 10 | Duração de um tempo. |
| `erasto-league.periodCount` | 2 | Número de tempos (10 × 2 = jogo de 20min). |
| `erasto-league.accentColor` | `#22c55e` | Cor da placa/halo/relógio no overlay. |
| `erasto-league.logoUrl` | `/erasto_league.png` | Logo no medalhão. Caminho no `public/` do host ou URL. Ausente → monograma "EL". |

## Relógio

Contagem crescente. O overlay guarda só `{running, anchorMs, accumulatedMs}` e calcula o tempo
decorrido localmente (`shared/clock.ts`), então corre suave mesmo durante uma reconexão do SSE.
Usa o `Date.now()` do cliente — em máquinas sem NTP pode divergir alguns segundos do servidor.

## Limites (o que falta pro site "de verdade")

- **Partida única.** Um `match_state` global; sem times cadastrados, rodadas, tabela, histórico.
- **Latência na Vercel.** Gol propaga entre instâncias em até ~1s (o re-poll do SSE). Pra reação
  instantânea, rodar como processo único (LAN / `next start`).
- **SSE de leitura aberto.** Qualquer um na rede vê o placar. O PIN protege só a escrita.
- **PIN simples.** Comparação direta, sem hash nem limite de tentativas.
