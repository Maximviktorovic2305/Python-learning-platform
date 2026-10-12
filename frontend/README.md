# Python Lab frontend

Next.js App Router + React + strict TypeScript. FSD uses `views` for the page composition layer because Next.js reserves `src/pages` for Pages Router.

Full setup, API contract generation and verification commands: [project README](../README.md). Dependency boundaries and execution model: [architecture](../ARCHITECTURE.md).

```sh
npm ci
npm run dev -- --port 3010 --hostname 127.0.0.1
```

Open http://localhost:3010. Run the API on port 8010; `API_URL` controls the server proxy. `WEB_ORIGIN` controls the Python worker's runtime-only network policy. Both are build-time settings.
