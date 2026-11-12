# AGENTS.md

Guia para agentes de IA (e humanos) que trabalham neste repositório.
**Leia este arquivo por completo antes de alterar qualquer código.**

> Projeto: clone do Discord (monorepo).
> Front-end e back-end são desenvolvidos **por pessoas diferentes**, com agentes de IA diferentes.
> O contrato descrito aqui é a fonte de verdade para que os dois lados não divirjam.

---

## 1. Visão geral

Monorepo gerenciado com **Turborepo + npm workspaces**.

| App | Caminho | Stack | Porta |
| --- | --- | --- | --- |
| Front-end | `apps/web` | Next.js 15 (App Router) + TypeScript + TailwindCSS + shadcn/ui | 3000 |
| Back-end | `apps/server` | Node + Express + TypeScript + Socket.IO + Drizzle ORM + PostgreSQL | 4000 |

O setup já está pronto. **Nenhuma feature de negócio foi implementada ainda** — só a base (build, dev, schema do banco e conexões).

---

## 2. Estrutura do repositório

```
.
├── AGENTS.md                 # este arquivo (contrato)
├── package.json              # scripts turbo + workspaces
├── turbo.json
├── apps/
│   ├── web/                  # FRONT-END (dono: dev front)
│   │   ├── components.json   # config shadcn/ui
│   │   ├── src/app/          # rotas (App Router)
│   │   ├── src/components/   # componentes (ui/ = shadcn)
│   │   ├── src/lib/          # utils, api client, socket client
│   │   └── .env.example
│   └── server/               # BACK-END (dono: dev back)
│       ├── drizzle.config.ts
│       ├── drizzle/          # migrations SQL geradas (versionar!)
│       ├── src/index.ts      # bootstrap Express + Socket.IO
│       ├── src/db/           # conexão + schema Drizzle
│       └── .env.example
```

### Fronteiras de propriedade (IMPORTANTE)

- **Dev/agente do front-end** só altera `apps/web/**`.
- **Dev/agente do back-end** só altera `apps/server/**`, migrations e este contrato quando necessário.
- Alterar o outro lado exige **combinar antes** com o dono.
- Mudança no contrato de API/socket/banco **deve ser registrada neste AGENTS.md** no mesmo commit/PR.

---

## 3. Comandos

Na raiz:

```bash
npm install           # instala tudo (workspaces)
npm run dev           # sobe web + server juntos
npm run build         # build de todos os apps
```

Back-end (`apps/server`):

```bash
npm run dev           # tsx watch
npm run db:generate   # gera migration a partir do schema
npm run db:migrate    # aplica migrations pendentes
npm run db:push       # sincroniza schema direto (APENAS dev local)
npm run db:studio     # Drizzle Studio
```

Front-end (`apps/web`):

```bash
npm run dev
npm run build
npm run start
```

Adicionar componente shadcn/ui:

```bash
cd apps/web && npx shadcn@latest add button
```

### Observações de ambiente (Windows)

- O `packageManager` está fixado em `npm@11.20.0`; o Turborepo exige esse campo.
- Se o PowerShell bloquear scripts, execute via:
  `powershell -ExecutionPolicy Bypass -Command "npm run ..."`
- Não troque npm por pnpm/yarn sem combinar com o outro dev (lockfile único).

---

## 4. Variáveis de ambiente

Nunca commite `.env`. Use os `.env.example` como referência.

`apps/server/.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/discord_clone
PORT=4000
CLIENT_URL=http://localhost:3000
```

`apps/web/.env`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

Regras:

- Só variáveis `NEXT_PUBLIC_*` podem ir para o browser. Segredos ficam no server.
- Back-end valida env no boot (zod) e falha rápido se faltar algo.

---

## 5. Banco de dados (Drizzle + PostgreSQL)

### Fonte de verdade

`schema.ts` em `apps/server/src/db/schema.ts`. **Nunca** altere o banco manualmente sem atualizar o schema.

### Workflow obrigatório

1. Edite `src/db/schema.ts`.
2. Rode `npm run db:generate` (gera SQL em `drizzle/`).
3. **Commita a migration gerada.**
4. Rode `npm run db:migrate` (ou `db:push` apenas em dev local).
5. Avise o outro dev sobre mudança que afete o front.

Nunca use `drizzle-kit drop`/reset sem confirmação; nunca rode `db:push` contra banco compartilhado/produção.

### Tabelas (20 no total, mais 6 enums)

| Tabela | Papel |
| --- | --- |
| `users` | Conta, perfil, status de presença |
| `accounts` | Vinculação OAuth (provider + providerAccountId) |
| `sessions` | Sessões/refresh tokens |
| `servers` | Servidores (guilds) |
| `roles` | Cargos com bitfield de permissões |
| `server_members` | Membros do servidor (nickname, joinedAt) |
| `member_roles` | Cargos por membro (N:N) |
| `server_bans` | Banimentos |
| `invites` | Convites por código |
| `channels` | Canais (text, voice, category, announcement, forum, dm, group_dm) |
| `channel_permission_overwrites` | Overwrites de permissão por cargo/usuário |
| `dm_participants` | Participantes de DM/group DM |
| `messages` | Mensagens (inclui DM, reply, pin, edit) |
| `attachments` | Anexos de mensagens |
| `message_reactions` | Reações (emoji por usuário) |
| `message_mentions` | Menções em mensagens |
| `read_states` | Última leitura + contador de menções |
| `voice_states` | Estado de voz (mute/deaf/sessão) |
| `friendships` | Pedidos/amizades/bloqueios |
| `notifications` | Notificações com payload JSONB |

Enums do Postgres: `user_status`, `channel_type`, `message_type`, `permission_target`, `friendship_status`, `notification_type`.

### Convenções do schema

- PKs são `uuid` (`defaultRandom()`); IDs expostos na API são strings UUID.
- Timestamps são `timestamptz` em UTC; na API viram strings ISO 8601 (`2026-01-01T12:00:00.000Z`).
- `createdAt`/`updatedAt`; `updatedAt` tem `$onUpdate`.
- Sem soft delete: remoções usam `ON DELETE CASCADE` (ou `SET NULL` onde indicado).
- DMs reutilizam `channels` com `serverId = NULL` e `type in ('dm','group_dm')`.
- Permissões são bitfields numéricos (`bigint mode: number`). Valores canônicos na seção 7.

### Bitfield de permissões

| Permissão | Bit | Valor |
| --- | --- | --- |
| `VIEW_CHANNEL` | 0 | 1 |
| `SEND_MESSAGES` | 1 | 2 |
| `MANAGE_MESSAGES` | 2 | 4 |
| `MANAGE_CHANNELS` | 3 | 8 |
| `MANAGE_ROLES` | 4 | 16 |
| `KICK_MEMBERS` | 5 | 32 |
| `BAN_MEMBERS` | 6 | 64 |
| `CREATE_INVITES` | 7 | 128 |
| `CONNECT` (voz) | 8 | 256 |
| `SPEAK` (voz) | 9 | 512 |
| `MUTE_MEMBERS` | 10 | 1024 |
| `DEAFEN_MEMBERS` | 11 | 2048 |
| `MANAGE_SERVER` | 12 | 4096 |
| `ADMINISTRATOR` | 13 | 8192 |

Cálculo: cargo = base; overwrite de canal `allow`/`deny` tem precedência; `ADMINISTRATOR` ignora tudo. Implemente em **um único módulo** no back (`src/lib/permissions.ts`) e replique só as constantes no front, se precisar exibir.

---

## 6. Contrato HTTP (REST)

- Base: `http://localhost:4000/api/v1`
- Conteúdo: JSON (`Content-Type: application/json`)
- Auth: cookies `httpOnly` (`access_token` curto + `refresh_token`). O front deve usar `credentials: "include"`.
- Datas: strings ISO 8601. IDs: UUID string. Permissões: number.
- Toda resposta de sucesso: `{ "data": ... }`
- Listas paginadas: `{ "data": [...], "meta": { "nextCursor": "uuid|null", "hasMore": boolean } }`
- Erros: `{ "error": { "code": "UNAUTHORIZED", "message": "...", "details": ... } }`
  - Códigos: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `RATE_LIMITED` (429), `INTERNAL` (500).

### Endpoints planejados

Ainda não implementados. O back implementa nesta ordem; o front pode tipar contra esta lista.

**Auth**

| Método | Rota | Descrição |
| --- | --- | --- |
| POST | `/auth/register` | cria conta e inicia sessão |
| POST | `/auth/login` | login |
| POST | `/auth/logout` | encerra sessão |
| POST | `/auth/refresh` | renova access token |
| GET | `/auth/me` | usuário autenticado |

**Usuários**

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/users/:userId` | perfil público |
| PATCH | `/users/me` | atualiza perfil |
| GET | `/users/me/servers` | servidores do usuário |

**Servidores / membros / cargos**

| Método | Rota | Descrição |
| --- | --- | --- |
| POST | `/servers` | cria servidor (+ canal geral + cargo everyone) |
| GET | `/servers/:serverId` | detalhe |
| PATCH | `/servers/:serverId` | atualiza (dono/ADMIN) |
| DELETE | `/servers/:serverId` | remove (dono) |
| GET | `/servers/:serverId/members` | lista membros |
| DELETE | `/servers/:serverId/members/:userId` | kick |
| GET | `/servers/:serverId/roles` | lista cargos |
| POST | `/servers/:serverId/roles` | cria cargo |
| PATCH | `/servers/:serverId/roles/:roleId` | edita cargo |
| DELETE | `/servers/:serverId/roles/:roleId` | remove cargo |
| PUT | `/servers/:serverId/members/:userId/roles` | define cargos do membro |
| POST | `/servers/:serverId/invites` | cria convite |
| POST | `/invites/:code/join` | entra via convite |

**Canais / mensagens**

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/servers/:serverId/channels` | canais do servidor |
| POST | `/servers/:serverId/channels` | cria canal |
| PATCH | `/channels/:channelId` | edita canal |
| DELETE | `/channels/:channelId` | remove canal |
| GET | `/channels/:channelId/messages?before=<msgId>&limit=50` | histórico (cursor) |
| POST | `/channels/:channelId/messages` | envia mensagem |
| PATCH | `/messages/:messageId` | edita (autor) |
| DELETE | `/messages/:messageId` | remove (autor/MANAGE_MESSAGES) |
| PUT | `/messages/:messageId/reactions/:emoji` | adiciona reação |
| DELETE | `/messages/:messageId/reactions/:emoji` | remove reação |
| PUT | `/channels/:channelId/read` | marca leitura |
| GET | `/channels/:channelId/pins` | mensagens fixadas |

**DMs / amigos**

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/dms` | conversas do usuário |
| POST | `/dms` | abre/cria DM (`{ userId }` ou `{ userIds }`) |
| GET | `/dms/:channelId/messages` | histórico |
| GET | `/friends` | lista amigos/pendentes |
| POST | `/friends/requests` | envia pedido (`{ username }`) |
| PATCH | `/friends/requests/:friendshipId` | aceita/recusa |
| DELETE | `/friends/:userId` | remove amizade |

Regras de payload: o back valida tudo com **zod** e retorna `VALIDATION_ERROR` com `details` por campo. O front espelha os schemas em `apps/web/src/types/api.ts` (não importe código do server).

---

## 7. Contrato Socket.IO

- URL: `NEXT_PUBLIC_SOCKET_URL` (`http://localhost:4000`)
- Auth: cookie de sessão (`withCredentials: true`). Sem JWT no query string.
- Client singleton em `apps/web/src/lib/socket.ts`. Nunca crie múltiplas conexões.
- Salas:
  - `user:{userId}` — eventos pessoais (notificações, presence, amizade)
  - `server:{serverId}` — eventos do servidor (membros, canais, cargos)
  - `channel:{channelId}` — eventos do canal (mensagens, reações, typing)
- O cliente entra/sai das salas via eventos `channel:join` / `channel:leave`; o server valida acesso.

### Eventos cliente → servidor

| Evento | Payload | Ack |
| --- | --- | --- |
| `channel:join` | `{ channelId }` | `{ ok: boolean, error?: string }` |
| `channel:leave` | `{ channelId }` | `{ ok: boolean }` |
| `message:send` | `{ channelId, content, replyToId?, attachmentIds?, nonce }` | `{ ok: true, message } \| { ok: false, error }` |
| `message:edit` | `{ messageId, content }` | ack |
| `message:delete` | `{ messageId }` | ack |
| `reaction:add` | `{ messageId, emoji }` | ack |
| `reaction:remove` | `{ messageId, emoji }` | ack |
| `typing:start` | `{ channelId }` | — |
| `typing:stop` | `{ channelId }` | — |
| `voice:join` | `{ channelId, selfMute?, selfDeaf? }` | ack |
| `voice:leave` | `{ channelId }` | ack |
| `voice:state` | `{ selfMute?, selfDeaf? }` | ack |

### Eventos servidor → cliente

| Evento | Payload |
| --- | --- |
| `message:created` | `Message` (inclui `nonce` para dedupe otimista) |
| `message:updated` | `Message` |
| `message:deleted` | `{ messageId, channelId }` |
| `reaction:added` | `{ messageId, channelId, emoji, userId }` |
| `reaction:removed` | `{ messageId, channelId, emoji, userId }` |
| `typing:start` / `typing:stop` | `{ channelId, userId, username }` |
| `presence:updated` | `{ userId, status, customStatus? }` |
| `member:joined` / `member:left` | `{ serverId, userId }` |
| `channel:created` / `channel:updated` / `channel:deleted` | `Channel` / `{ channelId }` |
| `friend:request` | `{ friendship }` |
| `notification:new` | `Notification` |
| `voice:state:updated` | `{ channelId, userId, selfMute, selfDeaf }` |

Regras:

- Persistir no banco **antes** de emitir.
- Emitir para a sala correta, nunca `io.emit` global.
- Sempre responder o ack com `{ ok, ... }`; erros de socket usam os mesmos códigos do REST (`UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`, ...).
- O front deve remover listeners no cleanup (`useEffect`).

---

## 8. Diretrizes do FRONT-END (`apps/web`)

- **Server Components por padrão**; `"use client"` só onde houver interação/estado/efeitos.
- `src/app` só rotas/layouts. Componentes de feature em `src/components/<feature>/`. Componentes shadcn em `src/components/ui/` (podem ser editados, mas mantenha o padrão).
- Centralize HTTP em `src/lib/api.ts` (base URL, `credentials: "include"`, parse de erro). Não espalhe `fetch` cru.
- Para dados no cliente, prefira **TanStack Query** (instalar quando começar; combinar antes). Para estado global, **zustand**.
- Formulários: **react-hook-form + zod** (instalar quando começar).
- Estilo: **somente classes Tailwind e tokens** (`bg-background`, `text-muted-foreground`...). Proibido hex solto ou CSS inline, exceto casos justificados.
- Dark mode via classe `.dark` (já configurado).
- Variáveis de ambiente só `NEXT_PUBLIC_*`.
- Nunca importe de `apps/server` nem acesse o banco direto.
- Acessibilidade mínima: `label`, `aria-*`, foco visível, navegação por teclado.
- Otimistic UI (mensagens) deve usar o `nonce` e reconciliar com `message:created`.

### Estrutura sugerida ao crescer

```
src/
├── app/(auth)/login, register
├── app/(app)/channels/[serverId]/[channelId]
├── app/(app)/dms/[channelId]
├── components/{ui,chat,servers,channels,members,friends,voice}
├── hooks/
├── lib/{api,socket,utils}
├── stores/
└── types/api.ts          # espelho dos tipos do contrato
```

---

## 9. Diretrizes do BACK-END (`apps/server`)

- `src/index.ts` só faz bootstrap (env, Express, Socket.IO, listen). Nada de regra de negócio.
- Ao implementar, organize em:
  ```
  src/
  ├── index.ts
  ├── app.ts
  ├── routes/         # define rotas + middleware de validação
  ├── controllers/    # parse request -> chama service
  ├── services/       # regra de negócio + acesso ao Drizzle
  ├── middlewares/    # auth, error handler, rate limit
  ├── socket/         # handlers e helpers de sala
  ├── lib/            # permissions, password, tokens, errors
  └── db/             # index.ts + schema.ts
  ```
- Validação de entrada **sempre** com zod; nunca confie no body.
- Hash de senha com **argon2** (ou bcrypt) — nunca em texto puro.
- Todo acesso ao banco via Drizzle (`db`, `db.query`); nada de SQL concatenado.
- Operações multi-tabela (ex.: criar servidor) em **transação**.
- Autorização centralizada (`assertServerMember`, `assertPermission`); nunca confie em `serverId` do cliente sem verificar vínculo.
- Erros de domínio com `AppError(code, status, message)`; um único error handler converte para o envelope padrão.
- Logs estruturados; nunca logue senha/token.
- CORS restrito a `CLIENT_URL`; cookies `httpOnly`, `sameSite: "lax"`, `secure` em produção.
- Rate limit em auth e envio de mensagens.
- Socket: autenticar handshake, validar permissão de canal/servidor, persistir e então emitir.
- Uploads: armazenar arquivo fora do banco; `attachments.url` aponta para o storage.
- Não retorne campos sensíveis (`passwordHash`, `token`).

---

## 10. Convenções gerais de código

- TypeScript `strict`; sem `any` gratuito (`unknown` + narrowing quando necessário).
- Nomes: `camelCase` no código, `snake_case` no banco, rotas REST em `kebab-case`.
- Imports com alias `@/` no front (`@/* -> ./src/*`).
- Funções pequenas e coesas; services puros o suficiente para testar.
- Comentários só quando explicam o "porquê".
- Não reformate arquivos inteiros nem misture refactor com feature.
- Commits pequenos e descritivos (ex.: `feat(api): add channel message endpoints`).
- Ao adicionar dependência relevante, avise o outro dev (afeta install/lockfile).

---

## 11. Regras de ouro para agentes de IA

1. **Leia este arquivo antes de codar.**
2. Respeite a fronteira front/back; não edite o lado do outro.
3. Não invente endpoints, eventos ou campos fora deste contrato. Se precisar, **atualize o contrato primeiro** e avise.
4. Mudou schema? Gere migration e commite.
5. Nunca commite `.env`, credenciais ou dumps.
6. Não rode comandos destrutivos no banco (`drop`, reset, `push` em banco compartilhado) sem confirmação explícita.
7. Não implemente features de outro dono "de passagem".
8. Antes de finalizar, rode `npm run build` na raiz e garanta zero erros de TypeScript.
9. Prefira diffs pequenos e focados; não mexa em arquivos não relacionados.
10. Se o contrato mudou, atualize `AGENTS.md` e descreva no resumo final o que mudou para o outro lado consumir.

---

## 12. Definition of Done

- `npm run build` passa sem erros.
- Sem erros de tipo; sem `console.log` esquecido (use logger no server).
- Migration gerada/commitada se o schema mudou.
- Endpoints/eventos implementados conforme a seção 6/7, com validação e autorização.
- Erros no envelope padrão e status corretos.
- Contrato atualizado quando aplicável.
- Descrição final informa: o que foi feito, como testar e se algo impacta o outro dev.

---

## 13. Estado atual (o que ainda NÃO existe)

- Nenhuma rota REST implementada.
- Nenhum evento de socket de negócio (só `connection`/`disconnect`).
- Nenhuma tela/feature no front.
- Sem autenticação, uploads, seed ou testes automatizados.
- Sem pacote `packages/shared` — tipos são espelhados manualmente. Se os dois lados concordarem, criar depois para compartilhar schemas zod e tipos.
