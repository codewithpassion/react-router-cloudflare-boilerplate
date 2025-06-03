# react-router for cloudflare boilerplate

A modern, production-ready template for building full-stack React applications using React Router - published to cloudflare

## Features

- 🚀 Server-side rendering
- 🗄️ Cloudflare D1 and KV data storage using drizzle
- 🪟 ShadCN components
- 🔑 Authentication with `better-auth`
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling
- 🔍 Biome for linting
- 📖 [React Router docs](https://reactrouter.com/)

## Getting Started

### Installation

Install the dependencies:

```bash
bun install
```

### Development

Start the development server with HMR:

```bash
bun dev
```

Your application will be available at `http://localhost:5173`.

Check and lint:

```bash
bun check
```

### Update DB:

Update the drizzle migrations and run them locally:

```bash
bun run db:update
```

Update the remote db:

```bash
bun run db:apply --remote
```

## Previewing the Production Build

Preview the production build locally:

```bash
bun run preview
```

## Building for Production

Create a production build:

```bash
bun run build
```

## Deployment

Deployment is done using the Wrangler CLI.

To build and deploy directly to production:

```sh
bun run deploy
```

To deploy a preview URL:

```sh
bunx wrangler versions upload
```

You can then promote a version to production after verification or roll it out progressively.

```sh
bunx wrangler versions deploy
```

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

---

Built with ❤️ using React Router.

bunx @better-auth/cli generate --output db/auth-schema-admin.ts
