import { createFileRoute, Link } from "@tanstack/react-router";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import { useState, type ElementType, type ReactNode } from "react";
import {
  Zap,
  Target,
  Lock,
  Settings,
  Palette,
  Package,
  Github,
  ArrowRight,
  Check,
  Copy,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-fd-background via-fd-background to-fd-secondary/20">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-1/4 top-0 h-[500px] w-[500px] animate-pulse rounded-full bg-fd-primary/5 blur-3xl" />
        <div className="absolute -right-1/4 top-1/4 h-[600px] w-[600px] animate-pulse rounded-full bg-fd-primary/5 blur-3xl delay-1000" />
      </div>

      <Header />

      <main className="relative">
        <Hero />
        <Features />
        <CodeShowcase />
        <CTA />
      </main>

      <Footer />
    </div>
  );
}

function Header() {
  const [scrolled, setScrolled] = useState(false);

  if (typeof window !== "undefined") {
    window.addEventListener("scroll", () => {
      setScrolled(window.scrollY > 50);
    });
  }

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-fd-border/60 bg-fd-background/80 shadow-sm backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link
            to="/"
            className="group flex items-center gap-2.5 transition-transform hover:scale-105"
          >
            <Logo className="h-6 w-6 transition-shadow group-hover:shadow-xl" />
            <span className="bg-gradient-to-r from-fd-foreground to-fd-foreground/70 bg-clip-text text-lg font-semibold text-transparent">
              Toolless
            </span>
          </Link>

          <div className="flex items-center gap-1">
            <a
              href="/docs"
              className="group relative overflow-hidden rounded-lg px-4 py-2 text-sm font-medium text-fd-muted-foreground transition-colors hover:text-fd-foreground"
            >
              <span className="relative z-10">Documentation</span>
              <div className="absolute inset-0 -translate-x-full rounded-lg bg-fd-accent transition-transform duration-300 group-hover:translate-x-0" />
            </a>

            <a
              href="https://github.com/habibthadev/toollessdb"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex h-10 w-10 items-center justify-center rounded-lg text-fd-muted-foreground transition-all hover:bg-fd-accent hover:text-fd-foreground hover:scale-110"
              aria-label="GitHub"
            >
              <Github className="h-5 w-5 transition-transform group-hover:rotate-12" />
            </a>

            <div className="ml-2">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative px-4 pb-20 pt-32 sm:px-6 sm:pb-32 sm:pt-40 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <div className="animate-fade-in-up mb-8 inline-flex items-center gap-2 rounded-full border border-fd-primary/20 bg-fd-primary/5 px-4 py-1.5 text-sm backdrop-blur-sm">
            <div className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </div>
            <span className="font-medium text-fd-foreground/80">Zero configuration database</span>
          </div>

          <h1 className="animate-fade-in-up animation-delay-100 mb-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            The database that
            <br />
            <span className="bg-gradient-to-r from-fd-primary via-fd-primary to-fd-primary/60 bg-clip-text text-transparent">
              lives in your files
            </span>
          </h1>

          <p className="animate-fade-in-up animation-delay-200 mx-auto mb-10 max-w-2xl text-base leading-relaxed text-fd-muted-foreground sm:text-lg md:text-xl">
            File-based document database with a familiar MongoDB API. No server, no config, just{" "}
            <span className="font-semibold text-fd-foreground">pure simplicity</span>.
          </p>

          <div className="animate-fade-in-up animation-delay-300 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="/docs"
              className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-xl bg-fd-primary px-8 font-medium text-fd-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl"
            >
              <span className="relative z-10">Get Started</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
            </a>

            <InstallCommand />
          </div>
        </div>
      </div>
    </section>
  );
}

function InstallCommand() {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (typeof navigator === "undefined") return;
    navigator.clipboard.writeText("npm install -g toollessdb");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      className="group flex items-center gap-3 rounded-xl border border-fd-border bg-fd-card px-4 py-3 shadow-sm transition-all hover:scale-105 hover:border-fd-primary/30 hover:shadow-md"
    >
      <span className="text-fd-muted-foreground/60">$</span>
      <code className="font-mono text-sm font-medium text-fd-foreground">
        npm install -g toollessdb
      </code>
      <div className="flex h-8 w-8 items-center justify-center rounded-md transition-colors group-hover:bg-fd-accent">
        {copied ? (
          <Check className="h-4 w-4 text-emerald-500" />
        ) : (
          <Copy className="h-4 w-4 text-fd-muted-foreground transition-colors group-hover:text-fd-foreground" />
        )}
      </div>
    </button>
  );
}

function Features() {
  const features = [
    {
      icon: Zap,
      title: "Zero Configuration",
      description:
        "No database server required. Data lives in readable files you can inspect, version, and backup.",
    },
    {
      icon: Target,
      title: "MongoDB Compatible",
      description:
        "Familiar API with the same methods, query operators, and patterns you already know and love.",
    },
    {
      icon: Lock,
      title: "TypeScript Native",
      description:
        "Full type safety with generics. Add Zod schema validation for bulletproof runtime checking.",
    },
    {
      icon: Settings,
      title: "Powerful CLI",
      description:
        "Query, insert, update from terminal. Export data, manage indexes, inspect your database.",
    },
    {
      icon: Palette,
      title: "Visual Studio",
      description:
        "Built-in web UI to browse and edit data. Launch with a single command, work visually.",
    },
    {
      icon: Package,
      title: "Git Friendly",
      description:
        "Plain JSON files mean easy diffs, merges, and complete version history for your data.",
    },
  ];

  return (
    <section className="relative px-4 py-20 sm:px-6 sm:py-32 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Built for <span className="text-fd-primary">developers</span>
          </h2>
          <p className="text-lg text-fd-muted-foreground">
            Everything you need, nothing you don't.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <FeatureCard key={i} {...feature} delay={i * 100} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  delay,
}: {
  icon: ElementType;
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-fd-border bg-fd-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-fd-primary/30 hover:shadow-xl"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-fd-primary/0 to-fd-primary/0 transition-all duration-300 group-hover:from-fd-primary/5 group-hover:to-transparent" />

      <div className="relative">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-fd-primary/10 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
          <Icon className="h-6 w-6 text-fd-primary" />
        </div>

        <h3 className="mb-2 font-semibold text-fd-foreground">{title}</h3>
        <p className="text-sm leading-relaxed text-fd-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function CodeShowcase() {
  return (
    <section className="relative px-4 py-20 sm:px-6 sm:py-32 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Start building in <span className="text-fd-primary">seconds</span>
          </h2>
          <p className="text-lg text-fd-muted-foreground">
            Three simple steps to your first database.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <Step number={1} title="Install" code="npm install toollessdb" language="bash" />
          <Step
            number={2}
            title="Connect"
            code={`import { createClient } from 'toollessdb';

const client = createClient({
  path: './data'
});`}
            language="typescript"
          />
          <Step
            number={3}
            title="Build"
            code={`const db = client.db('app');
const todos = db.collection('todos');

await todos.insertOne({
  text: 'Build something amazing',
  done: false
});`}
            language="typescript"
          />
        </div>

        <div className="mt-16">
          <FullExample />
        </div>
      </div>
    </section>
  );
}

function Step({
  number,
  title,
  code,
  language,
}: {
  number: number;
  title: string;
  code: string;
  language: string;
}) {
  return (
    <div className="group relative">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-fd-primary to-fd-primary/60 font-bold text-fd-primary-foreground shadow-lg transition-transform group-hover:scale-110">
          {number}
        </div>
        <h3 className="text-xl font-semibold">{title}</h3>
      </div>

      <SyntaxHighlightedCode code={code} language={language} compact />
    </div>
  );
}

function FullExample() {
  const code = `import { createClient } from 'toollessdb';

const client = createClient({ path: './data' });
const db = client.db('myapp');
const users = db.collection('users');

await users.insertOne({
  name: 'Alice',
  email: 'alice@example.com',
  role: 'admin'
});

const admins = await users
  .find({ role: 'admin' })
  .sort({ name: 1 })
  .toArray();

console.log(admins);
await client.close();`;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-fd-border bg-fd-card shadow-xl transition-all hover:border-fd-primary/30 hover:shadow-2xl">
      <div className="flex items-center justify-between border-b border-fd-border bg-fd-secondary/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500/80" />
            <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
            <div className="h-3 w-3 rounded-full bg-green-500/80" />
          </div>
          <span className="ml-3 font-mono text-xs text-fd-muted-foreground">app.ts</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-fd-muted-foreground">
          <span>TypeScript</span>
        </div>
      </div>
      <SyntaxHighlightedCode code={code} language="typescript" />
    </div>
  );
}

function SyntaxHighlightedCode({
  code,
  language,
  compact = false,
}: {
  code: string;
  language: string;
  compact?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-fd-border bg-fd-secondary shadow-sm">
      <div className="overflow-x-auto">
        <pre className={`${compact ? "p-3 text-xs" : "p-4 text-sm"} font-mono leading-relaxed`}>
          <code className="syntax-highlighted" data-lang={language}>
            {formatCode(code, language)}
          </code>
        </pre>
      </div>
    </div>
  );
}

function formatCode(code: string, language: string) {
  if (language === "bash") {
    return (
      <span className="text-syntax-text">
        {code.split(" ").map((word, i) => {
          if (word === "npm" || word === "install") {
            return (
              <span key={i} className="text-syntax-keyword">
                {word}{" "}
              </span>
            );
          }
          return <span key={i}>{word} </span>;
        })}
      </span>
    );
  }

  if (language === "typescript") {
    const lines = code.split("\n");
    return (
      <>
        {lines.map((line, i) => (
          <span key={i} className="block">
            {highlightTypeScriptLine(line)}
            {i < lines.length - 1 && "\n"}
          </span>
        ))}
      </>
    );
  }

  return code;
}

function highlightTypeScriptLine(line: string) {
  const keywords = ["import", "from", "const", "await", "async", "function"];
  const methods = [
    "createClient",
    "db",
    "collection",
    "insertOne",
    "find",
    "sort",
    "toArray",
    "log",
    "close",
  ];

  let result: ReactNode[] = [];
  let currentIndex = 0;

  const parts = line.split(/(\s+|[{}()[\];,.]|'[^']*'|"[^"]*")/);

  parts.forEach((part, idx) => {
    if (!part) return;

    if (part.startsWith("'") || part.startsWith('"')) {
      result.push(
        <span key={`${currentIndex}-${idx}`} className="text-syntax-string">
          {part}
        </span>
      );
    } else if (keywords.includes(part)) {
      result.push(
        <span key={`${currentIndex}-${idx}`} className="text-syntax-keyword">
          {part}
        </span>
      );
    } else if (methods.includes(part)) {
      result.push(
        <span key={`${currentIndex}-${idx}`} className="text-syntax-function">
          {part}
        </span>
      );
    } else if (part === "users" || part === "admins" || part === "client" || part === "db") {
      result.push(
        <span key={`${currentIndex}-${idx}`} className="text-syntax-variable">
          {part}
        </span>
      );
    } else if (/^[A-Z]/.test(part)) {
      result.push(
        <span key={`${currentIndex}-${idx}`} className="text-syntax-class">
          {part}
        </span>
      );
    } else if (part.match(/^\d+$/)) {
      result.push(
        <span key={`${currentIndex}-${idx}`} className="text-syntax-number">
          {part}
        </span>
      );
    } else {
      result.push(
        <span key={`${currentIndex}-${idx}`} className="text-syntax-text">
          {part}
        </span>
      );
    }
    currentIndex++;
  });

  return result;
}

function CTA() {
  return (
    <section className="relative px-4 py-20 sm:px-6 sm:py-32 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="relative overflow-hidden rounded-3xl border border-fd-border bg-gradient-to-br from-fd-card to-fd-secondary/50 p-12 text-center shadow-2xl sm:p-16">
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />

          <div className="relative">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to get started?
            </h2>
            <p className="mb-8 text-lg text-fd-muted-foreground">
              Read the docs and start building with Toolless today.
            </p>

            <a
              href="/docs"
              className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-xl bg-fd-primary px-8 font-medium text-fd-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl"
            >
              <span className="relative z-10">View Documentation</span>
              <ArrowRight className="relative z-10 ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="relative border-t border-fd-border/50 bg-fd-card/30 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex flex-col items-center gap-1 sm:items-start">
            <p className="text-sm text-fd-muted-foreground">
              Built with care for developers who value simplicity.
            </p>
            <p className="text-xs text-fd-muted-foreground/70">
              Created by{" "}
              <a
                href="https://github.com/habibthadev"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-fd-foreground/80 transition-colors hover:text-fd-primary"
              >
                Habib Adebayo
              </a>
            </p>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/habibthadev/toollessdb"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-fd-muted-foreground transition-colors hover:text-fd-foreground"
            >
              GitHub
            </a>
            <a
              href="/docs"
              className="text-sm text-fd-muted-foreground transition-colors hover:text-fd-foreground"
            >
              Documentation
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
