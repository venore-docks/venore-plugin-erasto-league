# @venore/plugin-erasto-league

Placar de futebol ao vivo pro Venore Docks. Semente do futuro site *Erasto League*.

- **Overlay pro OBS** — `/ext/erasto-league/overlay` — fundo transparente, placar bottom-center
  com logo da liga no medalhão central e **relógio de jogo**, atualiza sozinho via SSE.
- **Controle pelo celular** — `/ext/erasto-league/control` — escolhe os dois times cadastrados pra
  começar a partida; `+1 GOL` / `+0,5` / `−0,5` / `−1`, 🟨/🟥 cartão e falta por equipe (cada um
  abre uma folha rápida e dispensável "quem foi?" com o elenco), etiqueta, **relógio**
  (iniciar/pausar/zerar/±1:00 + atalhos "Fim 1º"/"Fim de jogo"), "Encerrar partida e salvar
  placar" ou "Cancelar partida" (descarta sem contar na súmula/classificação — pra quando começou
  errado). Gateado por PIN.
- **Prévia no overlay** — na tela de escolher times do controle, "Mostrar" liga uma pílula
  discreta ("Em breve: Time A × Time B" ou texto livre) no overlay ocioso; "Ocultar" desliga. Sem
  prévia ligada, o overlay ocioso continua só transparente, como sempre foi.
- **Admin** — `/admin/erasto-league` — configura PIN, duração dos tempos, cor de destaque e a
  logo; atalhos pras telas e pro cadastro. Link aparece na nav do admin ao instalar o plugin.
- **Cadastro de times e jogadores** — `/admin/erasto-league/teams` e `/players`, sempre mantido
  por um admin (nunca pelos alunos). Time: nome, brasão (upload via `MediaPickerField`, sistema de
  mídia do host), cores, descrição/história, data de fundação. Jogador: time, nome, número, foto,
  bio. Perfis públicos em `/ext/erasto-league/teams/:slug` e `/players/:slug` — capa, recorde
  (V/E/D/saldo/pontos) e últimos jogos encerrados pro time; gols/cartões e últimos jogos pro
  jogador. Excluir time/jogador é seguro: bloqueado de verdade se o time tem partida registrada
  (senão o histórico quebra); jogador sempre pode ser excluído — os eventos dele só perdem a
  atribuição (`runtime/teams.ts` `deleteTeam`, `runtime/players.ts` `deletePlayer`).
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
  - **Erasto League — Artilharia** (`erasto-league.top-scorers`) — ranking de gols por jogador.
  - **Erasto League — Time em destaque** (`erasto-league.team-spotlight`) — card compacto de UM
    time (slug configurável) com recorde — pra "time campeão", destaque do mês, etc.
  - **Erasto League — Fases** (`erasto-league.bracket`) — pra formato copa (grupos +
    eliminatórias), que a classificação/últimos resultados sozinhos não cobrem: mini-classificação
    e jogos por grupo, mais chaveamento de quartas/semi/final. Alimentado por `fixtures`
    (confrontos agendados, ver abaixo), não por `matches` direto.
- **Fixtures (confrontos agendados) + import CSV** — `erasto_league.fixtures`: um confronto pode
  existir ANTES de qualquer partida (importado via `/admin/erasto-league/import`), com fase
  (grupo/quartas/semi/final), grupo, rodada, data e os dois times — ou só um rótulo ("Vencedor
  Grupo A") quando o time da eliminatória ainda não é conhecido. **Grupo é campo do confronto, não
  do time** — `teams` não guarda grupo nenhum; o grupo de um time (usado pela mini-classificação do
  bloco de fases) é derivado de em quais fixtures de fase de grupos ele aparece. `homeTeamId`/
  `awayTeamId` (uuid, veja o ID na página do time em `/admin/erasto-league/teams/:id`) têm
  prioridade sobre `homeTeam`/`awayTeam` (nome) na hora de casar o time da linha — use nome no
  primeiro import (id ainda não existe) e id numa correção depois (sobrevive a renomear o time).
  `/admin/erasto-league/fixtures` lista tudo e deixa **vincular manualmente** um confronto à
  partida real depois de jogada (não é automático — dois times podem se enfrentar mais de uma
  vez). Times por CSV: sem "id" casa/upserta pelo nome (`upsertTeamByName`); com "id" atualiza
  aquele time específico. Exemplo de planilha (times e confrontos do Erasto League 2026) em
  `csv/teams.csv` e `csv/fixtures.csv`.
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
- **Gráfico de rendimento** (série temporal de gols/cartões) nos perfis — próxima etapa; hoje é só
  o total (stats já existem em `runtime/stats.ts`).
- **Latência na Vercel.** Gol propaga entre instâncias em até ~1s (o re-poll do SSE). Pra reação
  instantânea, rodar como processo único (LAN / `next start`).
- **SSE de leitura aberto.** Qualquer um na rede vê o placar. O PIN protege só a escrita.
- **PIN simples.** Comparação direta, sem hash nem limite de tentativas.
