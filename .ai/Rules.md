# Bash Commands
- `bun dev`: Start development server with HMR
- `bun check`: Run typechecking and linting
- `bun biome:check`: Run Biome linter and formatter
- `bun build`: Build for production
- `bun deploy`: Build and deploy to Cloudflare
- `bun preview`: Preview production build locally
- `bun db:update`: Generate and apply DB migrations locally
- `bun db:apply --remote`: Apply migrations to remote DB

# Style Guide

## Code Formatting
- Use Biome for linting and formatting
- Tab indentation (not spaces)
- Double quotes for strings
- Imports are auto-organized by Biome

## Naming Conventions
- React components use PascalCase
- Files use kebab-case
- Variables use camelCase

## Project Structure
- Paths: Use `~/*` for app imports, `~~/*` for worker imports
- TypeScript: Use strict mode with explicit typing

## Frontend
- Use TailwindCSS for styling
- Utilize ShadCN components from `app/components/ui`
- Authentication through `better-auth` package

## Backend
- Always use `bun` as the package manager
- Use `hono` for backend functionality
- Database: Drizzle ORM with schemas in `api/database/schema.ts` (SQLite tables)
- Data storage: Cloudflare D1 and KV with Drizzle ORM

## Environment Variables & Types
- **Never directly edit** `worker-configuration.d.ts` (auto-generated file)
- Add environment variables to `wrangler.jsonc` (`vars` section)
- Add secrets to `.dev.vars` for local development and `.dev.vars.example` for documentation
- Run `bun cf-typegen` to regenerate TypeScript types after changes
- Use `wrangler secret put VARIABLE_NAME` for production secrets