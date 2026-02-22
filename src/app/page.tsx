"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════
   SCROLL PROGRESS BAR
═══════════════════════════════════════════════════════════════ */
function ScrollProgressBar() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const update = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setP(max > 0 ? (el.scrollTop / max) * 100 : 0);
    };
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-[2px] bg-white/5 pointer-events-none">
      <div
        className="h-full transition-[width] duration-75"
        style={{
          width: `${p}%`,
          background: "linear-gradient(90deg, #4F8EF7, #a78bfa, #4F8EF7)",
          backgroundSize: "200% 100%",
        }}
      />
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   3-D GLOBE CANVAS
   Fibonacci sphere + back-face culling + mouse tilt
═══════════════════════════════════════════════════════════════ */
function GlobeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let size = 0;

    const resize = () => {
      const s = Math.min(canvas.offsetWidth, canvas.offsetHeight);
      size = s;
      canvas.width = s * window.devicePixelRatio;
      canvas.height = s * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const onMouse = (e: MouseEvent) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      };
    };
    window.addEventListener("mousemove", onMouse);

    /* fibonacci sphere points */
    const N = 220;
    const φ = (1 + Math.sqrt(5)) / 2;
    const pts = Array.from({ length: N }, (_, i) => {
      const θ = (2 * Math.PI * i) / φ;
      const φp = Math.acos(1 - (2 * (i + 0.5)) / N);
      return {
        x: Math.sin(φp) * Math.cos(θ),
        y: Math.sin(φp) * Math.sin(θ),
        z: Math.cos(φp),
      };
    });

    let rotY = 0;
    let frame: number;

    const rotY3 = (p: { x: number; y: number; z: number }, a: number) => {
      const c = Math.cos(a), s = Math.sin(a);
      return { x: p.x * c - p.z * s, y: p.y, z: p.x * s + p.z * c };
    };
    const rotX3 = (p: { x: number; y: number; z: number }, a: number) => {
      const c = Math.cos(a), s = Math.sin(a);
      return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
    };

    const draw = () => {
      const s = size;
      ctx.clearRect(0, 0, s, s);

      rotY += 0.004;
      const ry = rotY + mouseRef.current.x * 0.55;
      const rx = mouseRef.current.y * 0.35;

      const r = s * 0.37;
      const cx = s * 0.5;
      const cy = s * 0.5;

      const projected = pts.map((p) => {
        const q = rotX3(rotY3(p, ry), rx);
        return {
          sx: cx + q.x * r,
          sy: cy + q.y * r,
          z: q.z,
        };
      });

      /* connections */
      const maxD = r * 0.55;
      for (let a = 0; a < N; a++) {
        if (projected[a].z < -0.05) continue;
        const pa = projected[a];
        for (let b = a + 1; b < N; b++) {
          if (projected[b].z < -0.05) continue;
          const pb = projected[b];
          const dx = pa.sx - pb.sx;
          const dy = pa.sy - pb.sy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < maxD) {
            const depthA = (pa.z + 1) / 2;
            const depthB = (pb.z + 1) / 2;
            const depth = (depthA + depthB) / 2;
            const alpha = ((1 - d / maxD) * depth * 0.65).toFixed(2);
            ctx.beginPath();
            ctx.moveTo(pa.sx, pa.sy);
            ctx.lineTo(pb.sx, pb.sy);
            ctx.strokeStyle = `rgba(79,142,247,${alpha})`;
            ctx.lineWidth = 0.65;
            ctx.stroke();
          }
        }
      }

      /* dots — sorted by z for painters algorithm */
      const sorted = [...projected].sort((a, b) => a.z - b.z);
      for (const p of sorted) {
        if (p.z < -0.4) continue;
        const depth = (p.z + 1) / 2;
        const dotR = 0.8 + depth * 2.2;
        const alpha = (0.25 + depth * 0.75).toFixed(2);

        /* glow halo */
        const g = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, dotR * 4);
        g.addColorStop(0, `rgba(79,142,247,${(depth * 0.5).toFixed(2)})`);
        g.addColorStop(1, "rgba(79,142,247,0)");
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, dotR * 4, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();

        /* core dot */
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, dotR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(160,210,255,${alpha})`;
        ctx.fill();
      }

      frame = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener("mousemove", onMouse);
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}

/* ═══════════════════════════════════════════════════════════════
   MAGNETIC BUTTON
═══════════════════════════════════════════════════════════════ */
function MagneticButton({
  children,
  className = "",
  onClick,
  type = "button",
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const rect = useRef<DOMRect | null>(null);

  const onEnter = () => {
    rect.current = ref.current?.getBoundingClientRect() ?? null;
    if (ref.current) ref.current.style.transition = "transform 0.1s linear";
  };
  const onMove = (e: React.MouseEvent) => {
    if (!ref.current || !rect.current) return;
    const x = e.clientX - rect.current.left - rect.current.width / 2;
    const y = e.clientY - rect.current.top - rect.current.height / 2;
    ref.current.style.transform = `translate(${x * 0.38}px, ${y * 0.38}px) scale(1.06)`;
  };
  const onLeave = () => {
    if (!ref.current) return;
    ref.current.style.transition =
      "transform 0.55s cubic-bezier(0.22,1,0.36,1)";
    ref.current.style.transform = "translate(0,0) scale(1)";
  };

  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={className}
    >
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   3-D TILT CARD
═══════════════════════════════════════════════════════════════ */
function TiltCard({
  children,
  className = "",
  strength = 12,
}: {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = useCallback(
    (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(900px) rotateY(${x * strength}deg) rotateX(${-y * strength}deg) scale3d(1.04,1.04,1.04)`;
    },
    [strength]
  );

  const onLeave = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.transition =
      "transform 0.6s cubic-bezier(0.22,1,0.36,1), box-shadow 0.4s ease";
    ref.current.style.transform =
      "perspective(900px) rotateY(0deg) rotateX(0deg) scale3d(1,1,1)";
    setTimeout(() => {
      if (ref.current) ref.current.style.transition = "";
    }, 600);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [onMove, onLeave]);

  return (
    <div ref={ref} className={`tilt-card relative rounded-2xl ${className}`}>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   useReveal — IntersectionObserver scroll trigger
═══════════════════════════════════════════════════════════════ */
function useReveal(margin = "-70px") {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add("visible");
          obs.disconnect();
        }
      },
      { rootMargin: margin }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [margin]);
  return ref;
}

/* ═══════════════════════════════════════════════════════════════
   ICONS
═══════════════════════════════════════════════════════════════ */
function IconInbox() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4F8EF7" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4F8EF7" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4F8EF7" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NAVBAR
═══════════════════════════════════════════════════════════════ */
function Navbar() {
  return (
    <nav className="anim-navbar fixed top-0 left-0 right-0 z-50 flex items-center justify-between
                    px-6 md:px-12 py-4 border-b border-white/[0.06]
                    bg-[#0a0a0a]/75 backdrop-blur-xl">
      <span className="text-white font-semibold text-xl tracking-tight select-none">
        Client<span className="text-[#4F8EF7]">Brain</span>
      </span>
      <MagneticButton
        onClick={() => document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" })}
        className="magnetic-btn-primary px-4 py-2 rounded-lg bg-[#4F8EF7] text-white text-sm font-medium
                   hover:bg-[#6ba3ff] active:scale-95 transition-colors duration-200 cursor-pointer"
      >
        Join Waitlist
      </MagneticButton>
    </nav>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HERO
═══════════════════════════════════════════════════════════════ */
function Hero() {
  const [email, setEmail] = useState("");
  const heroRef = useRef<HTMLElement>(null);

  /* scroll-driven parallax on hero content */
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const content = el.querySelector<HTMLElement>(".hero-content");
    const onScroll = () => {
      const y = window.scrollY;
      if (content) {
        content.style.transform = `translateY(${y * 0.22}px)`;
        content.style.opacity = `${Math.max(0, 1 - y / 500)}`;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Waitlist email:", email);
    setEmail("");
  };

  return (
    <section
      ref={heroRef}
      id="waitlist"
      className="relative flex flex-col items-center justify-center min-h-screen
                 px-6 pt-24 pb-0 text-center overflow-hidden"
    >
      {/* Subtle ambient blobs */}
      <div className="orb-a pointer-events-none absolute top-[12%] left-[6%] w-56 h-56 rounded-full bg-[#4F8EF7]/10 blur-[80px]" />
      <div className="orb-b pointer-events-none absolute top-[20%] right-[8%] w-72 h-72 rounded-full bg-indigo-500/8 blur-[100px]" />

      {/* Content */}
      <div className="hero-content relative z-10 flex flex-col items-center will-change-transform">
        {/* Badge */}
        <div className="anim-badge mb-8 inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                        border border-[#4F8EF7]/30 bg-[#4F8EF7]/10 text-[#4F8EF7] text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4F8EF7] animate-pulse" />
          Now accepting early access
        </div>

        {/* Headline */}
        <h1 className="anim-h1 max-w-4xl text-4xl sm:text-5xl md:text-6xl lg:text-7xl
                       font-bold text-white leading-[1.08] tracking-tight">
          Know exactly where every client stands.{" "}
          <span
            style={{
              backgroundImage: "linear-gradient(135deg, #4F8EF7 0%, #a78bfa 60%, #4F8EF7 100%)",
              backgroundSize: "200% 100%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animation: "shimmer-line 4s linear infinite",
            }}
          >
            Every morning.
          </span>
        </h1>

        {/* Subtext */}
        <p className="anim-sub mt-6 max-w-xl text-base sm:text-lg text-white/48 leading-relaxed">
          ClientBrain connects your Gmail and Slack and sends you a daily AI
          briefing — organized by client. No more digging.
        </p>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="anim-form mt-10 flex flex-col sm:flex-row gap-3 w-full max-w-md"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="flex-1 px-4 py-3 rounded-lg bg-white/[0.06] border border-white/10 text-white
                       placeholder-white/25 text-sm outline-none
                       focus:border-[#4F8EF7]/50 focus:shadow-[0_0_0_3px_rgba(79,142,247,0.12)]
                       transition-all duration-200"
          />
          <MagneticButton
            type="submit"
            className="magnetic-btn-primary px-6 py-3 rounded-lg bg-[#4F8EF7] text-white text-sm font-medium
                       hover:bg-[#6ba3ff] active:scale-95 transition-colors duration-200 cursor-pointer whitespace-nowrap"
          >
            Join Waitlist
          </MagneticButton>
        </form>

        <p className="anim-hint mt-4 text-xs text-white/22">
          No spam. Unsubscribe anytime.
        </p>
      </div>

      {/* 3-D Globe */}
      <div className="anim-globe relative mt-12 w-full max-w-2xl mx-auto" style={{ height: "clamp(320px,45vw,520px)" }}>
        {/* Gradient fade at top and bottom of globe */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 z-10"
          style={{ background: "linear-gradient(to bottom, #0a0a0a, transparent)" }} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 z-10"
          style={{ background: "linear-gradient(to top, #0a0a0a, transparent)" }} />
        <GlobeCanvas />
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PROBLEM
═══════════════════════════════════════════════════════════════ */
function Problem() {
  const titleRef = useReveal();
  const cardsRef = useReveal("-50px");

  const items = [
    { n: "01", text: "You spend Monday mornings reconstructing what's happening with each client." },
    { n: "02", text: "Important messages get buried across Slack threads and email chains." },
    { n: "03", text: "You forget to follow up because nothing tells you what needs attention." },
  ];

  return (
    <section id="problem" className="py-28 px-6 md:px-12 max-w-6xl mx-auto">
      <div ref={titleRef} className="reveal mb-16 text-center">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight">
          Sound familiar?
        </h2>
      </div>

      <div ref={cardsRef} className="reveal-group grid grid-cols-1 md:grid-cols-3 gap-5">
        {items.map((item) => (
          <TiltCard
            key={item.n}
            className="border border-white/[0.07] bg-white/[0.03]
                       hover:border-[#4F8EF7]/25 hover:bg-white/[0.055] p-8"
          >
            <span className="text-[11px] font-mono tracking-[0.2em] text-[#4F8EF7]/45 mb-5 block uppercase">
              {item.n}
            </span>
            <p className="text-white/65 text-base leading-relaxed">{item.text}</p>
          </TiltCard>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HOW IT WORKS — animated SVG connector
═══════════════════════════════════════════════════════════════ */
function HowItWorks() {
  const titleRef = useReveal();
  const stepsRef = useReveal("-50px");
  const lineRef = useRef<SVGPathElement>(null);

  /* Draw the SVG path when steps become visible */
  useEffect(() => {
    const stepsEl = stepsRef.current;
    if (!stepsEl) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && lineRef.current) {
          lineRef.current.classList.add("drawn");
          obs.disconnect();
        }
      },
      { rootMargin: "-50px" }
    );
    obs.observe(stepsEl);
    return () => obs.disconnect();
  }, [stepsRef]);

  const steps = [
    { n: "1", title: "Connect Gmail & Slack", desc: "Link your accounts in seconds. We only read what's needed — privacy first." },
    { n: "2", title: "We organize everything by client", desc: "Our AI maps every message, thread, and email to the right client automatically." },
    { n: "3", title: "Wake up to your daily briefing", desc: "Every morning, a crisp summary lands in your inbox before you start the day." },
  ];

  return (
    <section id="how-it-works" className="py-28 px-6 md:px-12 max-w-6xl mx-auto">
      <div ref={titleRef} className="reveal mb-16 text-center">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight">
          Simple by design.
        </h2>
      </div>

      <div className="relative">
        {/* Animated SVG connector (desktop only) */}
        <div className="hidden md:block absolute top-7 left-0 right-0 pointer-events-none h-1 overflow-visible">
          <svg
            className="absolute inset-0 w-full"
            style={{ height: 2, overflow: "visible" }}
            viewBox="0 0 100 1"
            preserveAspectRatio="none"
          >
            <path
              ref={lineRef}
              d="M17 0.5 Q50 0.5 83 0.5"
              fill="none"
              stroke="url(#lineGrad)"
              strokeWidth="0.5"
              className="path-draw"
            />
            <defs>
              <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(79,142,247,0)" />
                <stop offset="30%" stopColor="rgba(79,142,247,0.5)" />
                <stop offset="70%" stopColor="rgba(79,142,247,0.5)" />
                <stop offset="100%" stopColor="rgba(79,142,247,0)" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div
          ref={stepsRef}
          className="reveal-group flex flex-col md:flex-row gap-10 md:gap-0"
        >
          {steps.map((s, i) => (
            <div key={i} className="flex flex-col items-center text-center md:flex-1 px-4 md:px-10">
              <div
                className="step-ring w-14 h-14 rounded-full border border-[#4F8EF7]/40
                           bg-[#4F8EF7]/10 flex items-center justify-center
                           text-[#4F8EF7] font-bold text-lg mb-6 z-10
                           hover:bg-[#4F8EF7]/25 hover:border-[#4F8EF7]
                           transition-all duration-300 cursor-default"
                style={{ animationDelay: `${i * 0.9}s` }}
              >
                {s.n}
              </div>
              <h3 className="text-white font-semibold text-lg mb-3">{s.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FEATURES
═══════════════════════════════════════════════════════════════ */
function Features() {
  const titleRef = useReveal();
  const cardsRef = useReveal("-50px");

  const features = [
    {
      icon: <IconInbox />,
      title: "Client-organized inbox",
      desc: "See all communication per client, not per tool. Gmail and Slack, unified.",
    },
    {
      icon: <IconClock />,
      title: "Daily AI briefing",
      desc: "Every morning, know exactly what needs your attention before you open a single app.",
    },
    {
      icon: <IconSearch />,
      title: "Natural language search",
      desc: "Ask anything. Get answers in seconds. No boolean queries, no filters.",
    },
  ];

  return (
    <section id="features" className="py-28 px-6 md:px-12 max-w-6xl mx-auto">
      <div ref={titleRef} className="reveal mb-16 text-center">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight">
          Everything you need,{" "}
          <span className="text-white/30">nothing you don&apos;t.</span>
        </h2>
      </div>

      <div ref={cardsRef} className="reveal-group grid grid-cols-1 md:grid-cols-3 gap-5">
        {features.map((f, i) => (
          <TiltCard
            key={i}
            className="group border border-white/[0.07] bg-white/[0.03]
                       hover:border-[#4F8EF7]/25 hover:bg-white/[0.055] p-8"
          >
            <div className="mb-5 w-12 h-12 rounded-xl bg-[#4F8EF7]/10 flex items-center justify-center
                            group-hover:bg-[#4F8EF7]/22 group-hover:scale-110
                            transition-all duration-300">
              {f.icon}
            </div>
            <h3 className="text-white font-semibold text-[15px] mb-3">{f.title}</h3>
            <p className="text-white/42 text-sm leading-relaxed">{f.desc}</p>
          </TiltCard>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PRICING
═══════════════════════════════════════════════════════════════ */
function Pricing() {
  const titleRef = useReveal();
  const cardsRef = useReveal("-50px");

  const plans = [
    {
      name: "Solo",
      price: "$29",
      highlight: false,
      features: ["1 user", "Gmail + Slack", "Daily briefing", "Natural language search"],
    },
    {
      name: "Team",
      price: "$79",
      highlight: true,
      features: ["Up to 5 users", "Everything in Solo", "Shared client workspace", "Priority support"],
    },
  ];

  return (
    <section id="pricing" className="py-28 px-6 md:px-12 max-w-6xl mx-auto">
      <div ref={titleRef} className="reveal mb-16 text-center">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight">
          Simple pricing.
        </h2>
        <p className="mt-4 text-white/35 text-sm">No annual lock-in. Cancel anytime.</p>
      </div>

      <div ref={cardsRef} className="reveal-group grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto">
        {plans.map((plan) => (
          <TiltCard
            key={plan.name}
            strength={8}
            className={`p-8 ${
              plan.highlight
                ? "border-2 border-[#4F8EF7]/55 bg-[#4F8EF7]/[0.055]"
                : "border border-white/[0.07] bg-white/[0.03]"
            }`}
          >
            {plan.highlight && (
              <span className="inline-block mb-4 px-3 py-1 rounded-full bg-[#4F8EF7]/18 text-[#4F8EF7] text-xs font-medium tracking-wide">
                Most popular
              </span>
            )}
            <h3 className="text-white font-semibold text-xl mb-1">{plan.name}</h3>
            <div className="flex items-end gap-1 mb-6">
              <span className="text-4xl font-bold text-white">{plan.price}</span>
              <span className="text-white/32 text-sm mb-1.5">/month</span>
            </div>
            <ul className="space-y-3 mb-8">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-white/55">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="8" fill="#4F8EF7" fillOpacity="0.14" />
                    <path d="M5 8l2 2 4-4" stroke="#4F8EF7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <MagneticButton
              onClick={() => document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" })}
              className={`w-full py-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer
                ${plan.highlight
                  ? "magnetic-btn-primary bg-[#4F8EF7] text-white hover:bg-[#6ba3ff]"
                  : "bg-white/[0.07] text-white hover:bg-white/[0.12]"
                }`}
            >
              Join Waitlist
            </MagneticButton>
          </TiltCard>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FOOTER
═══════════════════════════════════════════════════════════════ */
function Footer() {
  const ref = useReveal("-10px");
  return (
    <footer className="border-t border-white/[0.06] py-8 px-6 md:px-12">
      <div ref={ref} className="reveal max-w-6xl mx-auto flex flex-col md:flex-row
                                items-center justify-between gap-4 text-sm">
        <span className="text-white font-medium">
          Client<span className="text-[#4F8EF7]">Brain</span>
        </span>
        <span className="text-white/22 text-xs">Built by Michele Glorioso</span>
        <span className="text-white/22 text-xs">© 2025 ClientBrain</span>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DIVIDER
═══════════════════════════════════════════════════════════════ */
function Divider() {
  return (
    <div className="max-w-6xl mx-auto px-6 md:px-12">
      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════ */
export default function Home() {
  return (
    <div className="relative min-h-screen bg-[#0a0a0a] font-[var(--font-inter)] text-white overflow-x-hidden">
      <ScrollProgressBar />

      <Navbar />
      <Hero />
      <Divider />
      <Problem />
      <Divider />
      <HowItWorks />
      <Divider />
      <Features />
      <Divider />
      <Pricing />
      <Footer />
    </div>
  );
}
