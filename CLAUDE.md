# React Router Cloudflare Boilerplate

This is a modern React application deployed to Cloudflare with authentication, server-side rendering, and database integration.

## Key References
- @README.md - Project overview and basic setup
- @package.json - Available commands and dependencies
- ai_docs/Rules.md - Detailed code style guidelines and commands

## Quick Commands
- Development: `bun dev`
- Linting/Type check: `bun check`
- Build: `bun build`
- Deploy: `bun deploy`
- Database migrations: `bun db:update` (local), `bun db:apply --remote` (production)

## Project Structure
- `/app` - Frontend React code
- `/api` - Backend API code
- `/workers` - Cloudflare Workers
- `/packages` - Shared packages including authentication

## Technologies
- React 19 with React Router 7
- TypeScript with strict typing
- Cloudflare hosting with D1 and KV storage
- Tailwind for styling with ShadCN components
- Biome for linting and formatting