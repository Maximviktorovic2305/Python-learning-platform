import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Braces,
  Code2,
  Database,
  Layers3,
  Server,
  Terminal,
  Workflow,
  Check,
  ChevronDown,
} from "lucide-react";
import { Header } from "@/widgets/header";
import { PythonMark } from "@/widgets/python-mark";
import { ActionLink, Tag } from "@/shared/ui";
import { CodeBlock } from "@/shared/ui/code";

const stages = [
  "Programming & Python Fundamentals",
  "Control Flow & Collections",
  "Functions & Modules",
  "Object-Oriented Python",
  "Advanced Python",
  "Files, Data & Automation",
  "SQL & PostgreSQL",
  "SQLAlchemy",
  "FastAPI",
  "Testing & Quality",
  "Professional Architecture",
  "Production Python",
];
export function LandingPage() {
  return (
    <>
      <Header />
      <main id="main">
        <section className="landing-hero container">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="status-dot" />
              ОТ ПЕРВОЙ СТРОКИ ДО PRODUCTION
            </div>
            <h1>
              Не просто
              <br />
              изучай Python.
              <br />
              <span>
                Думай как
                <br />
                разработчик.
              </span>
            </h1>
            <p>
              Разберись в основах. Пиши настоящий код.
              <br />
              Создавай проекты, которыми хочется поделиться.
            </p>
            <div className="hero-buttons">
              <ActionLink href="/register">Начать свой путь</ActionLink>
              <Link href="/curriculum" className="text-link">
                Изучить программу <ArrowRight size={16} />
              </Link>
            </div>
            <div className="hero-footnote">
              <span>
                <Check size={14} />С нуля, без опыта
              </span>
              <span>
                <Check size={14} />В своём темпе
              </span>
              <span>
                <Check size={14} />
                Практика в каждой теме
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <PythonMark animated />
            <div className="hero-terminal">
              <div>
                <span className="terminal-dots">
                  <i />
                  <i />
                  <i />
                </span>
                <span>your_first_step.py</span>
                <Tag tone="green">RUNNING</Tag>
              </div>
              <code>
                <span className="syntax-comment">
                  # Большой путь начинается с одной строки
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
        <section className="metrics-strip">
          <div className="container metrics-inner">
            <div>
              <strong>12</strong>
              <span>уровней развития</span>
            </div>
            <div>
              <strong>120</strong>
              <span>задач в первых 3 уровнях</span>
            </div>
            <div>
              <strong>480</strong>
              <span>вопросов для закрепления</span>
            </div>
            <div>
              <strong>8</strong>
              <span>проектов в портфолио</span>
            </div>
          </div>
        </section>
        <section className="container section why-section">
          <div>
            <div className="eyebrow">01 / ЯЗЫК ВОЗМОЖНОСТЕЙ</div>
            <h2>
              Один язык.
              <br />
              Много направлений.
            </h2>
            <p>
              Python — точка входа в разработку и инструмент, с которым
              продолжают работать профессионалы.
            </p>
            <ActionLink href="/curriculum" secondary>
              Найти своё направление
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
                <h3>{name}</h3>
                <p>{desc}</p>
                <ArrowUpRight size={18} />
              </div>
            ))}
          </div>
        </section>
        <section className="section method-section" id="method">
          <div className="container">
            <div className="section-heading">
              <div>
                <div className="eyebrow">02 / УЧИСЬ ЧЕРЕЗ ДЕЙСТВИЕ</div>
                <h2>
                  Знания, которые
                  <br />
                  остаются с тобой.
                </h2>
              </div>
              <p>
                Читать недостаточно. Здесь каждая тема превращается в цикл:
                понять, попробовать, проверить, закрепить.
              </p>
            </div>
            <div className="method-grid">
              {[
                {
                  icon: Layers3,
                  title: "Разберись в идее",
                  desc: "Короткая теория, точные примеры и объяснение того, что происходит под капотом.",
                  tag: "THEORY",
                },
                {
                  icon: Code2,
                  title: "Напиши решение",
                  desc: "8 задач на тему: от первого уверенного шага до разбора сложных случаев.",
                  tag: "PRACTICE",
                },
                {
                  icon: Check,
                  title: "Проверь понимание",
                  desc: "Случайные вопросы, подробный разбор ошибок и рекомендации для повторения.",
                  tag: "REVIEW",
                },
              ].map(({ icon: Icon, title, desc, tag }, i) => (
                <article key={tag}>
                  <div className="method-top">
                    <Icon size={24} />
                    <span>0{i + 1}</span>
                  </div>
                  <Tag>{tag}</Tag>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="container section">
          <div className="section-heading">
            <div>
              <div className="eyebrow">03 / ПРОГРАММА ОБУЧЕНИЯ</div>
              <h2>
                От «что такое переменная?»
                <br />
                до «готово к production».
              </h2>
            </div>
            <ActionLink href="/curriculum" secondary>
              Вся программа
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
                  {String(i).padStart(2, "0")}
                </span>
                <span>
                  <small>
                    {i < 3
                      ? "ДОСТУПНО ДЛЯ ОБУЧЕНИЯ"
                      : "В ПРОГРАММЕ · МАТЕРИАЛЫ ГОТОВЯТСЯ"}
                  </small>
                  <strong>{name}</strong>
                </span>
                <ArrowUpRight size={19} />
              </Link>
            ))}
          </div>
        </section>
        <section className="lab-section section">
          <div className="container lab-grid">
            <div>
              <div className="eyebrow">04 / ТВОЯ PYTHON-ЛАБОРАТОРИЯ</div>
              <h2>
                Меньше переключений.
                <br />
                Больше кода.
              </h2>
              <p>
                Редактор, примеры и результат — рядом. Запускай Python прямо в
                браузере, пробуй идеи и разбирай ошибки в своём темпе.
              </p>
              <ul className="check-list">
                <li>
                  <Check size={16} />
                  Подсветка синтаксиса и номера строк
                </li>
                <li>
                  <Check size={16} />
                  Задачи трёх уровней сложности
                </li>
                <li>
                  <Check size={16} />
                  Подсказки, когда нужен следующий шаг
                </li>
              </ul>
              <ActionLink href="/learn/first-program">
                Открыть первый урок
              </ActionLink>
            </div>
            <div className="lab-example">
              <div className="lab-tabs">
                <span className="active">challenge.py</span>
                <span>Твоя первая функция</span>
                <Tag>PYTHON 3</Tag>
              </div>
              <CodeBlock
                title="challenge.py"
                code={
                  'def greet(name: str) -> str:\n    return f"Hello, {name}!"\n\nprint(greet("developer"))'
                }
              />
              <div className="lab-output">
                <span>OUTPUT</span>
                <code>Hello, developer!</code>
                <span className="green-text">
                  <Check size={14} />У тебя получится
                </span>
              </div>
            </div>
          </div>
        </section>
        <section className="container section projects-teaser">
          <div className="section-heading">
            <div>
              <div className="eyebrow">05 / КОД С РЕАЛЬНОЙ ЗАДАЧЕЙ</div>
              <h2>
                В портфолио — проекты.
                <br />В голове — система.
              </h2>
            </div>
            <p>
              Собери CLI-инструмент, API и итоговый продукт. У каждого проекта
              есть требования и критерии проверки.
            </p>
          </div>
          <div className="project-preview-grid">
            {[
              {
                icon: Terminal,
                name: "CLI Task Manager",
                tag: "FUNCTIONS / FILES",
                number: "01",
              },
              {
                icon: Server,
                name: "REST API",
                tag: "FASTAPI / POSTGRESQL",
                number: "03",
              },
              {
                icon: Layers3,
                name: "Production Capstone",
                tag: "ARCHITECTURE / DEPLOYMENT",
                number: "08",
              },
            ].map(({ icon: Icon, name, tag, number }) => (
              <Link href="/projects" key={name}>
                <span className="project-number">PROJECT {number}</span>
                <Icon size={37} />
                <h3>{name}</h3>
                <span>{tag}</span>
                <ArrowUpRight size={20} />
              </Link>
            ))}
          </div>
        </section>
        <section className="container section progress-pitch">
          <div>
            <div className="eyebrow">06 / ВИДЕТЬ СВОЙ РОСТ</div>
            <h2>
              Прогресс — это
              <br />
              каждый новый шаг.
            </h2>
            <p>
              XP, серии занятий и достижения помогают сохранять ритм. А
              результаты тестов подскажут, какие темы стоит повторить.
            </p>
          </div>
          <div className="progress-note">
            <span>LEARNING LOG</span>
            <div>
              <Check size={18} />
              <strong>Урок разобран</strong>
              <b>+20 XP</b>
            </div>
            <div>
              <Code2 size={18} />
              <strong>Задача решена</strong>
              <b>+30 XP</b>
            </div>
            <div>
              <Check size={18} />
              <strong>Тест пройден</strong>
              <b>+50 XP</b>
            </div>
            <p>Твой результат сохраняется в личном кабинете.</p>
          </div>
        </section>
        <section className="container section faq-section">
          <div>
            <div className="eyebrow">07 / ПЕРЕД ПЕРВЫМ ШАГОМ</div>
            <h2>Хорошие вопросы.</h2>
            <p>
              Отзывы появятся после первого набора учащихся. Сейчас лучшее
              знакомство с платформой — первый урок.
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
                a: "Уровни 0–2 наполнены и доступны. Для уровней 3–11 опубликована программа; материалы следующих этапов готовятся.",
              },
              {
                q: "Как проверяются практические задания?",
                a: "Локальный запуск показывает результат в браузере. Серверная проверка выполняет код в отдельном контейнере; она доступна при подключённом runner и выдаёт XP после прохождения тестов.",
              },
            ].map(({ q, a }) => (
              <details key={q}>
                <summary>
                  {q}
                  <ChevronDown size={18} />
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="final-cta">
          <div className="container">
            <div className="eyebrow">НАЧНИ С ОДНОЙ СТРОКИ</div>
            <h2>
              Твоя следующая версия
              <br />
              умеет писать на Python.
            </h2>
            <ActionLink href="/register">
              Начать обучение <ArrowRight size={17} />
            </ActionLink>
            <span>Без опыта. Без спешки. С пониманием.</span>
          </div>
        </section>
      </main>
      <footer className="footer container">
        <Link href="/" className="brand">
          python<span className="brand-light">/lab</span>
        </Link>
        <p>Учись. Экспериментируй. Создавай.</p>
        <div>
          <Link href="/curriculum">Программа</Link>
          <Link href="/projects">Проекты</Link>
          <Link href="/#method">Методика</Link>
        </div>
        <small>© {new Date().getFullYear()} Python Lab</small>
      </footer>
    </>
  );
}
