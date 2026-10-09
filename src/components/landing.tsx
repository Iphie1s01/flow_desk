"use client";
import { useEffect, useRef, useState } from "react";
import NextLink from "next/link";
import { Waves, ArrowRight, Check } from "lucide-react";

/* ─── Colour tokens (matching theme.ts) ─── */
const C = {
  bg: "#ece6d6",
  surface: "#f8f4e9",
  ink: "#14231c",
  mute: "#5f6d63",
  line: "#d3cbb4",
  accent: "#e8501a",
  side: "#12241c",
  ok: "#1f7a54",
};

/* ─── Animated counter ─── */
function Counter({
  target,
  suffix = "",
  duration = 1800,
}: {
  target: number;
  suffix?: string;
  duration?: number;
}) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setVal(Math.round(eased * target));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);
  return (
    <span ref={ref}>
      {val.toLocaleString()}
      {suffix}
    </span>
  );
}

/* ─── Ledger rule ─── */
function LedgerRule({ delay = 0 }: { delay?: number }) {
  return (
    <div
      style={{
        height: 1,
        background: C.line,
        transformOrigin: "left",
        animation: `ledger-draw 0.6s ease forwards`,
        animationDelay: `${delay}ms`,
        opacity: 0,
      }}
    />
  );
}

/* ─── Wave SVG decoration ─── */
function WaveDecor({ color = C.accent }: { color?: string }) {
  return (
    <svg width="48" height="16" viewBox="0 0 48 16" fill="none" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M0 8 Q6 0 12 8 Q18 16 24 8 Q30 0 36 8 Q42 16 48 8" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Scrolling ticker ─── */
const TICKERS = ["Customers", "Projects", "Tasks", "Invoices", "Payments", "Reports", "Team", "Activity", "Pipeline", "Workspace"];

function Ticker() {
  const items = [...TICKERS, ...TICKERS];
  return (
    <div style={{ overflow: "hidden", borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}`, background: C.side, padding: "10px 0" }}>
      <div style={{ display: "flex", gap: 0, animation: "ticker-scroll 28s linear infinite", width: "max-content" }}>
        {items.map((item, i) => (
          <span key={i} style={{ fontFamily: '"Martian Mono", monospace', fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "#93a398", padding: "0 32px", whiteSpace: "nowrap" as const, display: "flex", alignItems: "center", gap: 8 }}>
            {item}<span style={{ color: C.accent, opacity: 0.6 }}>◆</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Dashboard mock ─── */
function DashboardMock() {
  const bars = [65, 82, 58, 91, 74, 88, 62, 95, 70, 85];
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 8, overflow: "hidden", boxShadow: `0 4px 6px ${C.ink}08, 0 20px 60px ${C.ink}18`, fontFamily: '"Schibsted Grotesk", sans-serif' }}>
      {/* Chrome bar */}
      <div style={{ background: C.side, padding: "8px 16px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
          ))}
        </div>
        <div style={{ flex: 1, textAlign: "center" as const, fontFamily: '"Martian Mono", monospace', fontSize: 10, color: "#93a398", letterSpacing: "0.06em" }}>
          flowdesk.app/overview
        </div>
      </div>
      {/* Body */}
      <div style={{ display: "flex", height: 300 }}>
        {/* Sidebar */}
        <div style={{ width: 56, background: C.side, padding: "16px 0", display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 20, borderRight: `1px solid #26382e` }}>
          {["◈", "◉", "◻", "△", "○", "◇"].map((s, i) => (
            <div key={i} style={{ fontSize: 14, color: i === 0 ? C.accent : "#93a398", opacity: i === 0 ? 1 : 0.6 }}>{s}</div>
          ))}
        </div>
        {/* Content */}
        <div style={{ flex: 1, padding: 16, overflow: "hidden" }}>
          {/* Stats */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {[{ label: "Revenue", val: "$48,290", trend: "+12%" }, { label: "Invoices", val: "34", trend: "+5" }, { label: "Projects", val: "12", trend: "Active" }].map((s) => (
              <div key={s.label} style={{ flex: 1, background: C.bg, border: `1px solid ${C.line}`, borderRadius: 4, padding: "8px 10px" }}>
                <div style={{ fontFamily: '"Martian Mono", monospace', fontSize: 8, letterSpacing: "0.08em", color: C.mute, textTransform: "uppercase" as const, marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontFamily: '"Instrument Serif", serif', fontSize: 18, color: C.ink, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontFamily: '"Martian Mono", monospace', fontSize: 8, color: C.ok, marginTop: 2 }}>{s.trend}</div>
              </div>
            ))}
          </div>
          {/* Chart */}
          <div style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 4, padding: "12px 12px 8px" }}>
            <div style={{ fontFamily: '"Martian Mono", monospace', fontSize: 8, letterSpacing: "0.08em", color: C.mute, textTransform: "uppercase" as const, marginBottom: 8 }}>Revenue · Last 10 months</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80 }}>
              {bars.map((h, i) => (
                <div key={i} style={{ flex: 1, height: `${h}%`, background: i === 9 ? C.accent : i === bars.indexOf(Math.max(...bars)) ? C.ink : C.line, borderRadius: "2px 2px 0 0", animation: `bar-grow 0.4s ease forwards`, animationDelay: `${800 + i * 60}ms`, transform: "scaleY(0)", transformOrigin: "bottom" }} />
              ))}
            </div>
          </div>
          {/* Tasks */}
          <div style={{ marginTop: 12 }}>
            {[{ txt: "Send Q3 invoice to Acme Corp", done: true }, { txt: "Review Patel & Sons contract", done: true }, { txt: "Follow up: Meridian proposal", done: false }].map((t) => (
              <div key={t.txt} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: `1px solid ${C.line}` }}>
                <div style={{ width: 12, height: 12, border: `1.5px solid ${t.done ? C.ok : C.mute}`, borderRadius: 2, background: t.done ? C.ok : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {t.done && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </div>
                <span style={{ fontFamily: '"Schibsted Grotesk", sans-serif', fontSize: 10, color: t.done ? C.mute : C.ink, textDecoration: t.done ? "line-through" : "none" }}>{t.txt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Feature card ─── */
function FeatureCard({ icon, title, desc, index }: { icon: string; title: string; desc: string; index: number }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 6, padding: "28px 24px", opacity: 0, animation: `fade-up 0.55s ease forwards`, animationDelay: `${600 + index * 120}ms`, position: "relative" as const, overflow: "hidden", transition: "transform 0.2s ease, box-shadow 0.2s ease" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px ${C.ink}12`; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
    >
      {/* corner fold */}
      <div style={{ position: "absolute" as const, top: 0, right: 0, width: 0, height: 0, borderStyle: "solid", borderWidth: "0 24px 24px 0", borderColor: `transparent ${C.line} transparent transparent` }} />
      <div style={{ fontFamily: '"Martian Mono", monospace', fontSize: 22, marginBottom: 12, lineHeight: 1 }}>{icon}</div>
      <div style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: 20, color: C.ink, marginBottom: 6, fontWeight: 400, lineHeight: 1.2 }}>{title}</div>
      <div style={{ fontFamily: '"Schibsted Grotesk", "Helvetica Neue", sans-serif', fontSize: 14, color: C.mute, lineHeight: 1.6 }}>{desc}</div>
    </div>
  );
}

/* ─── Testimonial ─── */
function Testimonial({ quote, name, role, delay }: { quote: string; name: string; role: string; delay: number }) {
  return (
    <div style={{ background: "#13211a", border: `1px solid #26382e`, borderRadius: 6, padding: "28px 24px", opacity: 0, animation: `fade-up 0.55s ease forwards`, animationDelay: `${delay}ms` }}>
      <div style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: 52, color: C.accent, lineHeight: 0.7, marginBottom: 16, opacity: 0.4 }}>"</div>
      <p style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: 17, color: "#e9e4d3", lineHeight: 1.65, fontStyle: "italic", margin: "0 0 20px" }}>{quote}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 10, borderTop: `1px solid #26382e`, paddingTop: 16 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.side, border: `1px solid #26382e`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: '"Instrument Serif", serif', fontSize: 14, color: "#e9e4d3" }}>{name[0]}</div>
        <div>
          <div style={{ fontFamily: '"Schibsted Grotesk", sans-serif', fontSize: 13, fontWeight: 600, color: "#e9e4d3" }}>{name}</div>
          <div style={{ fontFamily: '"Martian Mono", monospace', fontSize: 10, color: "#93a398", letterSpacing: "0.04em" }}>{role}</div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   MAIN EXPORT
═══════════════════════════════════════════ */
export function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <style>{`
        @keyframes fade-up   { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fade-in   { from { opacity:0; } to { opacity:1; } }
        @keyframes ledger-draw { from { opacity:0; transform:scaleX(0); } to { opacity:1; transform:scaleX(1); } }
        @keyframes ticker-scroll { from { transform:translateX(0); } to { transform:translateX(-50%); } }
        @keyframes bar-grow  { from { transform:scaleY(0); } to { transform:scaleY(1); } }
        @keyframes float     { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-10px); } }
        @keyframes spin-slow { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @keyframes stroke-on { from { stroke-dashoffset:200; } to { stroke-dashoffset:0; } }

        *,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }

        .ld-btn {
          font-family:"Schibsted Grotesk","Helvetica Neue",sans-serif;
          font-size:14px; font-weight:600; border-radius:4px; cursor:pointer;
          text-decoration:none; transition:filter .15s,transform .15s,background .15s,color .15s;
          display:inline-flex; align-items:center; gap:6px; border:none;
        }
        .ld-btn:hover { filter:brightness(1.08); transform:translateY(-1px); }
        .ld-btn:active { filter:brightness(.95); transform:translateY(0); }
        .ld-primary { background:${C.accent}; color:#fff; padding:12px 24px; }
        .ld-outline { background:transparent; color:${C.ink}; border:1.5px solid ${C.ink}; padding:10.5px 22px; }
        .ld-outline:hover { background:${C.ink}; color:${C.bg}; }
        .ld-xl { font-size:15px; padding:15px 30px; }

        @media (max-width:900px) {
          .hero-grid { grid-template-columns:1fr !important; }
          .feature-grid { grid-template-columns:1fr 1fr !important; }
          .testi-grid { grid-template-columns:1fr !important; }
        }
        @media (max-width:600px) {
          .feature-grid { grid-template-columns:1fr !important; }
          .stats-grid   { grid-template-columns:1fr 1fr !important; }
          .nav-links    { display:none !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: C.bg, backgroundImage: `linear-gradient(${C.ink}06 1px, transparent 1px)`, backgroundSize: "100% 30px", color: C.ink }}>

        {/* ══ NAV ══ */}
        <nav style={{ position: "sticky", top: 0, zIndex: 100, background: scrolled ? `${C.surface}ee` : "transparent", backdropFilter: scrolled ? "blur(14px)" : "none", borderBottom: `1px solid ${scrolled ? C.line : "transparent"}`, transition: "background .3s,border-color .3s", padding: "0 24px" }}>
          <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", alignItems: "center", height: 60, gap: 32 }}>
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: '"Instrument Serif",Georgia,serif', fontSize: 22, color: C.accent, animation: "fade-in .5s ease forwards", opacity: 0, animationDelay: "0ms" }}>
              <Waves size={20} />FlowDesk
            </div>
            {/* Links */}
            <div className="nav-links" style={{ display: "flex", gap: 24, flex: 1 }}>
              {["Features", "Pricing", "About"].map((l, i) => (
                <a key={l} href={`#${l.toLowerCase()}`} style={{ fontFamily: '"Schibsted Grotesk",sans-serif', fontSize: 13, color: C.mute, textDecoration: "none", fontWeight: 500, opacity: 0, animation: `fade-in .4s ease forwards`, animationDelay: `${100 + i * 80}ms`, transition: "color .15s" }}
                  onMouseEnter={(e) => ((e.target as HTMLElement).style.color = C.ink)}
                  onMouseLeave={(e) => ((e.target as HTMLElement).style.color = C.mute)}
                >{l}</a>
              ))}
            </div>
            {/* CTA */}
            <div style={{ display: "flex", gap: 10, opacity: 0, animation: "fade-in .4s ease forwards", animationDelay: "350ms" }}>
              <NextLink href="/login" className="ld-btn ld-outline" style={{ fontSize: 13, padding: "8px 16px" }}>Log in</NextLink>
              <NextLink href="/signup" className="ld-btn ld-primary" style={{ fontSize: 13, padding: "8px 16px" }}>Get started <ArrowRight size={13} /></NextLink>
            </div>
          </div>
        </nav>

        {/* ══ HERO ══ */}
        <section style={{ maxWidth: 1120, margin: "0 auto", padding: "76px 24px 60px" }}>
          {/* Eyebrow badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${C.accent}15`, border: `1px solid ${C.accent}30`, borderRadius: 40, padding: "4px 14px", marginBottom: 32, opacity: 0, animation: "fade-in .5s ease forwards", animationDelay: "80ms" }}>
            <WaveDecor />
            <span style={{ fontFamily: '"Martian Mono",monospace', fontSize: 11, color: C.accent, letterSpacing: "0.09em", textTransform: "uppercase" as const }}>Your business. In sync.</span>
          </div>

          <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 72, alignItems: "start" }}>
            {/* Left */}
            <div>
              <LedgerRule delay={200} />
              <h1 style={{ fontFamily: '"Instrument Serif",Georgia,serif', fontSize: "clamp(46px,5.5vw,78px)", fontWeight: 400, lineHeight: 1.0, color: C.ink, margin: "16px 0", opacity: 0, animation: "fade-up .7s ease forwards", animationDelay: "250ms" }}>
                Every number.<br />
                Every client.<br />
                <em style={{ color: C.accent }}>One desk.</em>
              </h1>
              <LedgerRule delay={500} />
              <p style={{ fontFamily: '"Schibsted Grotesk","Helvetica Neue",sans-serif', fontSize: 17, color: C.mute, lineHeight: 1.75, margin: "24px 0 36px", maxWidth: 400, opacity: 0, animation: "fade-up .6s ease forwards", animationDelay: "400ms" }}>
                Customers, projects, tasks, and invoices — linked, live, and searchable. Built for small teams who move fast and bill accurately.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" as const, opacity: 0, animation: "fade-up .6s ease forwards", animationDelay: "550ms" }}>
                <NextLink href="/signup" className="ld-btn ld-primary ld-xl">Get started free <ArrowRight size={16} /></NextLink>
                <NextLink href="/login" className="ld-btn ld-outline ld-xl">Log in</NextLink>
              </div>
              {/* Trust line */}
              <div style={{ marginTop: 32, display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" as const, opacity: 0, animation: "fade-in .5s ease forwards", animationDelay: "750ms" }}>
                {["No credit card required", "14-day free trial", "Cancel anytime"].map((t) => (
                  <span key={t} style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: '"Schibsted Grotesk",sans-serif', fontSize: 13, color: C.mute }}>
                    <Check size={13} style={{ color: C.ok, flexShrink: 0 }} />{t}
                  </span>
                ))}
              </div>
            </div>

            {/* Right — floating mockup */}
            <div style={{ opacity: 0, animation: "fade-up .7s ease forwards, float 5.5s ease-in-out 1.8s infinite", animationDelay: "600ms, 0ms" }}>
              <DashboardMock />
            </div>
          </div>
        </section>

        {/* ══ TICKER ══ */}
        <Ticker />

        {/* ══ STATS ══ */}
        <section style={{ padding: "72px 24px" }}>
          <div style={{ maxWidth: 1120, margin: "0 auto" }}>
            <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", background: C.surface, border: `1px solid ${C.line}`, borderRadius: 6, overflow: "hidden" }}>
              {[
                { label: "Businesses trust FlowDesk", value: 3200, suffix: "+" },
                { label: "Invoices processed", value: 180000, suffix: "+" },
                { label: "Hours saved monthly", value: 12000, suffix: "+" },
                { label: "Uptime guarantee", value: 999, suffix: "/1000" },
              ].map((s, i) => (
                <div key={s.label} style={{ padding: "40px 28px", borderRight: i < 3 ? `1px solid ${C.line}` : undefined }}>
                  <div style={{ fontFamily: '"Instrument Serif",Georgia,serif', fontSize: "clamp(32px,2.8vw,50px)", color: C.ink, lineHeight: 1, marginBottom: 6 }}>
                    <Counter target={s.value} suffix={s.suffix} duration={1600} />
                  </div>
                  <div style={{ fontFamily: '"Martian Mono",monospace', fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: C.mute }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ FEATURES ══ */}
        <section id="features" style={{ padding: "60px 24px 80px" }}>
          <div style={{ maxWidth: 1120, margin: "0 auto" }}>
            <div style={{ marginBottom: 48, maxWidth: 520 }}>
              <div style={{ fontFamily: '"Martian Mono",monospace', fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: C.accent, marginBottom: 12 }}>What's in the desk</div>
              <h2 style={{ fontFamily: '"Instrument Serif",Georgia,serif', fontSize: "clamp(30px,3.5vw,46px)", fontWeight: 400, color: C.ink, lineHeight: 1.15 }}>
                Everything a small business<br />needs. Nothing it doesn't.
              </h2>
            </div>
            <div className="feature-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
              {[
                { icon: "◉", title: "Customer Ledger", desc: "A single source of truth for every contact, deal, and conversation. Never lose track of a client again.", index: 0 },
                { icon: "△", title: "Project Tracking", desc: "Kanban boards and timelines that link directly to invoices. See scope, progress, and billing in one view.", index: 1 },
                { icon: "◻", title: "Task Management", desc: "Assign, prioritise, and track tasks across projects and team members with deadline alerts built in.", index: 2 },
                { icon: "◈", title: "Invoicing & Payments", desc: "Professional invoices in seconds. Track payment status, send reminders, and reconcile with ease.", index: 3 },
                { icon: "◇", title: "Financial Reports", desc: "Revenue trends, outstanding amounts, and pipeline forecasts. Export to CSV for your accountant.", index: 4 },
                { icon: "○", title: "Team & Workspace", desc: "Role-based permissions, team activity feeds, and multi-workspace support for agencies and consultants.", index: 5 },
              ].map((f) => <FeatureCard key={f.title} {...f} />)}
            </div>
          </div>
        </section>

        {/* ══ DIAGONAL → DARK ══ */}
        <div style={{ position: "relative", height: 72, overflow: "hidden" }}>
          <svg viewBox="0 0 1440 72" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
            <polygon points="0,72 1440,0 1440,72" fill={C.side} />
          </svg>
        </div>

        {/* ══ TESTIMONIALS (dark) ══ */}
        <section style={{ background: C.side, padding: "72px 24px 80px" }}>
          <div style={{ maxWidth: 1120, margin: "0 auto" }}>
            <div style={{ marginBottom: 48 }}>
              <div style={{ fontFamily: '"Martian Mono",monospace', fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: C.accent, marginBottom: 12 }}>Straight from the ledger</div>
              <h2 style={{ fontFamily: '"Instrument Serif",Georgia,serif', fontSize: "clamp(26px,3vw,40px)", fontWeight: 400, color: "#e9e4d3", lineHeight: 1.2 }}>Teams who run on FlowDesk.</h2>
            </div>
            <div className="testi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
              <Testimonial quote="Chasing invoices used to eat half my Fridays. Now FlowDesk sends reminders automatically and I actually close my laptop at 5." name="Sarah Okonkwo" role="Founder · Bright Arc Studio" delay={200} />
              <Testimonial quote="The link between projects and invoices is the killer feature. I bill by milestone and it all clicks together without spreadsheets." name="James Portman" role="Director · Portman Consulting" delay={320} />
              <Testimonial quote="Our small team looks professional — clients get clean invoices and can track their projects. They love it, and so do we." name="Mei Liu" role="Partner · Liu & Ferreira Architects" delay={440} />
            </div>
          </div>
        </section>

        {/* ══ DIAGONAL → LIGHT ══ */}
        <div style={{ position: "relative", height: 72, overflow: "hidden", background: C.bg }}>
          <svg viewBox="0 0 1440 72" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
            <polygon points="0,0 1440,0 0,72" fill={C.side} />
          </svg>
        </div>

        {/* ══ FINAL CTA ══ */}
        <section style={{ padding: "80px 24px 100px", textAlign: "center" as const }}>
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            {/* Spinning ornament */}
            <div style={{ width: 52, height: 52, border: `2px solid ${C.accent}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px", animation: "spin-slow 14s linear infinite" }}>
              <Waves size={20} color={C.accent} />
            </div>
            <h2 style={{ fontFamily: '"Instrument Serif",Georgia,serif', fontSize: "clamp(36px,5vw,60px)", fontWeight: 400, color: C.ink, lineHeight: 1.08, marginBottom: 20 }}>
              Open the desk.<br /><em style={{ color: C.accent }}>Start today.</em>
            </h2>
            <p style={{ fontFamily: '"Schibsted Grotesk",sans-serif', fontSize: 16, color: C.mute, lineHeight: 1.75, marginBottom: 36, maxWidth: 440, margin: "0 auto 36px" }}>
              No setup fees. No per-seat pricing surprises. Just a clean workspace for your whole business from day one.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" as const }}>
              <NextLink href="/signup" className="ld-btn ld-primary ld-xl">Get started free <ArrowRight size={16} /></NextLink>
              <NextLink href="/login" className="ld-btn ld-outline ld-xl">Log in</NextLink>
            </div>
          </div>
        </section>

        {/* ══ FOOTER ══ */}
        <footer style={{ borderTop: `1px solid ${C.line}`, padding: "24px 24px", background: C.surface }}>
          <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: '"Instrument Serif",Georgia,serif', fontSize: 18, color: C.accent }}>
              <Waves size={16} />FlowDesk
            </div>
            <div style={{ fontFamily: '"Martian Mono",monospace', fontSize: 10, letterSpacing: "0.08em", color: C.mute }}>
              © {new Date().getFullYear()} FlowDesk · Your business. In sync.
            </div>
            <div style={{ display: "flex", gap: 20 }}>
              {["Privacy", "Terms", "Contact"].map((l) => (
                <a key={l} href="#" style={{ fontFamily: '"Schibsted Grotesk",sans-serif', fontSize: 12, color: C.mute, textDecoration: "none", transition: "color .15s" }}
                  onMouseEnter={(e) => ((e.target as HTMLElement).style.color = C.ink)}
                  onMouseLeave={(e) => ((e.target as HTMLElement).style.color = C.mute)}
                >{l}</a>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
