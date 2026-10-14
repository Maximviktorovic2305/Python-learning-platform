import { PageHeading } from "@/shared/ui";
import { ArrowUpRight } from "lucide-react";
import { TechnologyIcon } from "@/shared/ui/technology-icon";
import { documentation } from "./documentation";
import styles from "./Stack.module.css";

type StackGroup = {
  title: string;
  description: string;
  technologies: [string, string][];
};
const groups: StackGroup[] = [
  {
    title: "Интерфейс",
    description: "Страницы курса, личный кабинет и интерактивные задания.",
    technologies: [
      ["TypeScript 5.9", "Строгая типизация интерфейса и API-контракта."],
      [
        "Next.js 16.4 · React 19.3",
        "App Router, серверные и клиентские компоненты, маршрутизация и сборка Turbopack.",
      ],
      [
        "Tailwind CSS 4 · CSS Modules",
        "Общие стили, изолированные стили компонентов и адаптивные темы.",
      ],
      [
        "TanStack Query 5",
        "Запросы к API, кэш данных и обновление после действий.",
      ],
      [
        "openapi-fetch · openapi-typescript",
        "Типизированный HTTP-клиент и генерация типов из OpenAPI.",
      ],
      ["Motion 14 · Lucide React", "Анимации и иконки интерфейса."],
      ["next-themes", "Светлая и тёмная темы."],
      [
        "Canvas API",
        "Анимация питона и визуальные элементы учебного интерфейса.",
      ],
      [
        "Feature-Sliced Design",
        "Слои app, views, widgets, features, entities и shared.",
      ],
    ],
  },
  {
    title: "API и сервер",
    description: "Аккаунты, учебный контент, проверка ответов и прогресс.",
    technologies: [
      ["Python 3.14", "Основной язык API и сервиса исполнения кода."],
      ["FastAPI 0.143 · Uvicorn 0.54", "Асинхронный HTTP API и ASGI-сервер."],
      [
        "Pydantic 2.14 · pydantic-settings",
        "Валидация запросов, схемы ответов и конфигурация приложения.",
      ],
      ["OpenAPI", "Общий контракт между сервером и интерфейсом."],
      ["HTTPX", "Асинхронные HTTP-запросы к сервису исполнения."],
      [
        "email-validator · tzdata",
        "Проверка email и поддержка часовых поясов IANA.",
      ],
    ],
  },
  {
    title: "Данные и авторизация",
    description: "Хранение учебных данных, результатов и сессий.",
    technologies: [
      ["PostgreSQL 18.6", "Основная база данных."],
      [
        "SQLAlchemy 2.1 · asyncpg",
        "Асинхронная работа с базой данных, ORM и транзакции.",
      ],
      ["Alembic 1.20", "Миграции схемы базы данных."],
      ["pwdlib · Argon2", "Хеширование и проверка паролей."],
      ["PyJWT", "Подписанные токены доступа."],
      [
        "HttpOnly cookie · Web Locks · BroadcastChannel",
        "Обновление сессий и синхронизация входа и выхода между вкладками.",
      ],
    ],
  },
  {
    title: "Исполнение Python",
    description: "Запуск кода в браузере и серверная проверка заданий.",
    technologies: [
      [
        "Pyodide 314.0.7 · WebAssembly",
        "Python runtime для локального запуска в браузере.",
      ],
      [
        "Web Workers",
        "Исполнение Python отдельно от основного потока интерфейса.",
      ],
      [
        "FastAPI Runner",
        "Отдельный сервис для проверки кода и ожидаемого вывода.",
      ],
      [
        "Docker · Docker-in-Docker 28",
        "Серверные контейнеры исполнения с лимитами ресурсов и отключённой сетью.",
      ],
      ["Python 3.14 slim", "Образ Python для серверных заданий."],
    ],
  },
  {
    title: "Инфраструктура и сборка",
    description: "Окружение разработки и запуск компонентов проекта.",
    technologies: [
      [
        "Node.js 24+ · npm 11",
        "Инструменты frontend, управление пакетами и lock-файлы.",
      ],
      [
        "Docker Compose",
        "Запуск frontend, API, миграций, PostgreSQL и опциональной песочницы.",
      ],
      ["GitHub Actions", "Автоматические проверки и сборка в CI."],
      [
        "Git · Python venv · pip",
        "Контроль версий и изолированное окружение Python.",
      ],
    ],
  },
  {
    title: "Качество и тестирование",
    description: "Проверки логики, типов, интерфейса и доступности.",
    technologies: [
      ["Playwright", "Браузерные сценарии и проверки API-клиента."],
      ["axe-core", "Автоматические проверки доступности интерфейса."],
      [
        "pytest · pytest-asyncio · HTTPX",
        "Тестирование API и асинхронной логики.",
      ],
      ["SQLite · aiosqlite", "Изолированная база для быстрых API-тестов."],
      ["Mypy · Ruff", "Строгие типы, линтинг и форматирование Python."],
      [
        "ESLint 9 · eslint-config-next · Prettier",
        "Проверка и форматирование TypeScript и React.",
      ],
      ["React Compiler", "Оптимизация React-компонентов при сборке."],
      [
        "TypeScript Compiler API",
        "Проверка границ архитектуры FSD и циклических импортов.",
      ],
    ],
  },
];

export function StackPage() {
  return (
    <>
      <PageHeading
        eyebrow="PYTHON LAB / TECHNOLOGIES"
        title="Стек проекта"
        description="Технологии, на которых работает эта учебная платформа, и роль каждой из них."
      />
      <div className={styles.grid}>
        {groups.map((group) => (
          <section className={`panel ${styles.card}`} key={group.title}>
            <h2>{group.title}</h2>
            <p>{group.description}</p>
            <dl>
              {group.technologies.map(([name, description]) => (
                <div key={name}>
                  <dt className={styles.technologies}>
                    {name.split(" · ").map((technology) => {
                      const docs = documentation[technology];
                      if (!docs)
                        throw new Error(
                          `Missing documentation for ${technology}`,
                        );
                      return (
                        <a
                          className={styles.technology}
                          href={docs.href}
                          key={technology}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`Официальная документация ${technology} (откроется в новой вкладке)`}
                        >
                          <TechnologyIcon name={docs.icon} />
                          <span>{technology}</span>
                          <ArrowUpRight
                            className={styles.external}
                            size={13}
                            aria-hidden="true"
                          />
                        </a>
                      );
                    })}
                  </dt>
                  <dd>{description}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </>
  );
}
