# @venore/plugin-erasto-league

Placar de futebol ao vivo pro Venore Docks. **Spike** — semente do futuro site *Erasto League*.

- **Overlay pro OBS** — `/ext/erasto-league/overlay` — fundo transparente, placar bottom-center,
  atualiza sozinho via SSE.
- **Controle pelo celular** — `/ext/erasto-league/control` — `+1 GOL` / `−1` por equipe, nome dos
  times, etiqueta (1º tempo, intervalo…), zerar. Gateado por PIN.
- Tempo real: `EventSource` → `/api/erasto-league/events` (SSE), pub/sub em memória
  (`runtime/match-bus.ts`).

## Rodar localmente contra o host (venore-docks)

O plugin é um pacote `@venore/plugin-<key>`; o host descobre pelos `dependencies` do `package.json`
dele. Pra dev, aponte por caminho — **mudança local, não commitar no `main` do venore-docks**
(o deploy vanilla não leva plugin):

```bash
# no repo do host (ex: c:/dev/venore/venore-claudinho)
npm pkg set dependencies.@venore/plugin-erasto-league="file:../venore-plugin-erasto-league"
npm install
npm run gen:registries      # regenera src/plugins/*.generated.ts
npm run dev
```

Depois:

1. Abra `/admin/plugins` no host → **Instalar** em "Erasto League" (não tem migration, é instantâneo).
2. OBS → *Fonte* → *Navegador* → `http://<ip-da-maquina>:3000/ext/erasto-league/overlay`
   (largura/altura = a resolução da sua cena, ex 1920×1080; marque *fundo transparente*).
3. Celular na mesma rede → `http://<ip-da-maquina>:3000/ext/erasto-league/control` → digite o PIN.

Pra desfazer o wiring de dev:

```bash
npm pkg delete dependencies.@venore/plugin-erasto-league
npm install && npm run gen:registries
```

## PIN

`ERASTO_LEAGUE_PIN` no ambiente do host. Sem a env var, usa `1234` e as telas mostram um aviso.

## Limites do spike (o que falta pro site "de verdade")

- **Partida única, em memória.** Um placar global; reinício do servidor zera tudo. Multi-instância
  não funciona (o barramento é `globalThis`, não Redis).
- **Sem persistência / sem liga.** Nada de times cadastrados, rodadas, tabela de classificação,
  histórico. Isso é schema Postgres + migrations + telas de admin (fase seguinte).
- **SSE de leitura aberto.** Qualquer um na rede vê o placar em `/api/erasto-league/events`. O PIN
  protege só a escrita.
- **PIN simples.** Comparação direta, sem hash nem limite de tentativas (o `venore-plugin-broadcast`
  faz scrypt + backoff — modelo pra copiar quando isso for pra banco).
- **Sem item de navegação admin nem permission de RBAC.** Acesso por URL direta.
