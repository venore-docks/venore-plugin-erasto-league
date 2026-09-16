# @venore/plugin-erasto-league

Placar de futebol ao vivo pro Venore Docks. Semente do futuro site *Erasto League*.

- **Overlay pro OBS** — `/ext/erasto-league/overlay` — fundo transparente, placar bottom-center
  com logo da liga no medalhão central e **relógio de jogo**, atualiza sozinho via SSE.
- **Controle pelo celular** — `/ext/erasto-league/control` — escolhe os dois times cadastrados pra
  começar a partida; `+1 GOL` / `+0,5` / `−0,5` / `−1`, 🟨/🟥 cartão e falta por equipe (cada um
  abre uma folha rápida e dispensável "quem foi?" com o elenco), etiqueta, **relógio**
  (iniciar/pausar/zerar/±1:00 + atalhos "Fim 1º"/"Fim de jogo"), "Encerrar partida e salvar
  placar". Gateado por PIN.
- **Admin** — `/admin/erasto-league` — configura PIN, duração dos tempos, cor de destaque e a
  logo; atalhos pras telas e pro cadastro. Link aparece na nav do admin ao instalar o plugin.
- **Cadastro de times e jogadores** — `/admin/erasto-league/teams` e `/players`, sempre mantido
  por um admin (nunca pelos alunos). Time: nome, brasão (upload via `MediaPickerField`, sistema de
  mídia do host), cores, descrição/história, data de fundação. Jogador: time, nome, número, foto,
  bio. Perfis públicos em `/ext/erasto-league/teams/:slug` e `/players/:slug`.
- **Partida como entidade** — cada partida (`matches`) tem uma trilha de eventos (`match_events`:
  gol/cartão/falta, cada um podendo apontar pro jogador) em vez de só um contador — placar de cada
  lado é a soma dos eventos "goal". Times/jogador podem ficar sem atribuição no calor do jogo.
- **Súmula** — `/admin/erasto-league/matches` lista as partidas; abrir uma deixa completar o
  jogador de um evento sem atribuição, corrigir tipo/lado/quantidade ou remover um evento.
- **Classificação** — `runtime/standings.ts` agrega as partidas encerradas por time (V=3/E=1/D=0,
  saldo de gols), semeada com todo time cadastrado mesmo sem jogo ainda.
- **Blocos de page-builder** — contribuídos via `contributions.ts` (`blocks/`), aparecem no
  palette do builder do CMS (`/admin/cms/entries/:id/builder`) igual a qualquer bloco nativo, sem
  precisar do sistema de import/export do site:
  - **Erasto League — Capa** (`erasto-league.hero`) — título/subtítulo/CTA editáveis; cor de
    destaque e "🔴 ao vivo agora" vêm do plugin, não do que foi salvo na composição.
  - **Erasto League — Classificação** (`erasto-league.standings`) — tabela sempre recalculada na
    hora de renderizar (nunca lida do que foi salvo).
  - **Erasto League — Últimos resultados** (`erasto-league.recent-results`) — últimas N partidas
    encerradas, mesma filosofia.
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
| `erasto-league.periodMinutes` | 10 | Duração de um tempo. |
| `erasto-league.periodCount` | 2 | Número de tempos (10 × 2 = jogo de 20min). |
| `erasto-league.accentColor` | `#22c55e` | Cor da placa/halo/relógio no overlay. |
| `erasto-league.logoUrl` | `/erasto_league.png` | Logo no medalhão. Caminho no `public/` do host ou URL. Ausente → monograma "EL". |

## Relógio

Contagem crescente. O overlay guarda só `{running, anchorMs, accumulatedMs}` e calcula o tempo
decorrido localmente (`shared/clock.ts`), então corre suave mesmo durante uma reconexão do SSE.
Usa o `Date.now()` do cliente — em máquinas sem NTP pode divergir alguns segundos do servidor.

## Limites (o que falta pro site "de verdade")

- **Uma partida por vez.** Sem quadras/jogos simultâneos (confirmado como suficiente pro
  campeonato interno — ver plano interno).
- **Gráfico de rendimento e stats por jogador/time nos perfis** — próxima etapa, em cima do que
  `match_events` já guarda (gols/cartões/faltas por jogador).
- **Latência na Vercel.** Gol propaga entre instâncias em até ~1s (o re-poll do SSE). Pra reação
  instantânea, rodar como processo único (LAN / `next start`).
- **SSE de leitura aberto.** Qualquer um na rede vê o placar. O PIN protege só a escrita.
- **PIN simples.** Comparação direta, sem hash nem limite de tentativas.
