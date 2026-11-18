import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  BarChart3,
  Check,
  Code2,
  GitBranch,
  LockKeyhole,
  MessageSquareCode,
  Sparkles,
  ShieldCheck,
  Terminal,
  WandSparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Login } from './Login';

const capabilities = [
  [Code2, 'Read the whole codebase', 'Find the right symbols, files, and relationships before you make a change.'],
  [WandSparkles, 'Build with context', 'Generate code, tests, docs, and refactors that fit your existing system.'],
  [LockKeyhole, 'Ship with confidence', 'Review quality, security, and architecture before work reaches production.'],
] as const;

export const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const isLight = false;

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let targetY = window.scrollY;
    let frameId = 0;
    let isAnimating = false;

    const animateScroll = () => {
      const currentY = window.scrollY;
      const nextY = currentY + (targetY - currentY) * 0.1;

      window.scrollTo(0, nextY);
      if (Math.abs(targetY - nextY) > 0.5) {
        frameId = window.requestAnimationFrame(animateScroll);
      } else {
        window.scrollTo(0, targetY);
        isAnimating = false;
      }
    };

    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.deltaMode !== WheelEvent.DOM_DELTA_PIXEL) return;

      event.preventDefault();
      targetY = Math.max(
        0,
        Math.min(
          document.documentElement.scrollHeight - window.innerHeight,
          targetY + event.deltaY * 0.72,
        ),
      );

      if (!isAnimating) {
        isAnimating = true;
        frameId = window.requestAnimationFrame(animateScroll);
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  const start = () => {
    if (isAuthenticated) navigate('/sandbox');
    else setShowLogin(true);
  };

  return (
    <div className={`auron-smooth-page min-h-screen overflow-hidden transition-colors duration-500 ${isLight ? 'bg-[#f3f6fb] text-slate-950' : 'bg-[#070a12] text-white'}`}>
      <div className="pointer-events-none fixed inset-0">
        <div className={`auron-animated absolute -right-32 -top-40 h-[620px] w-[620px] rounded-full blur-[130px] [animation:auron-drift_16s_ease-in-out_infinite] ${isLight ? 'bg-blue-300/25' : 'bg-blue-700/20'}`} />
        <div className={`auron-animated absolute -bottom-48 -left-40 h-[520px] w-[520px] rounded-full blur-[140px] [animation:auron-drift-reverse_20s_ease-in-out_infinite] ${isLight ? 'bg-sky-300/20' : 'bg-cyan-950/30'}`} />
        <div className={`absolute inset-0 opacity-[0.12] [background-size:34px_34px] [mask-image:linear-gradient(to_bottom,black,transparent_72%)] ${isLight ? '[background-image:linear-gradient(rgba(30,64,175,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(30,64,175,0.12)_1px,transparent_1px)]' : '[background-image:linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)]'}`} />
      </div>

      <header className="auron-reveal auron-reveal-1 relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-7 lg:px-10">
        <button onClick={() => navigate('/')} className="group flex items-center gap-3">
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl border ${isLight ? 'border-blue-200 bg-white shadow-sm' : 'border-blue-300/20 bg-white/[0.06]'}`}>
            <img src="/auron-logo.png" alt="AURON" className="h-7 w-7 object-contain transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110" />
          </span>
          <span className={`text-sm font-bold tracking-[0.28em] ${isLight ? 'text-slate-900' : 'text-white'}`}>AURON</span>
        </button>
        <div className="flex items-center gap-3">
          <button onClick={start} className={`auron-button-sheen rounded-full border px-4 py-2.5 text-xs font-semibold transition hover:-translate-y-0.5 ${isLight ? 'border-slate-300 bg-white text-slate-800 hover:border-blue-400' : 'border-white/15 bg-white/[0.06] text-white hover:border-blue-300/50'}`}>
            {isAuthenticated ? 'Open workspace' : 'Sign in'} <ArrowUpRight className="ml-1 inline h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-20 lg:px-10">
        <section className="grid items-center gap-14 pb-24 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20 lg:pt-24">
          <div>
            <div className={`auron-reveal auron-reveal-2 mb-7 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${isLight ? 'border-blue-200 bg-white/80 text-blue-700' : 'border-blue-300/20 bg-blue-400/[0.08] text-blue-200'}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]" />
              Intelligence for software teams
            </div>
            <h1 className={`auron-reveal auron-reveal-3 max-w-3xl text-6xl font-semibold leading-[0.94] tracking-[-0.07em] sm:text-7xl lg:text-[92px] ${isLight ? 'text-slate-950' : 'text-white'}`}>
              <span className="auron-headline-shimmer block bg-gradient-to-r from-cyan-200 via-sky-300 to-blue-400 bg-clip-text text-transparent">Think beyond the code.</span>
            </h1>
            <p className={`auron-reveal auron-reveal-4 mt-8 max-w-xl text-base leading-7 sm:text-lg ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              AURON gives your team one clear place to understand, create, review, and improve software with the full codebase in context.
            </p>
            <div className="auron-reveal auron-reveal-4 mt-9 flex flex-wrap items-center gap-3">
              <button onClick={start} className="auron-button-sheen rounded-full bg-white px-6 py-3.5 text-sm font-bold text-slate-950 shadow-[0_0_35px_rgba(96,165,250,0.22)] transition hover:-translate-y-1 hover:bg-blue-50">
                Start building <ArrowUpRight className="ml-2 inline h-4 w-4" />
              </button>
              <a href="#capabilities" className={`rounded-full border px-6 py-3.5 text-sm font-semibold transition ${isLight ? 'border-slate-300 text-slate-700 hover:border-blue-400' : 'border-white/20 text-white/75 hover:border-blue-300/50 hover:text-white'}`}>
                Explore AURON
              </a>
            </div>
            <div className={`auron-reveal auron-reveal-5 mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              {['Repository-aware', 'Private by design', 'Built for teams'].map((item) => (
                <span key={item}><Check className="mr-1.5 inline h-3.5 w-3.5 text-emerald-400" />{item}</span>
              ))}
            </div>
          </div>

          <div className="auron-reveal auron-reveal-3 relative mx-auto flex min-h-[430px] w-full max-w-[500px] items-center justify-center">
            <div className="auron-bot-aura absolute left-1/2 top-1/2 aspect-square w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[70px] sm:w-[340px]" />
            <div className="auron-bot-turn relative aspect-square w-[300px] sm:w-[340px]">
              <div className="auron-bot-body absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_22%,#303438_0%,#111315_28%,#050505_62%,#000000_100%)] shadow-[inset_22px_18px_42px_rgba(255,255,255,0.12),inset_-30px_-32px_58px_rgba(0,0,0,0.95),0_26px_58px_rgba(8,145,178,0.24)]">
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(ellipse_at_28%_18%,rgba(255,255,255,0.14),transparent_18%),radial-gradient(ellipse_at_75%_78%,rgba(0,0,0,0.42),transparent_52%)]">
                  <span className="auron-bot-eye auron-bot-eye-left absolute left-[37%] top-[24%] h-[23%] w-[11%] rotate-[-18deg] rounded-full bg-[#fbfdff] shadow-[0_4px_10px_rgba(0,0,0,0.25)]" />
                  <span className="auron-bot-eye auron-bot-eye-right absolute left-[59%] top-[19%] h-[22%] w-[10%] rotate-[-14deg] rounded-full bg-[#fbfdff] shadow-[0_4px_10px_rgba(0,0,0,0.25)]" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="capabilities" className="grid gap-4 border-t border-white/[0.08] pt-10 sm:grid-cols-3">
          {capabilities.map(([Icon, title, text], index) => (
            <article key={title} className={`auron-reveal auron-reveal-${index + 3} rounded-2xl border p-6 transition hover:-translate-y-1 ${isLight ? 'border-slate-200 bg-white/75 hover:border-blue-300' : 'border-white/10 bg-white/[0.035] hover:border-blue-300/35 hover:bg-white/[0.06]'}`}>
              <Icon className="h-5 w-5 text-cyan-300" />
              <h2 className={`mt-8 text-base font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>{title}</h2>
              <p className={`mt-3 text-sm leading-6 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{text}</p>
            </article>
          ))}
        </section>

        <section className="py-28">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-300/80">One connected workspace</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              From first question to final commit.
            </h2>
            <p className="mt-5 text-sm leading-7 text-slate-400 sm:text-base">
              AURON brings the tools your team needs into one context-aware engineering loop.
              Less switching. Better decisions. More reliable software.
            </p>
          </div>

          <div className="mt-14 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="auron-reveal auron-liquid-glass rounded-3xl border border-white/10 p-6 sm:p-8">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-5">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">AURON workspace</p>
                  <h3 className="mt-2 text-lg font-semibold text-white">Everything connected to your codebase</h3>
                </div>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] text-emerald-300">● Live</span>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  [Terminal, 'Code Mode', 'Write, run, explain, and refactor in one focused surface.'],
                  [GitBranch, 'Project Intelligence', 'Explore repository structure, symbols, and health.'],
                  [MessageSquareCode, 'AI Chat', 'Ask grounded questions with project context attached.'],
                  [ShieldCheck, 'Quality & Security', 'Find risks early with practical, actionable analysis.'],
                ].map(([Icon, title, text]) => (
                  <div key={title as string} className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 transition hover:-translate-y-0.5 hover:border-cyan-300/30">
                    <Icon className="h-5 w-5 text-cyan-300" />
                    <h4 className="mt-5 text-sm font-semibold text-white">{title as string}</h4>
                    <p className="mt-2 text-xs leading-5 text-slate-400">{text as string}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-5">
              <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
                <BarChart3 className="h-5 w-5 text-cyan-300" />
                <p className="mt-6 text-3xl font-semibold text-white">94<span className="text-base text-slate-500">/100</span></p>
                <p className="mt-1 text-xs text-slate-400">Repository health visibility</p>
                <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[94%] rounded-full bg-gradient-to-r from-cyan-400 to-sky-400" />
                </div>
              </div>
              <div className="rounded-3xl border border-cyan-300/15 bg-cyan-400/[0.06] p-6">
                <Sparkles className="h-5 w-5 text-cyan-300" />
                <h3 className="mt-6 text-lg font-semibold text-white">Context before answers.</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  AURON grounds every workflow in your repository so suggestions are relevant, explainable, and ready to use.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/[0.08] py-24">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-300/80">A simpler workflow</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Make every engineering decision clearer.</h2>
              <p className="mt-5 text-sm leading-7 text-slate-400">
                Start with a repository, bring your questions, and let AURON keep the important context close at every step.
              </p>
            </div>
            <div className="space-y-4">
              {[
                ['01', 'Connect your repository', 'Upload a project or connect your source so AURON can map the codebase.'],
                ['02', 'Ask and create', 'Use grounded chat, code generation, tests, and refactoring tools together.'],
                ['03', 'Review before release', 'Inspect health, security, and quality signals before shipping changes.'],
              ].map(([number, title, text]) => (
                <div key={number} className="flex gap-5 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 transition hover:border-cyan-300/30">
                  <span className="font-mono text-xs text-cyan-300">{number}</span>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{title}</h3>
                    <p className="mt-1.5 text-xs leading-5 text-slate-400">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-28 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-300/80">Ready when you are</p>
          <h2 className="mx-auto mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-6xl">Build with the full picture.</h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-slate-400">
            Give your team a clearer way to understand software and move ideas into production.
          </p>
          <button onClick={start} className="auron-button-sheen mt-8 rounded-full bg-white px-7 py-4 text-sm font-bold text-slate-950 shadow-[0_0_35px_rgba(34,211,238,0.2)] transition hover:-translate-y-1 hover:bg-cyan-50">
            Start building with AURON <ArrowUpRight className="ml-2 inline h-4 w-4" />
          </button>
        </section>
      </main>

      <footer className={`relative z-10 border-t px-6 py-6 lg:px-10 ${isLight ? 'border-slate-200' : 'border-white/[0.08]'}`}>
        <div className={`mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
          <span className="font-semibold tracking-[0.25em]">AURON</span>
          <span>Understand more. Build better.</span>
          <span>© 2026 AURON Labs</span>
        </div>
      </footer>
      {showLogin && <Login embedded onClose={() => setShowLogin(false)} />}
    </div>
  );
};
