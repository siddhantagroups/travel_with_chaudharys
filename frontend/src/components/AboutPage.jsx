import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ShieldCheck, Wrench, Cpu, Phone, ArrowRight, ArrowDown } from 'lucide-react';

/* ------------------------------------------------------------------ *
 * Scroll choreography
 * ------------------------------------------------------------------ *
 * One IntersectionObserver drives every entrance on the page. Elements
 * opt in with data-reveal (plus an optional data-delay); the observer
 * adds .is-in once and unobserves, so nothing re-animates on scroll-up
 * and there is no scroll listener doing layout work per frame.
 * ------------------------------------------------------------------ */
function useReveal() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let pending = Array.from(document.querySelectorAll('[data-reveal]'));

    if (reduce) {
      pending.forEach((n) => n.classList.add('is-in'));
      return;
    }

    // Deliberately rect-based rather than IntersectionObserver: an observer that
    // never delivers a callback (backgrounded or non-compositing tab) would leave
    // the whole page sitting at opacity 0. Measuring on scroll always resolves.
    let raf = 0;

    // Two thresholds, because the first paint and later scrolling want opposite
    // things. On load anything near the fold must already be visible, or the
    // strip under the hero reads as an empty page. Once the visitor is scrolling,
    // a generous threshold means the entrance finishes above the fold and is over
    // before it is looked at — so from then on an element only starts animating
    // once it has genuinely come into view.
    let firstSweep = true;

    const sweep = () => {
      raf = 0;
      const limit = window.innerHeight * (firstSweep ? 1.15 : 0.85);
      const still = [];
      pending.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < limit && r.bottom > 0) {
          const delay = Number(el.dataset.delay || 0);
          if (delay) setTimeout(() => el.classList.add('is-in'), delay);
          else el.classList.add('is-in');
        } else {
          still.push(el);
        }
      });
      pending = still;
      firstSweep = false;
      if (!pending.length) detach();
    };

    const schedule = () => { if (!raf) raf = requestAnimationFrame(sweep); };

    const detach = () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    sweep();

    return () => { detach(); if (raf) cancelAnimationFrame(raf); };
  }, []);
}

/* Counts up once the strip scrolls into view. Parses the trailing +/% so
   "5,000+" animates the number and keeps its suffix. */
function Counter({ value, duration = 1400 }) {
  const [display, setDisplay] = useState('0');
  const ref = useRef(null);
  const done = useRef(false);

  const run = useCallback(() => {
    const target = parseInt(value.replace(/[^0-9]/g, ''), 10);
    const suffix = value.replace(/[0-9,]/g, '');
    if (!target) { setDisplay(value); return; }

    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const n = Math.round(target * eased);
      setDisplay(n.toLocaleString('en-IN') + suffix);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value, duration]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value);
      return;
    }

    let raf = 0;
    const check = () => {
      raf = 0;
      if (done.current) return;
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 1.05 && r.bottom > 0) {
        done.current = true;
        window.removeEventListener('scroll', schedule);
        run();
      }
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(check); };

    window.addEventListener('scroll', schedule, { passive: true });
    check();

    return () => { window.removeEventListener('scroll', schedule); if (raf) cancelAnimationFrame(raf); };
  }, [run, value]);

  return <span ref={ref}>{display}</span>;
}

const leaders = [
  {
    index: '01',
    name: 'Dalbir Singh',
    role: 'Managing Director',
    photo: '/team-dalbir-singh.webp',
    w: 900, h: 1349,
    phone: '+91 70822 52200',
    phoneHref: 'tel:+917082252200',
    side: 'right',
    pull: 'A bus is a promise. Somebody’s child, somebody’s shift, somebody’s livelihood is riding on it.',
    body: [
      'Dalbir Singh founded Travel With Chaudharys with his brother in 2000, on the Kalka–Pinjor road. Every route on the board today was driven by him first, timed by him, and negotiated by him before it was ever offered to a school or a factory.',
      'He leads the contract side of the business — the schools, the industrial shuttles, the long-standing relationships across Baddi and Parwanoo. Principals and transport managers have his personal number, and he still takes the call himself when a bus is running late.',
    ],
    tags: ['Contracts & Partnerships', 'Route Planning'],
  },
  {
    index: '02',
    name: 'Daljeet Singh',
    role: 'Managing Director',
    photo: '/team-daljeet-singh.webp',
    w: 900, h: 1144,
    side: 'left',
    pull: 'Safety happens in the workshop. Not on paper — on the ramp, every single week.',
    body: [
      'Daljeet Singh built the company alongside his brother and runs everything behind the wheel: the fleet, the workshop, the drivers, and the maintenance discipline that keeps thirty-plus vehicles on the road at the same time.',
      'He hires and trains every driver personally, and holds the line on the things that are easy to skip — pre-trip checks, service intervals, cabin cleaning after each run, and the background verification behind every uniform on our buses.',
    ],
    tags: ['Fleet & Maintenance', 'Driver Training'],
  },
  {
    index: '03',
    name: 'Aditya Singh',
    role: 'Co-Founder',
    photo: '/team-aditya-singh.webp',
    w: 900, h: 923,
    phone: '+91 87080 60565',
    phoneHref: 'tel:+918708060565',
    side: 'right',
    pull: 'In this business the paperwork is the promise. A permit that lapses is a route that stops.',
    body: [
      'Aditya Singh is a son of the founders and a lawyer by profession. He carries the legal and regulatory weight of the company — permits, fitness certificates, insurance, school transport compliance and the contracts behind every institutional agreement.',
      'It is work most passengers never see, and the reason a Travel With Chaudharys vehicle is never the one held up at a check post. He brings that same rigour to the terms we sign with schools and industrial clients, so both sides know exactly what has been agreed.',
    ],
    tags: ['Legal & Compliance', 'Contracts & Permits'],
  },
  {
    index: '04',
    name: 'Prajwal Singh',
    role: 'Management & Technology',
    photo: '/team-prajwal-singh.webp',
    w: 879, h: 1035,
    phone: '+91 70150 96142',
    phoneHref: 'tel:+917015096142',
    side: 'left',
    pull: 'The buses were always good. People just had no way of seeing that before they booked one.',
    body: [
      'Prajwal Singh is the youngest of the family and a software engineer. He is the reason the company exists online at all — he took a business run on phone calls, paper diaries and word of mouth, and built it a presence people can actually find.',
      'He handles the website, the booking system and the digital side of operations, turning the family’s traditional way of working into something simpler for everyone: a parent checking a route, a school comparing quotes, or an office manager booking a staff shuttle without a single phone call.',
    ],
    tags: ['Technology & Web', 'Digital Operations'],
  },
];

const values = [
  {
    icon: <ShieldCheck size={20} />,
    kicker: 'Safety',
    title: 'Not a feature. The baseline.',
    text: 'CCTV in every cabin, GPS on every vehicle, background-verified drivers. Not because a contract asks — because children ride with us every morning.',
  },
  {
    icon: <Wrench size={20} />,
    kicker: 'Ownership',
    title: 'Owned, never outsourced.',
    text: 'Our own fleet, our own workshop, our own drivers. No brokered vehicles and no unknown faces on the morning of a school run.',
  },
  {
    icon: <Cpu size={20} />,
    kicker: 'Technology',
    title: 'Old discipline, new tools.',
    text: 'Two decades of route knowledge, now backed by live tracking and digital records any parent or transport manager can verify.',
  },
];

const stats = [
  { value: '50+', label: 'Routes daily' },
  { value: '5,000+', label: 'Commuters daily' },
  { value: '30+', label: 'Contract vehicles' },
  { value: '100%', label: 'On-time record' },
];

export default function AboutPage({ onNavigateHome }) {
  useReveal();

  // Cheap parallax: one rAF-throttled scroll read writing CSS vars. The hero
  // drifts against the page from the top; the quote band is measured relative to
  // its own position so the coach glides through the frame as it passes.
  const heroRef = useRef(null);
  const quoteRef = useRef(null);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const hero = heroRef.current;
        if (hero) {
          const y = Math.min(window.scrollY, 700);
          hero.style.setProperty('--par', `${y * 0.28}px`);
          hero.style.setProperty('--fade', String(Math.max(0, 1 - y / 520)));
        }
        const quote = quoteRef.current;
        if (quote) {
          const r = quote.getBoundingClientRect();
          if (r.bottom > 0 && r.top < window.innerHeight) {
            // 0 when the band is centred in the viewport, -1/+1 at either edge.
            const vpCentre = window.innerHeight / 2;
            const bandCentre = r.top + r.height / 2;
            const range = (window.innerHeight + r.height) / 2;
            const progress = Math.max(-1, Math.min(1, (vpCentre - bandCentre) / range));
            quote.style.setProperty('--qpar', `${progress * 46}px`);
          }
        }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div className="about-page-scale bg-white overflow-x-clip">
      <style>{`
        [data-reveal]{
          opacity:0;
          transform:translate3d(0,30px,0);
          transition:opacity 1.15s cubic-bezier(.16,1,.3,1), transform 1.15s cubic-bezier(.16,1,.3,1);
          will-change:opacity,transform;
        }
        /* Longer travel on the side entrances — this is the leadership zig-zag,
           where the movement is the point and needs to be legible at a slow scroll. */
        [data-reveal="left"]{ transform:translate3d(-70px,0,0); }
        [data-reveal="right"]{ transform:translate3d(70px,0,0); }
        [data-reveal="scale"]{ transform:scale(.94); }
        [data-reveal].is-in{ opacity:1; transform:none; }

        /* Hairline that draws itself in */
        .rule-draw{ transform:scaleX(0); transform-origin:left; transition:transform 1s cubic-bezier(.16,1,.3,1); }
        [data-reveal].is-in .rule-draw, .rule-draw.is-in{ transform:scaleX(1); }

        .hero-par{ transform:translate3d(0,var(--par,0),0) scale(1.06); }
        .hero-copy{ opacity:var(--fade,1); }

        /* index.css already renders desktop at zoom .9. This nests a second .9
           across the whole About page (=> .81 overall), which is what it looks
           like with the browser itself at 90% — the framing that fits the
           headline and all four stats on one screen. Phones are untouched.
           Navbar and footer sit outside this component and deliberately keep
           the site-wide scale so the chrome stays consistent between pages. */
        @media (min-width: 768px){
          .about-page-scale{ zoom: .9; }
        }
        /* The -28px is a fixed lift on top of the parallax offset: it raises the
           road so the convoy sits in the clear gap above the pillar panel rather
           than directly behind its top edge. */
        .quote-par{ transform:translate3d(0,calc(var(--qpar,0px) - 28px),0) scale(1.12); }

        .float-slow{ animation:floatY 7s ease-in-out infinite; }
        @keyframes floatY{ 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }

        .scroll-cue{ animation:cueY 2s ease-in-out infinite; }
        @keyframes cueY{ 0%,100%{transform:translateY(0);opacity:.55} 50%{transform:translateY(7px);opacity:1} }

        @media (prefers-reduced-motion: reduce){
          [data-reveal]{opacity:1;transform:none;transition:none}
          .hero-par,.quote-par{transform:none}
          .float-slow,.scroll-cue{animation:none}
          .rule-draw{transform:none}
        }
      `}</style>

      {/* ================= HERO =================
          The photograph is bright and mostly open sky, so this hero is light
          rather than dark: the type sits directly on the sky in brand navy and
          the image dissolves into the white page instead of being boxed in. */}
      <section ref={heroRef} className="relative bg-white">
        <div className="relative min-h-[600px] sm:min-h-[860px] overflow-hidden">
          {/* The poster is a still of frame one, so the first paint is already the
              right image — the video swaps in with nothing flashing or shifting.
              The file is encoded with +faststart (moov atom at the front), so the
              browser can begin decoding the moment the first bytes land instead of
              waiting for the whole download. */}
          <video
            className="hero-par absolute inset-0 w-full h-full object-cover object-[58%_38%]"
            src="/about-hero.mp4"
            poster="/about-hero-poster.webp"
            autoPlay
            muted
            playsInline
            preload="auto"
            tabIndex={-1}
            disablePictureInPicture
            aria-label="Travel With Chaudharys coaches on the open highway"
          />

          {/* veil across the sky so navy type stays crisp, clearing before the road */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(180deg, rgba(255,255,255,.93) 0%, rgba(255,255,255,.82) 26%, rgba(255,255,255,.42) 46%, rgba(255,255,255,0) 66%)' }}
            aria-hidden="true"
          />
          {/* dissolve the frame into the page — no hard photo edge */}
          <div className="absolute inset-x-0 bottom-0 h-64 sm:h-80" style={{ background: 'linear-gradient(to top, #ffffff 12%, rgba(255,255,255,.75) 42%, rgba(255,255,255,0) 100%)' }} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 w-32 sm:w-56" style={{ background: 'linear-gradient(to right, rgba(255,255,255,.9), rgba(255,255,255,0))' }} aria-hidden="true" />

          <div className="hero-copy relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 pt-28 sm:pt-40">
            <div className="max-w-4xl">
              <div data-reveal className="flex items-center gap-3 mb-7 sm:mb-9">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-accent" />
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.34em] text-brand-steel">
                  Our Story &mdash; On the road since 2000
                </span>
              </div>

              <h1 className="font-black tracking-[-0.045em] text-brand-navy text-[2.75rem] leading-[0.95] sm:text-7xl lg:text-[5.4rem]">
                <span data-reveal data-delay="60" className="block">Two brothers.</span>
                <span data-reveal data-delay="170" className="block">One bus.</span>
                <span data-reveal data-delay="280" className="block text-brand-steel">A road they never left.</span>
              </h1>

              <p data-reveal data-delay="430" className="mt-8 sm:mt-10 max-w-xl text-sm sm:text-lg text-slate-600 font-medium leading-relaxed">
                What began as a single bus is now a fleet moving thousands of students and industrial
                staff across Haryana and Himachal every day &mdash; on vehicles we own, with drivers we
                trained ourselves.
              </p>
            </div>
          </div>
        </div>

        {/* Stats as a hairline rail on white — no card, no box. */}
        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 -mt-24 sm:-mt-40 pb-16 sm:pb-24">
          <div data-reveal className="h-px w-full bg-slate-200 rule-draw" />
          {/* Four across at every width — the row is the point, so the type
              scales down on small screens rather than wrapping to two rows. */}
          <div className="grid grid-cols-4 pt-7 sm:pt-9">
            {stats.map((s, i) => (
              <div
                key={s.label}
                data-reveal
                data-delay={i * 90}
                className={`px-1.5 sm:px-5 lg:px-8 ${i ? 'border-l border-slate-200' : 'pl-0'}`}
              >
                <div className="text-[1.15rem] sm:text-4xl lg:text-5xl font-black text-brand-navy tracking-[-0.04em] tabular-nums leading-none">
                  <Counter value={s.value} />
                </div>
                <div className="mt-2 sm:mt-2.5 text-[8px] sm:text-[10px] lg:text-[11px] font-black uppercase tracking-[0.12em] sm:tracking-[0.18em] text-slate-400 leading-tight">
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Phones only: the hero ends well short of the fold, so without a cue
              the blank strip beneath it reads as the end of the page. */}
          <button
            type="button"
            onClick={() => document.getElementById('leadership')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="sm:hidden mt-9 mx-auto flex flex-col items-center gap-2 text-brand-steel"
            aria-label="Scroll to meet the leadership"
          >
            <span className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-400">
              Meet the family
            </span>
            <span className="scroll-cue w-9 h-9 rounded-full bg-brand-navy/[0.06] ring-1 ring-slate-200 flex items-center justify-center">
              <ArrowDown size={15} />
            </span>
          </button>
        </div>
      </section>

      {/* ================= LEADERSHIP (white, cut-outs) ================= */}
      <section className="relative pb-8 sm:pb-16 bg-white" id="leadership">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <div data-reveal className="flex items-center gap-3 mb-5">
              <span className="h-px w-10 bg-brand-accent rule-draw" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-accent">Leadership</span>
            </div>
            <h2 data-reveal data-delay="80" className="text-[2.1rem] sm:text-[3.4rem] lg:text-[4rem] font-black tracking-[-0.035em] text-brand-navy leading-[1.02]">
              The people behind the wheel.
            </h2>
          </div>

          <div className="mt-14 sm:mt-24 space-y-20 sm:space-y-36">
            {leaders.map((p) => {
              const photoRight = p.side === 'right';
              // The zig-zag starts at md so tablets get the same side-by-side
              // treatment as laptops; only phones stack.
              return (
                <article key={p.name} className="grid md:grid-cols-12 gap-8 md:gap-10 lg:gap-14 items-center">

                  {/* ---- Portrait: transparent cut-out standing on white ---- */}
                  <div className={`md:col-span-5 ${photoRight ? 'md:order-2' : 'md:order-1'}`}>
                    <div
                      data-reveal={photoRight ? 'right' : 'left'}
                      className={`relative mx-auto md:mx-0 max-w-[205px] sm:max-w-[300px] lg:max-w-[380px] ${photoRight ? 'md:ml-auto' : 'md:mr-auto'}`}
                    >
                      {/* soft spotlight so the figure is not floating on flat white */}
                      <div
                        className="pointer-events-none absolute -inset-x-10 -top-10 bottom-6 rounded-[999px]"
                        style={{ background: 'radial-gradient(60% 55% at 50% 42%, rgba(26,80,124,.13) 0%, rgba(26,80,124,.05) 45%, transparent 72%)' }}
                        aria-hidden="true"
                      />
                      {/* oversized ghost numeral */}
                      <span
                        className={`pointer-events-none select-none absolute -top-8 sm:-top-12 ${photoRight ? '-left-3 sm:-left-8' : '-right-3 sm:-right-8'} text-[5.5rem] sm:text-[9rem] font-black leading-none text-slate-900/[0.055] tracking-tighter`}
                        aria-hidden="true"
                      >
                        {p.index}
                      </span>
                      {/* accent arc */}
                      <div
                        className={`pointer-events-none absolute inset-x-4 top-6 bottom-10 rounded-[999px] border border-brand-accent/25 ${photoRight ? 'translate-x-3' : '-translate-x-3'}`}
                        aria-hidden="true"
                      />

                      {/* width/height are the intrinsic pixels so the row reserves
                          its space before the lazy image lands (no layout shift). */}
                      <img
                        src={p.photo}
                        alt={`${p.name} — ${p.role}, Travel With Chaudharys`}
                        loading="lazy"
                        width={p.w}
                        height={p.h}
                        className="float-slow relative w-full h-auto object-contain drop-shadow-[0_28px_36px_rgba(16,50,87,0.22)]"
                      />

                      {/* ground shadow anchors the figure */}
                      <div
                        className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-0 w-[62%] h-5 rounded-[50%] blur-md"
                        style={{ background: 'radial-gradient(ellipse at center, rgba(16,50,87,.28), transparent 70%)' }}
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  {/* ---- Copy ---- */}
                  <div className={`md:col-span-7 ${photoRight ? 'md:order-1 md:pr-6 lg:pr-10' : 'md:order-2 md:pl-6 lg:pl-10'}`}>
                    <div data-reveal={photoRight ? 'left' : 'right'}>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-black tracking-[0.28em] text-brand-accent">{p.index}</span>
                        <span className="h-px flex-1 bg-slate-200" />
                      </div>

                      <h3 className="mt-5 text-2xl sm:text-[2rem] lg:text-[2.6rem] font-black tracking-[-0.025em] text-brand-navy leading-none">
                        {p.name}
                      </h3>
                      <div className="mt-2.5 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.24em] text-brand-steel">
                        {p.role}
                      </div>

                      <blockquote className="mt-7 pl-5 border-l-2 border-brand-accent">
                        <p className="text-base sm:text-xl lg:text-2xl font-bold text-brand-navy leading-snug tracking-[-0.01em]">
                          {p.pull}
                        </p>
                      </blockquote>

                      <div className="mt-6 space-y-4 max-w-xl">
                        {p.body.map((para, i) => (
                          <p key={i} className="text-xs sm:text-[15px] text-slate-500 font-medium leading-[1.75]">{para}</p>
                        ))}
                      </div>

                      <div className="mt-7 flex flex-wrap items-center gap-2">
                        {p.tags.map((t) => (
                          <span key={t} className="px-3.5 py-1.5 rounded-full bg-slate-50 ring-1 ring-slate-200 text-[10px] sm:text-[11px] font-bold text-slate-600">
                            {t}
                          </span>
                        ))}
                        {/* On phones ml-auto stranded this in the corner after the
                            tags wrapped. Here it takes its own full-width row as a
                            proper call button; from sm up it returns to the right
                            of the tag row. */}
                        {p.phone && (
                          <a
                            href={p.phoneHref}
                            className="ml-auto inline-flex items-center gap-2.5 text-sm font-bold text-brand-navy hover:text-brand-steel transition-colors max-sm:ml-0 max-sm:mt-3 max-sm:w-full max-sm:justify-center max-sm:rounded-full max-sm:bg-brand-navy max-sm:px-5 max-sm:py-2.5 max-sm:text-white max-sm:shadow-md max-sm:shadow-brand-navy/25"
                          >
                            <span className="w-8 h-8 max-sm:w-7 max-sm:h-7 rounded-full bg-brand-navy/5 max-sm:bg-white/15 flex items-center justify-center">
                              <Phone size={14} className="text-brand-steel max-sm:text-white" />
                            </span>
                            {p.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= WHAT WE STAND FOR — cinematic band on about-bg-2 =====
          One dark, full-bleed section replaces the old flat white heading block
          and the three boxed cards. The photograph carries the section; the
          pillars sit on it as an open row divided by hairlines, not in boxes. */}
      <section ref={quoteRef} className="relative overflow-hidden bg-[#061426]">
        {/* Anchored to the bottom of the frame: the band is deliberately shorter
            than the photo's natural height, so object-cover crops the empty sky
            off the top and brings the road and the convoy up into view. That is
            what reveals the buses — not a tall gap holding the layout open. */}
        <img
          src="/about-bg-2.webp"
          alt="A Travel With Chaudharys convoy on the highway at last light"
          loading="lazy"
          width={1672}
          height={941}
          className="quote-par absolute inset-0 w-full h-full object-cover object-bottom"
        />
        {/* Scrim is heaviest only at the very top, behind the headline. Through
            the middle it drops to ~.25 so the road and the convoy stay visible —
            legibility for the pillars comes from the blurred panel they sit on,
            not from drowning the photograph. */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(6,20,38,.86) 0%, rgba(6,20,38,.62) 18%, rgba(6,20,38,.30) 38%, rgba(6,20,38,.20) 56%, rgba(6,20,38,.24) 78%, rgba(6,20,38,.42) 100%)' }}
          aria-hidden="true"
        />
        {/* soft corner vignette — depth without muddying the centre */}
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(125% 95% at 50% 34%, transparent 52%, rgba(6,20,38,.42) 100%)' }}
          aria-hidden="true"
        />
        <div className="absolute inset-x-0 top-0 h-20 sm:h-28" style={{ background: 'linear-gradient(to bottom, #ffffff, rgba(255,255,255,0))' }} aria-hidden="true" />

        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 pt-14 sm:pt-20 pb-12 sm:pb-16">

          {/* Copy starts near the top of the frame — the old layout pushed it
              almost half a screen down, leaving a dead gap under the fold line. */}
          <div className="max-w-3xl">
            <div data-reveal className="flex items-center gap-3 mb-6">
              <span className="h-px w-10 bg-brand-accent rule-draw" />
              <span className="text-[10px] font-black uppercase tracking-[0.32em] text-brand-accent">Who we are</span>
            </div>
            <h2 data-reveal data-delay="90" className="text-[1.75rem] sm:text-5xl lg:text-[3.4rem] font-black tracking-[-0.035em] text-white leading-[1.08]">
              Not a booking platform.<br className="hidden sm:block" /> A fleet we actually own.
            </h2>
            <p data-reveal data-delay="220" className="mt-7 text-sm sm:text-lg text-white/65 font-medium leading-relaxed max-w-2xl">
              Every bus, coach and cab carrying our name is owned, serviced and staffed by us. That is
              the whole reason we can stand behind what happens on board &mdash; and why a school
              principal in Pinjor or an HR head in Baddi can call one number and get an answer.
            </p>
          </div>

          {/* The gap here is the point: the convoy shows through between the
              headline and the pillars. The pillars then sit on one continuous
              blurred band — a single panel, not three cards — which is what lets
              the scrim above stay light enough to see the photograph. */}
          {/* Phones get a much lighter, shorter panel: three stacked pillars in a
              heavy blurred box covered half the photograph, which is the one thing
              this section exists to show. Rows are separated by hairlines and the
              icon sits inline with the title to keep the height down. */}
          <div
            data-reveal="scale"
            className="mt-10 sm:mt-24 rounded-2xl sm:rounded-[1.5rem] bg-[#061426]/35 sm:bg-[#061426]/40 backdrop-blur-xl sm:backdrop-blur-md ring-1 ring-white/15 shadow-[0_30px_70px_-40px_rgba(0,0,0,.9)] px-5 sm:px-9 py-2 sm:py-8"
          >
            <div className="grid sm:grid-cols-3 divide-y divide-white/10 sm:divide-y-0">
              {values.map((v, i) => (
                <div
                  key={v.title}
                  data-reveal
                  data-delay={i * 120}
                  className={`group relative py-4 sm:py-0 sm:px-8 ${i ? 'sm:border-l sm:border-white/15' : 'sm:pl-0'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/[0.1] ring-1 ring-white/15 text-brand-accent flex items-center justify-center shrink-0 order-2 sm:order-none transition-colors duration-500 group-hover:bg-brand-accent group-hover:text-brand-navy group-hover:ring-brand-accent">
                      {v.icon}
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-black tracking-[0.28em] text-brand-accent order-1 sm:order-none">
                      0{i + 1}
                    </span>
                    <span className="hidden sm:block h-px flex-1 bg-white/15" />
                    <h3 className="order-3 sm:hidden text-[15px] font-black text-white tracking-[-0.02em] leading-tight">
                      {v.title}
                    </h3>
                  </div>

                  <h3 className="hidden sm:block mt-4 text-base sm:text-[1.2rem] font-black text-white tracking-[-0.02em] leading-snug">
                    {v.title}
                  </h3>
                  <p className="mt-2 sm:mt-2.5 text-[11.5px] sm:text-[14px] text-white/65 font-medium leading-relaxed">
                    {v.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= FOUNDERS' QUOTE — light editorial =================
          Deliberately quiet and typographic. Coming straight off the dark band
          above, another photo here would read as noise. */}
      <section className="bg-white py-14 sm:py-20">
        <div className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8 text-center">
          <span
            className="block text-[5rem] sm:text-[8rem] leading-[0.6] font-black text-brand-accent/30 select-none"
            aria-hidden="true"
          >
            &ldquo;
          </span>

          <blockquote data-reveal data-delay="80" className="mt-4 sm:mt-6">
            <p className="text-[1.4rem] sm:text-[2.6rem] lg:text-[3rem] font-black tracking-[-0.03em] text-brand-navy leading-[1.18]">
              We started with one bus and a route nobody wanted. What we sold was never a seat
              &mdash; it was the certainty that it would arrive.
            </p>
          </blockquote>

          {/* Phones stack this so the block sits truly centred; the row layout
              put a left-aligned text column beside the avatars, which read as
              off-centre on a narrow screen. */}
          <div data-reveal data-delay="240" className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <div className="flex -space-x-2.5 sm:-space-x-3">
              {['/team-dalbir-singh.webp', '/team-daljeet-singh.webp'].map((src) => (
                <span key={src} className="w-9 h-9 sm:w-14 sm:h-14 rounded-full overflow-hidden ring-2 ring-white bg-slate-100 shadow-md">
                  <img src={src} alt="" loading="lazy" className="w-full h-full object-cover object-top scale-[1.35] origin-top" />
                </span>
              ))}
            </div>
            <span className="hidden sm:block h-10 w-px bg-slate-200" />
            <div className="text-center sm:text-left">
              <div className="text-[11.5px] sm:text-base font-extrabold text-brand-navy tracking-tight">
                Dalbir &amp; Daljeet Singh
              </div>
              <div className="mt-0.5 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.14em] sm:tracking-[0.22em] text-brand-steel">
                Founders &middot; Managing Directors
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= CTA =================
          Structured as a real contact block rather than a headline with a
          button floating beside it: the statement on the left, an actual
          call-us panel with named people on the right. */}
      <section className="pb-20 sm:pb-28 bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div data-reveal="scale" className="relative overflow-hidden rounded-[1.75rem] sm:rounded-[2rem] bg-brand-navy ring-1 ring-brand-navy/10">
            <img
              src="/about-bg-3.webp"
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover object-[72%_center]"
            />
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(100deg, rgba(9,26,48,.97) 0%, rgba(9,26,48,.93) 46%, rgba(9,26,48,.72) 74%, rgba(9,26,48,.42) 100%)' }}
              aria-hidden="true"
            />
            <div className="pointer-events-none absolute -bottom-28 -left-10 w-72 h-72 rounded-full bg-brand-accent/10 blur-3xl" aria-hidden="true" />

            <div className="relative z-10 grid lg:grid-cols-12 gap-y-10 gap-x-14 px-7 sm:px-12 lg:px-14 py-12 sm:py-16">

              {/* statement */}
              <div className="lg:col-span-7 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-6">
                  <span className="h-px w-10 bg-brand-accent" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-accent">Work with us</span>
                </div>
                <h2 className="text-2xl sm:text-[2.7rem] font-black tracking-[-0.03em] text-white leading-[1.08]">
                  Put your route in<br className="hidden sm:block" /> steadier hands.
                </h2>
                <p className="mt-5 text-xs sm:text-base text-white/60 font-medium leading-relaxed max-w-lg">
                  Schools, factories and families across Pinjor, Kalka, Baddi and Parwanoo already run
                  their transport with us. Tell us your route and we will come back with a plan and a
                  price within 24 hours.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3">
                  {['Licensed & ISO certified', 'GPS + CCTV on every vehicle', 'No obligation quote'].map((t) => (
                    <span key={t} className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-bold text-white/50">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* contact panel */}
              <div className="lg:col-span-5">
                {/* Frosted glass at every width. Legibility comes from the heavy
                    blur rather than a solid fill, so the golden-hour frame behind
                    still reads through the panel. */}
                <div className="relative overflow-hidden rounded-2xl bg-[#0a1c33]/30 backdrop-blur-3xl ring-1 ring-white/20 shadow-[0_35px_80px_-40px_rgba(0,0,0,.9)] p-5 sm:p-7">
                  {/* lit top edge + corner bloom — the cues that read as glass */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" aria-hidden="true" />
                  <div className="pointer-events-none absolute -top-20 -right-12 w-44 h-44 rounded-full bg-white/[0.09] blur-2xl" aria-hidden="true" />
                  <div className="pointer-events-none absolute -bottom-24 -left-10 w-44 h-44 rounded-full bg-brand-accent/10 blur-2xl" aria-hidden="true" />

                  <div className="relative z-10">
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">
                    Speak to us directly
                  </div>

                  <div className="mt-5 divide-y divide-white/10">
                    {[
                      { name: 'Dalbir Singh', role: 'Managing Director', num: '+91 70822 52200', href: 'tel:+917082252200' },
                      { name: 'Aditya Singh', role: 'Co-Founder', num: '+91 87080 60565', href: 'tel:+918708060565' },
                    ].map((c) => (
                      <a key={c.href} href={c.href} className="group flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                        <span className="w-9 h-9 rounded-full bg-white/10 ring-1 ring-white/15 flex items-center justify-center shrink-0 transition-colors duration-300 group-hover:bg-brand-accent">
                          <Phone size={14} className="text-brand-accent transition-colors duration-300 group-hover:text-brand-navy" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-extrabold text-white leading-tight">{c.num}</span>
                          <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-white/40 mt-0.5">
                            {c.name} &middot; {c.role}
                          </span>
                        </span>
                      </a>
                    ))}
                  </div>

                  <button
                    onClick={onNavigateHome}
                    className="group mt-6 w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-full bg-white text-brand-navy text-xs sm:text-sm font-black shadow-xl shadow-black/30 hover:-translate-y-0.5 hover:shadow-2xl transition-all duration-300"
                  >
                    Request a Fleet Contract
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-300" />
                  </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
