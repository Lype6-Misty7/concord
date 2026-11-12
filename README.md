# Discord Clone

Monorepo com Turborepo contendo front-end (Next.js) e back-end (Express + Socket.IO + Drizzle/PostgreSQL).

## Estrutura

```
.
├── apps
│   ├── web      # Next.js + TypeScript + TailwindCSS + shadcn/ui
│   └── server   # Express + Socket.IO + Drizzle ORM + PostgreSQL
├── AGENTS.md    # contrato para devs/agentes de IA
├── package.json
└── turbo.json
```

## Requisitos

- Node.js 20+
- PostgreSQL

## Instalação

```bash
npm install
```

Copie as variáveis de ambiente:

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
```

Ajuste `DATABASE_URL` em `apps/server/.env`.

## Scripts

Na raiz:

```bash
npm run dev     # roda web e server simultaneamente
npm run build   # build de todos os apps
```

No `apps/server`:

```bash
npm run dev          # servidor em modo watch
npm run db:generate  # gera migrations
npm run db:migrate   # executa migrations
npm run db:push      # sincroniza schema com o banco
npm run db:studio    # abre o Drizzle Studio
```

## Adicionar componentes shadcn/ui

```bash
cd apps/web
npx shadcn@latest add button
```

## Banco de dados

O schema fica em `apps/server/src/db/schema.ts` (20 tabelas: usuários, sessões, servidores, cargos, membros, convites, canais, mensagens, anexos, reações, DMs, amizades, notificações etc.).

```bash
cd apps/server
npm run db:generate   # gera migration após alterar o schema
npm run db:migrate    # aplica migrations
```

As migrations ficam em `apps/server/drizzle/` e devem ser versionadas.

## Contrato de desenvolvimento

Antes de codar, leia o [AGENTS.md](./AGENTS.md). Ele descreve o contrato de API REST, eventos Socket.IO, permissões, convenções e a divisão de responsabilidades entre front-end e back-end (desenvolvidos por pessoas diferentes).

## Portas

- Web: http://localhost:3000
- Server: http://localhost:4000
