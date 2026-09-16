# @venore/plugin-erasto-league

Placar de futebol ao vivo pro Venore Docks. Semente do futuro site *Erasto League*.

- **View pra TV/projetor** — `/ext/erasto-league/tv` — tabelas do campeonato em tela cheia (mesma
  técnica de palco escalável do venore-plugin-scoreboard, `shared/tv-stage.ts`): uma página por
  grupo (ou classificação geral, se não houver fase de grupos) + eliminatórias, com rodízio
  automático quando há mais de uma página. Design premium: cartão com sombra/gradiente pra tabela
  (linhas grandes, medalha 🥇🥈🥉 pro top 3, listras sutis), logo da marca do site (`brand.logoUrl`,
  `@venore/plugin-sdk/brand`) no canto do cabeçalho — sem indicador "ao vivo". Sem PIN/sessão, mesma
  filosofia do overlay — feita pra abrir em tela cheia numa TV do evento.
- **Overlay pro OBS** — `/ext/erasto-league/overlay` — fundo transparente, placar bottom-center
  com logo da liga no medalhão central e **relógio de jogo**, atualiza sozinho via SSE.
- **Controle pelo celular** — `/ext/erasto-league/control` — escolhe os dois times cadastrados pra
  começar a partida; `+1 GOL` / `+0,5` / `−0,5` / `−1`, 🟨/🟥 cartão e falta por equipe (cada um
  abre uma folha rápida e dispensável "quem foi?" com o elenco), etiqueta, **relógio**
  (iniciar/pausar/zerar/±1:00 + atalhos "Fim 1º"/"Fim de jogo"), "Encerrar partida e salvar
  placar" ou "Cancelar partida" (descarta sem contar na súmula/classificação — pra quando começou
  errado). Gateado por LOGIN — mesma permissão (`erasto-league.manage`) de qualquer outra tela
  admin do plugin (não mais PIN de cookie), alcançável pela superfície do admin ("Abrir controle ↗"
  em `/admin/erasto-league`).
- **Prévia no overlay** — na tela de escolher times do controle, "Mostrar" liga uma pílula
  discreta ("Em breve: Time A × Time B" ou texto livre) no overlay ocioso; "Ocultar" desliga. Sem
  prévia ligada, o overlay ocioso continua só transparente, como sempre foi.
- **Admin** — `/admin/erasto-league` — configura duração dos tempos, cor de destaque e a logo;
  atalhos pras telas e pro cadastro. Link aparece na nav do admin ao instalar o plugin.
- **Cadastro de times e jogadores** — `/admin/erasto-league/teams` e `/players`, sempre mantido
  por um admin (nunca pelos alunos). Time: nome, brasão (upload via `MediaPickerField`, sistema de
  mídia do host), cores, descrição/história, data de fundação. Jogador: time, nome, número, gênero
  (opcional, só pra sinalizar), capitão (flag), foto, bio. Perfis públicos em
  `/ext/erasto-league/teams/:slug` e `/players/:slug` — capa, recorde (V/E/D/saldo/pontos) e
  últimos jogos encerrados pro time; gols/cartões e últimos jogos pro jogador (capitão aparece com
  um selo "C"). Excluir time/jogador é seguro: bloqueado de verdade se o time tem partida
  registrada (senão o histórico quebra); jogador sempre pode ser excluído — os eventos dele só
  perdem a atribuição (`runtime/teams.ts` `deleteTeam`, `runtime/players.ts` `deletePlayer`).
- **Partida como entidade** — cada partida (`matches`) tem uma trilha de eventos (`match_events`:
  gol/cartão/falta, cada um podendo apontar pro jogador) em vez de só um contador — placar de cada
  lado é a soma dos eventos "goal". Times/jogador podem ficar sem atribuição no calor do jogo.
- **Súmula** — `/admin/erasto-league/matches` lista as partidas; abrir uma deixa completar o
  jogador de um evento sem atribuição, corrigir tipo/lado/quantidade ou remover um evento.
  "Nova súmula" (`/admin/erasto-league/matches/new`) cria uma partida já ENCERRADA sem passar pelo
  controle ao vivo — pra jogo que já aconteceu (atrasou o cadastro, ou é histórico anterior ao
  plugin): escolhe os times, o placar final e a data, e cai direto na súmula do jogo criado pra
  detalhar/atribuir os gols a jogadores específicos.
- **Power boosts** — catálogo MOCKADO de 5 exemplos (`shared/power-boosts.ts`, troca fácil pela
  lista real quando o campeonato mandar) — cada time pode usar um ou mais boosts durante a partida;
  registrado direto no controle ao vivo (`erasto_league.match_boosts`, um evento por uso, sem
  limite de quantidade), **removível no próprio controle** (toca no selo do boost pra tirar — "usei
  por engano") além de corrigível/completável na súmula.
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
    encerradas, cartão com placar em destaque e brasão dos dois times.
  - **Erasto League — Artilharia** (`erasto-league.top-scorers`) — ranking de gols por jogador,
    com foto (placeholder de avatar quando não há foto) e time abaixo do nome.
  - **Erasto League — Time em destaque** (`erasto-league.team-spotlight`) — card compacto de UM
    time (slug configurável) com recorde — pra "time campeão", destaque do mês, etc.
  - **Erasto League — Fases** (`erasto-league.bracket`) — pra formato copa (grupos +
    eliminatórias), que a classificação/últimos resultados sozinhos não cobrem: mini-classificação
    e jogos por grupo, mais chaveamento de quartas/semi/final. Alimentado por `fixtures`
    (confrontos agendados, ver abaixo), não por `matches` direto. Não mostra mais data (isso é o
    bloco de agenda, abaixo) — só "a jogar" pro que ainda não aconteceu.
  - **Erasto League — Agenda de jogos** (`erasto-league.schedule`) — TODOS os confrontos (grupos +
    eliminatórias) em ordem cronológica, agrupados por dia, com brasão dos dois times, horário ou
    placar, e a **rodada em destaque** (selo cheio) quando o confronto tem uma. Alimentado por
    `runtime/bracket.ts` (`getScheduleView`), mesma fonte do bloco de fases.
  - **Erasto League — Próximo jogo (ad 16:9)** (`erasto-league.next-game-ad`) — card promocional
    de largura/altura fixa 16:9 (times, crista grande, rodada, data/hora, fundo dividido nas cores
    de cada time) — pra usar como destaque na página inicial. A mesma "página" aparece também na
    view de TV (`/ext/erasto-league/tv`, sempre primeiro no rodízio), alimentadas pelo mesmo dado
    (`runtime/bracket.ts` `getNextFixture`) — o próximo confronto ainda não jogado, em ordem
    cronológica.
- **Fixtures (confrontos agendados) + import CSV** — `erasto_league.fixtures`: um confronto pode
  existir ANTES de qualquer partida (importado via `/admin/erasto-league/import` OU criado/editado
  direto em `/admin/erasto-league/fixtures/new` e `/fixtures/:id` — fase, grupo, **rodada**, os
  dois times ou um rótulo livre, e data/hora), com fase (grupo/quartas/semi/final), grupo, rodada,
  data e os dois times — ou só um rótulo ("Vencedor Grupo A") quando o time da eliminatória ainda
  não é conhecido. A **rodada** (`roundLabel`) aparece em destaque (selo cheio, não mais uma tag
  discreta) na agenda de jogos, no bloco de fases e na view de TV. **Ordem de apresentação sempre
  por data** (`runtime/fixtures.ts` `listFixtures`/`listFixturesByPhase` — confrontos sem data
  ficam por último), nunca pela ordem de importação do CSV. **Grupo é campo do confronto, não
  do time** — `teams` não guarda grupo nenhum; o grupo de um time (usado pela mini-classificação do
  bloco de fases) é derivado de em quais fixtures de fase de grupos ele aparece. `homeTeamId`/
  `awayTeamId` (uuid) têm prioridade sobre `homeTeam`/`awayTeam` (nome) na hora de casar o time da
  linha — recomendado usar sempre o id, não o nome (sobrevive a renomear o time, sem risco de
  acento/digitação/typo separar o "mesmo" time em dois). Times por CSV: com "id" preenchido —
  gerado por quem monta a planilha, não precisa existir ainda — cria o time COM aquele id exato se
  não existir, ou atualiza se já existir (`createTeamWithId`/`updateTeam`); sem "id", casa/upserta
  pelo nome (`upsertTeamByName`), o caminho de quando não tem uuid nenhum à mão. Dá pra ver o id de
  um time já cadastrado na página dele (`/admin/erasto-league/teams/:id`). `/admin/erasto-league/fixtures`
  lista tudo, deixa **editar/excluir/criar confrontos manualmente** e **vincular manualmente** um
  confronto à partida real depois de jogada (não é automático — dois times podem se enfrentar mais
  de uma vez). Exemplo de planilha (times e confrontos do Erasto League 2026, 100% por id) em
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
- **SSE de leitura aberto.** Qualquer um na rede vê o placar (overlay/TV são intencionalmente
  públicos). A escrita (controle) exige login com a permissão `erasto-league.manage`.
