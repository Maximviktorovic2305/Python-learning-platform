"use client";
import { useI18n } from "@/shared/i18n";
import { AuthorSupport } from "@/shared/ui/author-support";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Braces,
  Database,
  Server,
  Workflow,
  Check,
  ChevronDown,
} from "lucide-react";
import { Header } from "@/widgets/header";
import { HeroPythonGif, LandingSnake } from "@/widgets/landing-snake";
import { LegalLinks } from "@/shared/ui/legal";
import { ActionLink, Tag } from "@/shared/ui";
import { CodeBlock } from "@/shared/ui/code";

const stages = [
  "Введение",
  "Основы Python",
  "Python на практике",
  "Продвинутый Python",
];
export function LandingPage() {
  const { text: localize } = useI18n();

  return (
    <LandingSnake>
      <Header />
      <main id="main">
        <section className="landing-hero container" id="landing-hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="status-dot" />
              {localize(" ОТ ПЕРВОЙ СТРОКИ ДО PRODUCTION ")}
            </div>
            <h1>
              {localize("Курс по Python ")}
              <br />
              <span>
                {localize("абсолютно ")}
                <br />
                {localize(" бесплатно! ")}
              </span>
            </h1>
            <p>
              {localize(" Разберись в основах. Пиши настоящий код. ")}
              <br />
              {localize(" Создавай проекты, которыми хочется поделиться. ")}
            </p>
            <div className="hero-buttons">
              <ActionLink href="/register">
                {localize("Начать свой путь")}
              </ActionLink>
              <Link href="/curriculum" className="text-link">
                {localize(" Изучить программу ")}
                <ArrowRight size={16} />
              </Link>
            </div>
            <div className="hero-footnote">
              <span>
                <Check size={14} />
                {localize("С нуля, без опыта ")}
              </span>
              <span>
                <Check size={14} />
                {localize("В своём темпе ")}
              </span>
              <span>
                <Check size={14} />
                {localize(" Практика в каждой теме ")}
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <HeroPythonGif />
            <div className="hero-terminal">
              <div>
                <span className="terminal-dots">
                  <i />
                  <i />
                  <i />
                </span>
                <span>your_first_step.py</span>
                <Tag tone="green">{localize("Выполняется")}</Tag>
              </div>
              <code>
                <span className="syntax-comment">
                  {localize(" # Большой путь начинается с одной строки ")}
                </span>
                <br />
                <span className="syntax-keyword">print</span>(
                <span className="syntax-string">
                  &quot;Hello, future developer!&quot;
                </span>
                )
              </code>
              <p>
                <span>›</span> Hello, future developer!
                <span className="cursor" />
              </p>
            </div>
          </div>
        </section>
        <section className="metrics-strip" id="landing-metrics">
          <div className="container metrics-inner">
            <div>
              <strong>4</strong>
              <span>{localize("раздела курса")}</span>
            </div>
            <div>
              <strong>100</strong>
              <span>{localize("практических заданий")}</span>
            </div>
            <div>
              <strong>960</strong>
              <span>{localize("вопросов для закрепления")}</span>
            </div>
            <div>
              <strong>50</strong>
              <span>{localize("тем с примерами")}</span>
            </div>
          </div>
        </section>
        <section className="container section why-section">
          <div>
            <div className="eyebrow">{localize("01 / ЯЗЫК ВОЗМОЖНОСТЕЙ")}</div>
            <h2>
              {localize(" Один язык. ")}
              <br />
              {localize(" Много направлений. ")}
            </h2>
            <p>
              {localize(
                " Python — точка входа в разработку и инструмент, с которым продолжают работать профессионалы. ",
              )}
            </p>
            <ActionLink href="/curriculum" secondary>
              {localize(" Найти своё направление ")}
            </ActionLink>
          </div>
          <div className="directions">
            {[
              {
                icon: Server,
                name: "Backend & API",
                desc: "Сервисы, которым можно доверять",
              },
              {
                icon: Database,
                name: "Data & Analytics",
                desc: "Превращай данные в решения",
              },
              {
                icon: Workflow,
                name: "Automation",
                desc: "Освободи время от рутины",
              },
              {
                icon: Braces,
                name: "Engineering",
                desc: "Строй системы, которые растут",
              },
            ].map(({ icon: Icon, name, desc }, i) => (
              <div key={name}>
                <span className="direction-number">0{i + 1}</span>
                <Icon size={24} />
                <h3>{localize(name)}</h3>
                <p>{localize(desc)}</p>
                <ArrowUpRight size={18} />
              </div>
            ))}
          </div>
        </section>
        <section className="container section">
          <div className="section-heading">
            <div>
              <div className="eyebrow">
                {localize("02 / ПРОГРАММА ОБУЧЕНИЯ")}
              </div>
              <h2>
                {localize(" От «что такое переменная?» ")}
                <br />
                {localize(" до «готово к production». ")}
              </h2>
            </div>
            <ActionLink href="/curriculum" secondary>
              {localize(" Вся программа ")}
            </ActionLink>
          </div>
          <div className="roadmap">
            {stages.map((name, i) => (
              <Link
                href={`/curriculum#level-${i}`}
                key={name}
                className={i < 3 ? "available" : ""}
              >
                <span className="roadmap-index">
                  {localize(String(i).padStart(2, "0"))}
                </span>
                <span>
                  <small>
                    {localize(
                      i < 3
                        ? "ДОСТУПНО ДЛЯ ОБУЧЕНИЯ"
                        : "В ПРОГРАММЕ · МАТЕРИАЛЫ ГОТОВЯТСЯ",
                    )}
                  </small>
                  <strong>{localize(name)}</strong>
                </span>
                <ArrowUpRight size={19} />
              </Link>
            ))}
          </div>
        </section>
        <section className="lab-section section">
          <div className="container lab-grid">
            <div>
              <div className="eyebrow">
                {localize("03 / ТВОЯ PYTHON-ЛАБОРАТОРИЯ")}
              </div>
              <h2>
                {localize(" Меньше переключений. ")}
                <br />
                {localize(" Больше кода. ")}
              </h2>
              <p>
                {localize(
                  " Редактор, примеры и результат — рядом. Запускай Python прямо в браузере, пробуй идеи и разбирай ошибки в своём темпе. ",
                )}
              </p>
              <ul className="check-list">
                <li>
                  <Check size={16} />
                  {localize(" Подсветка синтаксиса и номера строк ")}
                </li>
                <li>
                  <Check size={16} />
                  {localize(" Задачи трёх уровней сложности ")}
                </li>
                <li>
                  <Check size={16} />
                  {localize(" Подсказки, когда нужен следующий шаг ")}
                </li>
              </ul>
              <ActionLink href="/learn/academy-introduction">
                {localize(" Открыть первый урок ")}
              </ActionLink>
            </div>
            <div className="lab-example">
              <div className="lab-tabs">
                <span className="active">challenge.py</span>
                <span>{localize("Твоя первая функция")}</span>
                <Tag>PYTHON 3</Tag>
              </div>
              <CodeBlock
                title="challenge.py"
                code={
                  'def greet(name: str) -> str:\n    return f"Hello, {name}!"\n\nprint(greet("developer"))'
                }
              />
              <div className="lab-output">
                <span>{localize("Результат")}</span>
                <code>Hello, developer!</code>
                <span className="green-text">
                  <Check size={14} />
                  {localize("У тебя получится ")}
                </span>
              </div>
            </div>
          </div>
        </section>
        <section className="container section faq-section">
          <div>
            <div className="eyebrow">{localize("04 / ПЕРЕД ПЕРВЫМ ШАГОМ")}</div>
            <h2>{localize("Хорошие вопросы.")}</h2>
            <p>
              {localize(
                " Отзывы появятся после первого набора учащихся. Сейчас лучшее знакомство с платформой — первый урок. ",
              )}
            </p>
          </div>
          <div>
            {[
              {
                q: "Нужен ли опыт программирования?",
                a: "Нет. Начинаем с установки Python, терминала и первой программы. Все основы разобраны в первых трёх уровнях.",
              },
              {
                q: "Нужно ли устанавливать Python?",
                a: "Для упражнений в браузере установка не нужна. Для локальных проектов курс объясняет установку интерпретатора и виртуальных окружений.",
              },
              {
                q: "Можно ли учиться в своём темпе?",
                a: "Да. Уроки доступны без расписания. Кабинет сохраняет завершённые задания и помогает вернуться к следующему шагу.",
              },
              {
                q: "Весь курс уже доступен?",
                a: "Все четыре раздела доступны: 50 тем с теорией и разборами кода, практикой и тестами.",
              },
              {
                q: "Как проверяются практические задания?",
                a: "Локальный запуск показывает результат в браузере. Серверная проверка выполняет код в отдельном контейнере; она доступна при подключённом runner и выдаёт XP после прохождения тестов.",
              },
            ].map(({ q, a }) => (
              <details key={q}>
                <summary>
                  {localize(q)}
                  <ChevronDown size={18} />
                </summary>
                <p>{localize(a)}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="final-cta">
          <div className="container">
            <div className="eyebrow">{localize("НАЧНИ С ОДНОЙ СТРОКИ")}</div>
            <h2>
              {localize(" Твоя следующая версия ")}
              <br />
              {localize(" умеет писать на Python. ")}
            </h2>
            <ActionLink href="/register">
              {localize(" Начать обучение ")}
              <ArrowRight size={17} />
            </ActionLink>
            <span>{localize("Без опыта. Без спешки. С пониманием.")}</span>
          </div>
        </section>
      </main>
      <footer className="footer container">
        <Link href="/" className="brand">
          python<span className="brand-light">/lab</span>
        </Link>
        <p>{localize("Учись. Экспериментируй. Создавай.")}</p>
        <div>
          <Link href="/curriculum">{localize("Программа")}</Link>
          <Link href="/projects">{localize("Проекты")}</Link>
        </div>
        <small>© {new Date().getFullYear()} Python Lab</small>
        <AuthorSupport />
        <LegalLinks />
      </footer>
    </LandingSnake>
  );
}
