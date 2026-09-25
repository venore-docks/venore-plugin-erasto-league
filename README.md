# @venore/plugin-erasto-league

Placar de futebol ao vivo pro Venore Docks. Semente do futuro site *Erasto League*.

- **View pra TV/projetor** — `/ext/erasto-league/tv` — tabelas do campeonato em tela cheia (mesma
  técnica de palco escalável do venore-plugin-scoreboard, `shared/tv-stage.ts`): próximo jogo, uma
  página por grupo (ou classificação geral, se não houver fase de grupos), **artilheiros** (só entra
  no rodízio se já existe gol registrado) e eliminatórias, com rodízio automático quando há mais de
  uma página. Design premium: cartão com sombra/gradiente pra tabela (linhas grandes, medalha
  🥇🥈🥉 pro top 3, listras sutis), logo da marca do site (`brand.logoUrl`, `@venore/plugin-sdk/brand`)
  no canto do cabeçalho — sem indicador "ao vivo". Sem PIN/sessão, mesma filosofia do overlay —
  feita pra abrir em tela cheia numa TV do evento.
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
  `/erasto-league/teams/:slug` e `/erasto-league/players/:slug` — DENTRO da shell/tema do site
  (rota "public", não mais `/ext/`): capa, recorde (V/E/D/saldo/pontos) e últimos jogos encerrados
  pro time; gols/cartões (só dos eventos atribuídos a ele) e últimos jogos do TIME (não só os jogos
  em que ele tem evento atribuído — ver `runtime/stats.ts`) pro jogador (capitão aparece com um selo
  "C"). A lista de
  todos os times não é mais uma rota fixa — virou o bloco **Erasto League — Times**
  (`erasto-league.teams`, ver lista de blocos abaixo), pra o admin colocar em qualquer página.
  Excluir time/jogador é seguro: bloqueado de verdade se o time tem partida registrada (senão o
  histórico quebra); jogador sempre pode ser excluído — os eventos dele só perdem a atribuição, a
  partida em que ele era o MVP oficial fica sem MVP e os votos de Jogador da Torcida nele são
  apagados, tudo numa transação só (`runtime/teams.ts` `deleteTeam`, `runtime/players.ts`
  `deletePlayer`).
- **Partida como entidade** — cada partida (`matches`) tem uma trilha de eventos (`match_events`:
  gol/cartão/falta, cada um podendo apontar pro jogador) em vez de só um contador — placar de cada
  lado é a soma dos eventos "goal". Times/jogador podem ficar sem atribuição no calor do jogo.
- **Súmula** — `/admin/erasto-league/matches` lista as partidas; abrir uma deixa completar o
  jogador de um evento sem atribuição, corrigir tipo/lado/quantidade ou remover um evento.
  "Nova súmula" (`/admin/erasto-league/matches/new`) cria uma partida já ENCERRADA sem passar pelo
  controle ao vivo — pra jogo que já aconteceu (atrasou o cadastro, ou é histórico anterior ao
  plugin): escolhe os times, o placar final e a data, e cai direto na súmula do jogo criado pra
  detalhar/atribuir os gols a jogadores específicos.
- **Página pública do jogo** — `/erasto-league/jogos/:id` (`routes/match-public`): placar, MVP,
  lances (gol/cartão com jogador) e o **link do YouTube** do jogo (todo jogo é transmitido lá) —
  colado à mão na súmula (`matches.youtube_url`, seção "Transmissão" em
  `/admin/erasto-league/matches/:id`, `routes/admin/matches/youtube-url-form.tsx`). Link de
  `youtube.com`/`youtu.be` reconhecido vira player embutido (`shared/youtube.ts`
  `extractYoutubeVideoId`); qualquer outro formato cai pra um botão "Assistir no YouTube ↗"; sem
  link ainda, mostra "transmissão não disponível" (não é erro — todo jogo passa por aqui antes de
  ter o link colado). Os widgets que mostram resultado linkam pra cá quando o confronto já tem
  partida vinculada: placar central de **últimos resultados** (`blocks/match-result-card.tsx`) e
  **agenda** (`blocks/schedule-tabs.tsx`), "Ver jogo →" nas eliminatórias de **fases do campeonato**
  (`blocks/bracket-block.tsx`), e a linha inteira de "últimos jogos" nos perfis de time/jogador.
- **Power boosts** — catálogo **editável pelo admin** em `/admin/erasto-league/power-boosts`
  (`erasto_league.power_boosts`: acrescentar, editar rótulo/emoji/descrição, remover — a "key"
  interna gravada nos usos segue o rótulo sozinha na criação e não muda em edições depois, ver
  `runtime/power-boosts.ts`). Cada time pode usar um ou mais boosts durante a partida; registrado
  direto no controle ao vivo (`erasto_league.match_boosts`, um evento por uso, sem limite de
  quantidade), **removível no próprio controle** (toca no selo do boost pra tirar — "usei por
  engano") além de corrigível/completável na súmula. Excluir um boost do catálogo não apaga usos já
  registrados (sem FK de propósito, mesma filosofia de excluir jogador) — eles só perdem o
  rótulo/emoji bonito e caem pra key crua na exibição.
- **Classificação** — `runtime/standings.ts` agrega as partidas encerradas por time (V=3/E=1/D=0,
  saldo de gols), semeada com todo time cadastrado mesmo sem jogo ainda.
- **Blocos de page-builder** — contribuídos via `contributions.ts` (`blocks/`), aparecem no
  palette do builder do CMS (`/admin/cms/entries/:id/builder`) igual a qualquer bloco nativo, sem
  precisar do sistema de import/export do site:
  - **Erasto League — Capa** (`erasto-league.hero`) — título/subtítulo/CTA editáveis; "🔴 ao vivo
    agora" vem do plugin (match_state), não do que foi salvo na composição — mas a cor de destaque
    é do TEMA do site (`var(--primary)`), não da configuração de `accentColor` do plugin (essa é só
    a identidade visual de overlay/controle/TV, telas fora do tema).
  - **Erasto League — Classificação** (`erasto-league.standings`) — tabela sempre recalculada na
    hora de renderizar (nunca lida do que foi salvo).
  - **Erasto League — Últimos resultados** (`erasto-league.recent-results`) — últimas N partidas
    encerradas, cartão com placar em destaque e brasão dos dois times.
  - **Erasto League — Artilharia** (`erasto-league.top-scorers`) — ranking de gols por jogador,
    com foto (placeholder de avatar quando não há foto) e time abaixo do nome.
  - **Erasto League — Time em destaque** (`erasto-league.team-spotlight`) — card compacto de UM
    time (slug configurável) com recorde — pra "time campeão", destaque do mês, etc.
  - **Erasto League — Times** (`erasto-league.teams`) — grade com TODOS os times cadastrados, um
    cartão por time: crista/cor, quantidade de jogadores no elenco e recorde (V/E/D + cartões
    amarelo/vermelho, agregados de `match_events` via `runtime/standings.ts`). Substitui a antiga
    rota fixa `/ext/erasto-league/teams` — agora o admin decide em que página do site ela aparece.
  - **Erasto League — Fases** (`erasto-league.bracket`) — pra formato copa (grupos +
    eliminatórias), que a classificação/últimos resultados sozinhos não cobrem: mini-classificação
    por grupo (nome do time sempre por inteiro, nunca mais truncado — são as colunas numéricas
    J/SG/CA/CV/Pts que apertam, não o nome; **CA/CV** = cartões amarelos/vermelhos) mais
    chaveamento de quartas/semi/final. Não lista mais os confrontos do grupo linha a linha (isso é
    o bloco de agenda, abaixo) — só a tabela. Alimentado por `fixtures` (confrontos agendados, ver
    abaixo) + `runtime/standings.ts` (cartões agregados de `match_events`), não por `matches`
    direto.
  - **Erasto League — Agenda de jogos** (`erasto-league.schedule`) — TODOS os confrontos (grupos +
    eliminatórias) em **abas por rodada** (client component, `blocks/schedule-tabs.tsx`) — dentro
    de cada aba os cards continuam em ordem cronológica, mas só uma rodada aparece por vez, pra não
    virar um "listão" conforme o campeonato acumula jogos. Confronto sem rodada (raro, geralmente
    só em eliminatória) cai numa aba própria pela fase. Alimentado por `runtime/bracket.ts`
    (`getScheduleView`), mesma fonte do bloco de fases.
  - **Erasto League — Próximo jogo (ad 16:9)** (`erasto-league.next-game-ad`) — card promocional
    de proporção fixa 16:9 (times, crista grande, rodada, data/hora) — pra usar como destaque na
    página inicial. Fundo nas **cores do tema** (não dos times — cor de cada time fica só no anel
    da crista e no traço sob o nome). A mesma "página" aparece também na view de TV
    (`/ext/erasto-league/tv`, sempre primeiro no rodízio), alimentadas pelo mesmo dado
    (`runtime/bracket.ts` `getNextFixture`) — o próximo confronto ainda não jogado, em ordem
    cronológica. **Responsivo por container, não por viewport** (`@container` + variantes
    `@sm`/`@md`/`@lg`/`@xl`, Tailwind v4 nativo): a largura real deste bloco depende de onde o
    admin o colocou no construtor de páginas (largura cheia vs. dentro de uma "Linha" com colunas
    estreitas), e o viewport do navegador não diz nada sobre isso — crista, nome, "VS" e as pílulas
    de rodada/data escalam a partir da largura renderizada do próprio card.
- **Data e hora do confronto são colunas SEPARADAS** (`fixtures.scheduled_date` +
  `fixtures.scheduled_time`, não um `timestamptz` combinado) — um `<input type="datetime-local">`
  só aceita o valor quando as duas partes estão preenchidas, então editar só a hora de um
  confronto sem data ficava "preso" esperando uma data; um timestamp único também não consegue
  representar "dia já marcado, horário ainda a definir" sem ambiguidade (meia-noite vira
  indistinguível de "sem hora"). `/admin/erasto-league/fixtures/:id` tem dois `<input>`
  independentes (`type="date"` + `type="time"`). Efeito colateral bom: como as duas colunas
  guardam texto puro ("YYYY-MM-DD"/"HH:mm"), nenhuma conversão de fuso acontece na escrita —
  elimina de vez a classe de bug que existia com o timestamp combinado (CSV import e o form
  usavam `new Date(...)`/`<input type="datetime-local">` direto, que pegava o fuso de quem
  EXECUTA o código — o servidor, UTC em produção — em vez de horário de Brasília; um jogo
  marcado "10:30" virava "07:30"). `shared/timezone.ts` só entra pra ORDENAR cronologicamente
  (`fixtureDateTimeToEpoch`, nunca gravado) e pra formulários que ainda usam data+hora combinada
  (súmula manual, `runtime/matches.ts`).
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
  confronto à partida real depois de jogada (não é 100% automático — dois times podem se enfrentar
  mais de uma vez, então um par ambíguo sempre cai pra escolha manual). Partida encerrada (ao vivo
  ou súmula manual) tenta se auto-vincular na hora (`runtime/match-actions.ts` `endCurrentMatch`,
  `runtime/matches.ts` `createManualMatch`); o botão **"Vincular automaticamente"** no topo da
  página de fixtures (`runtime/fixtures.ts` `autoLinkAllFixtures`) faz essa mesma varredura em
  massa pra todos os confrontos pendentes de uma vez — cobre partida que já existia antes desse
  auto-link, ou que ficou ambígua na hora porque outro confronto do mesmo par ainda não tinha sido
  resolvido. Exemplo de planilha (times e confrontos do Erasto League 2026, 100% por id) em
  `csv/teams.csv` e `csv/fixtures.csv`.
- **Capa do jogo** — na súmula (`/admin/erasto-league/matches/:id`, seção "Capa do jogo") o admin
  envia uma foto (`matches.cover_media_id`, `MediaPickerField`) e o sistema gera a capa **1280×720
  sem placar** em `/api/erasto-league/matches/:id/cover` (`routes/api/match-cover`,
  `runtime/match-cover-image.tsx`): foto de fundo, brasões, nomes, rodada/fase, data e logo da liga.
  Gerada com `next/og` e convertida pra JPEG pelo `sharp` (optionalDependency do Next; sem ele sai
  PNG), com a foto girada pela orientação EXIF e recortada em 16:9. "Baixar capa" entrega o arquivo
  pra subir como miniatura no YouTube (o sistema não mexe no YouTube); com foto salva, a mesma capa
  abre a página pública do jogo. Fonte Barlow Condensed embutida (`shared/fonts`, OFL).
- **Preview de link (WhatsApp/redes)** — `/erasto-league/jogos/:id`, `/erasto-league/votar/jogo/:id`
  e `/erasto-league/votar` declaram `generateMetadata` na `route-table.ts` (`runtime/share-metadata.ts`):
  título, descrição e a capa do jogo como `og:image` (URL absoluta montada do request, 1280×720).
  Precisa do core com `generateMetadata` em `PluginPageRouteEntry` (venore-docks `main`); em host
  mais antigo o campo é ignorado — o plugin funciona igual, só sem o preview.
- **Votação da torcida (sem login)** — dois prêmios da torcida, separados do MVP oficial:
  - **Jogador da Torcida** — um voto por aparelho por jogo, abre no apito inicial e fecha N horas
    depois do fim (`erasto-league.fanVoteWindowHours`, padrão 48h: os alunos só votam de casa).
  - **Time favorito** — um voto por aparelho na temporada, **pode trocar** enquanto aberta; o admin
    abre/fecha e zera na virada de temporada.
  - Hub público `/erasto-league/votar` (destino do QR e do link na descrição do YouTube), mais
    `/erasto-league/votar/jogo/:id` e `/erasto-league/votar/time-favorito` (`routes/vote-public`).
  - Identidade = cookie de aparelho httpOnly (`runtime/voter.ts`); no banco só vão hashes (cookie,
    IP agrupado por /64 no IPv6 e user-agent, HMAC com o `AUTH_SECRET`). Limpar cookie/aba anônima
    vota de novo — limitação aceita; a **auditoria** (súmula de cada jogo e `/admin/erasto-league/votes`)
    agrupa por IP, marca "suspeito" quando o mesmo navegador vota várias vezes e deixa o admin
    "Manter 1 por navegador", "Anular todos" ou "Restaurar" — nada é anulado sozinho.
  - Anti-robô opcional: Cloudflare Turnstile, ligado só com `ERASTO_LEAGUE_TURNSTILE_SITE_KEY` +
    `ERASTO_LEAGUE_TURNSTILE_SECRET_KEY` no ambiente.
  - **Overlay do QR** `/ext/erasto-league/vote-overlay` — fonte do OBS **separada** do placar (o
    operador do OBS liga/desliga; o controle de gols não mexe nela). Chama o Jogador da Torcida com
    votação aberta, senão o Time favorito, senão fica transparente. `?pos=top-left|top-right|bottom-left|bottom-right`.
  - **Parcial** no bloco **Erasto League — Votação da torcida** (`erasto-league.fan-votes`) e na **TV
    da votação** `/ext/erasto-league/vote-tv` (rodízio entre os dois rankings + QR; `?pagina=jogador|time`).
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
| `erasto-league.logoMediaId` | (vazio) | Logo no medalhão, via sistema de mídia do host (MediaPickerField). Ausente → monograma "EL". |
| `erasto-league.youtubeChannelId` | (vazio) | Id do canal do YouTube da transmissão (bloco `erasto-league.broadcast`). |
| `erasto-league.fanVoteWindowHours` | 48 | Horas que a votação do Jogador da Torcida fica aberta depois do jogo (`/admin/erasto-league/votes`). |
| `erasto-league.favoriteTeamVotingOpen` | `true` | Votação do Time favorito aberta (`/admin/erasto-league/votes`). |

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
