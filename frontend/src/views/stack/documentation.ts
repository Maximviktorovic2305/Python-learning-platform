import type { TechnologyIconName } from "@/shared/ui/technology-icon";

type Documentation = { href: string; icon: TechnologyIconName };

export const documentation: Record<string, Documentation> = {
  "TypeScript 5.9": {
    href: "https://www.typescriptlang.org/docs/",
    icon: "typescript",
  },
  "Next.js 16.4": { href: "https://nextjs.org/docs", icon: "nextdotjs" },
  "React 19.3": { href: "https://react.dev/learn", icon: "react" },
  "Tailwind CSS 4": {
    href: "https://tailwindcss.com/docs",
    icon: "tailwindcss",
  },
  "CSS Modules": {
    href: "https://github.com/css-modules/css-modules#readme",
    icon: "code",
  },
  "TanStack Query 5": {
    href: "https://tanstack.com/query/latest/docs/framework/react/overview",
    icon: "tanstack",
  },
  "openapi-fetch": {
    href: "https://openapi-ts.dev/openapi-fetch/",
    icon: "openapiinitiative",
  },
  "openapi-typescript": {
    href: "https://openapi-ts.dev/introduction",
    icon: "typescript",
  },
  "Motion 14": { href: "https://motion.dev/docs/react", icon: "animation" },
  "Lucide React": { href: "https://lucide.dev/guide/react", icon: "lucide" },
  "next-themes": {
    href: "https://github.com/pacocoursey/next-themes#readme",
    icon: "nextdotjs",
  },
  "Canvas API": {
    href: "https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API",
    icon: "browser",
  },
  "Feature-Sliced Design": {
    href: "https://feature-sliced.design/docs",
    icon: "layers",
  },
  "Python 3.14": { href: "https://docs.python.org/3.14/", icon: "python" },
  "FastAPI 0.143": { href: "https://fastapi.tiangolo.com/", icon: "fastapi" },
  "Uvicorn 0.54": { href: "https://uvicorn.dev/", icon: "terminal" },
  "Pydantic 2.14": {
    href: "https://docs.pydantic.dev/latest/",
    icon: "pydantic",
  },
  "pydantic-settings": {
    href: "https://docs.pydantic.dev/latest/concepts/pydantic_settings/",
    icon: "settings",
  },
  OpenAPI: {
    href: "https://spec.openapis.org/oas/latest.html",
    icon: "openapiinitiative",
  },
  HTTPX: { href: "https://www.python-httpx.org/", icon: "network" },
  "email-validator": {
    href: "https://github.com/JoshData/python-email-validator#readme",
    icon: "shield",
  },
  tzdata: { href: "https://tzdata.readthedocs.io/en/latest/", icon: "browser" },
  "PostgreSQL 18.6": {
    href: "https://www.postgresql.org/docs/18/",
    icon: "postgresql",
  },
  "SQLAlchemy 2.1": {
    href: "https://docs.sqlalchemy.org/en/21/",
    icon: "sqlalchemy",
  },
  asyncpg: {
    href: "https://magicstack.github.io/asyncpg/current/",
    icon: "database",
  },
  "Alembic 1.20": {
    href: "https://alembic.sqlalchemy.org/en/latest/",
    icon: "database",
  },
  pwdlib: { href: "https://frankie567.github.io/pwdlib/", icon: "shield" },
  Argon2: {
    href: "https://github.com/P-H-C/phc-winner-argon2#readme",
    icon: "shield",
  },
  PyJWT: { href: "https://pyjwt.readthedocs.io/en/stable/", icon: "shield" },
  "HttpOnly cookie": {
    href: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#httponly",
    icon: "shield",
  },
  "Web Locks": {
    href: "https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API",
    icon: "shield",
  },
  BroadcastChannel: {
    href: "https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API",
    icon: "network",
  },
  "Pyodide 314.0.7": { href: "https://pyodide.org/en/stable/", icon: "python" },
  WebAssembly: {
    href: "https://webassembly.github.io/spec/core/",
    icon: "webassembly",
  },
  "Web Workers": {
    href: "https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API",
    icon: "boxes",
  },
  "FastAPI Runner": { href: "https://fastapi.tiangolo.com/", icon: "fastapi" },
  Docker: { href: "https://docs.docker.com/", icon: "docker" },
  "Docker-in-Docker 28": {
    href: "https://hub.docker.com/_/docker",
    icon: "docker",
  },
  "Python 3.14 slim": {
    href: "https://hub.docker.com/_/python",
    icon: "python",
  },
  "Node.js 24+": {
    href: "https://nodejs.org/docs/latest-v24.x/api/",
    icon: "nodedotjs",
  },
  "npm 11": { href: "https://docs.npmjs.com/", icon: "npm" },
  "Docker Compose": {
    href: "https://docs.docker.com/compose/",
    icon: "docker",
  },
  "GitHub Actions": {
    href: "https://docs.github.com/en/actions",
    icon: "githubactions",
  },
  Git: { href: "https://git-scm.com/doc", icon: "git" },
  "Python venv": {
    href: "https://docs.python.org/3.14/library/venv.html",
    icon: "python",
  },
  pip: { href: "https://pip.pypa.io/en/stable/", icon: "package" },
  Playwright: { href: "https://playwright.dev/docs/intro", icon: "code" },
  "axe-core": {
    href: "https://github.com/dequelabs/axe-core#readme",
    icon: "shield",
  },
  pytest: { href: "https://docs.pytest.org/en/stable/", icon: "pytest" },
  "pytest-asyncio": {
    href: "https://pytest-asyncio.readthedocs.io/en/stable/",
    icon: "pytest",
  },
  SQLite: { href: "https://www.sqlite.org/docs.html", icon: "sqlite" },
  aiosqlite: {
    href: "https://aiosqlite.omnilib.dev/en/stable/",
    icon: "database",
  },
  Mypy: { href: "https://mypy.readthedocs.io/en/stable/", icon: "python" },
  Ruff: { href: "https://docs.astral.sh/ruff/", icon: "ruff" },
  "ESLint 9": { href: "https://eslint.org/docs/latest/", icon: "eslint" },
  "eslint-config-next": {
    href: "https://nextjs.org/docs/app/api-reference/config/eslint",
    icon: "nextdotjs",
  },
  Prettier: { href: "https://prettier.io/docs/", icon: "prettier" },
  "React Compiler": {
    href: "https://react.dev/learn/react-compiler",
    icon: "react",
  },
  "TypeScript Compiler API": {
    href: "https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API",
    icon: "typescript",
  },
};
