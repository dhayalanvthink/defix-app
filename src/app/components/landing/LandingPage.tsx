import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Logo } from '../Logo';
import { motion, AnimatePresence } from 'motion/react';
import {
  Pen,
  Type,
  Shapes,
  MousePointer2,
  Stamp,
  ArrowRight,
  Check,
  Zap,
  Shield,
  Share2,
  Download,
  History,
  Keyboard,
  Menu,
  X,
  ChevronRight,
  Sparkles,
  Lock,
  Palette,
  Bug,
  Megaphone,
  Briefcase,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';
import { HeroInteractiveDemo } from './HeroCanvas';

/* ═══════════════════════════ constants ═══════════════════════════ */
const NAVY = '#080F5B';
const GREEN = '#15DB95';

const FEATURES = [
  { icon: Pen, title: 'Freehand Drawing', desc: 'Sketch annotations with precision pen, highlighter, and brush tools on any image.' },
  { icon: Shapes, title: 'Smart Shapes', desc: 'Drop rectangles, ellipses, arrows, and lines with pixel-perfect snapping.' },
  { icon: Type, title: 'Rich Text Labels', desc: 'Add contextual text with customizable fonts, sizes, and colors.' },
  { icon: Stamp, title: 'Stamps & Markers', desc: 'One-click approval, rejection, and review stamps for rapid feedback.' },
  { icon: Share2, title: 'Instant Sharing', desc: 'Generate short links to share annotated images with anyone, no account needed.' },
  { icon: Download, title: 'Export Anywhere', desc: 'Download as PNG, JPG, or PDF with XSS-safe rendering.' },
  { icon: History, title: 'Full History', desc: 'Unlimited undo/redo with a visual history timeline of every change.' },
  { icon: Keyboard, title: 'Keyboard Shortcuts', desc: 'Power-user shortcuts for every tool. Work at the speed of thought.' },
  { icon: Shield, title: 'Enterprise Security', desc: 'CSP headers, rate limiting, idle auto-logout, and end-to-end encryption.' },
];

const STEPS = [
  { num: '01', title: 'Upload Your Image', desc: 'Drag & drop or paste any image. Supports PNG, JPG, SVG, and PDF.' },
  { num: '02', title: 'Annotate & Collaborate', desc: 'Use 12+ tools to draw, write, stamp, and mark up with precision.' },
  { num: '03', title: 'Share in One Click', desc: 'Generate a short link or export to any format. Done in seconds.' },
];

const USE_CASES = [
  {
    icon: Palette,
    title: 'Design Teams',
    desc: 'Leave precise visual feedback on mockups, prototypes, and UI screenshots. Replace vague Slack messages with pinpointed annotations.',
    highlights: ['Pixel-accurate markup', 'Approval stamps', 'One-click share links'],
  },
  {
    icon: Bug,
    title: 'QA & Engineering',
    desc: 'Document bugs with annotated screenshots that show exactly what went wrong. Attach arrows, text callouts, and highlights in seconds.',
    highlights: ['Bug reproduction clarity', 'Arrow & callout tools', 'Export to issue trackers'],
  },
  {
    icon: Megaphone,
    title: 'Marketing & Content',
    desc: 'Review ad creatives, social assets, and landing page screenshots with your team. Mark changes directly on the visual.',
    highlights: ['Creative review workflows', 'Brand color annotations', 'PDF export for clients'],
  },
  {
    icon: Briefcase,
    title: 'Agencies & Freelancers',
    desc: 'Share annotated deliverables with clients via password-protected links. Get sign-off faster with visual approval stamps.',
    highlights: ['Client-ready share links', 'Password protection', 'Professional exports'],
  },
];

const FAQS = [
  {
    q: 'Is Defix really free?',
    a: 'Yes. Defix is completely free to use with all annotation tools, export formats, and sharing features included. No credit card required, no trial period.',
  },
  {
    q: 'What image formats does Defix support?',
    a: 'You can upload PNG, JPG, SVG, WebP, and PDF files. Export is available as PNG, JPG, or PDF with full annotation fidelity.',
  },
  {
    q: 'Can I share annotations with people who don\'t have an account?',
    a: 'Absolutely. Every annotation generates a short link that anyone can view in their browser -- no sign-up needed. You can also password-protect links for sensitive content.',
  },
  {
    q: 'How secure is my data?',
    a: 'Defix uses enterprise-grade security including CSP headers, rate limiting, idle auto-logout, and XSS-safe rendering. Your images are stored securely and never shared without your permission.',
  },
  {
    q: 'Does Defix work on mobile?',
    a: 'Yes. The editor is fully touch-optimized with a floating mobile toolbar, pinch-to-zoom, and scale-aware controls. Annotate on the go from any device.',
  },
  {
    q: 'Can I use keyboard shortcuts?',
    a: 'Every tool has a keyboard shortcut. Press ? inside the editor to see the full shortcut reference. Power users can work entirely without touching the mouse.',
  },
];

/* ═══════════════════════════ component ═══════════════════════════ */
export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
      <Navbar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      <HeroSection />
      <FeaturesSection />
      <PasswordProtectedCallout />
      <HowItWorksSection />
      <UseCasesSection />
      <FAQSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}

/* ═══════════════════════════ sections ═══════════════════════════ */

function Navbar({ mobileMenuOpen, setMobileMenuOpen }: { mobileMenuOpen: boolean; setMobileMenuOpen: (v: boolean) => void }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Use Cases', href: '#use-cases' },
    { label: 'FAQ', href: '#faq' },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <Link to="/" className="flex items-center gap-2.5 shrink-0">
              <Logo className="w-8 h-8 lg:w-9 lg:h-9" />
              <span className="text-xl font-bold tracking-tight" style={{ color: NAVY }}>Defix</span>
            </Link>

            <div className="hidden lg:flex items-center gap-8">
              {navLinks.map(l => (
                <a
                  key={l.label}
                  href={l.href}
                  className="text-sm font-medium text-slate-600 hover:text-[#080F5B] transition-colors"
                >
                  {l.label}
                </a>
              ))}
            </div>

            <div className="hidden lg:flex items-center gap-3">
              <Link
                to="/login"
                className="text-sm font-medium text-slate-700 hover:text-[#080F5B] px-4 py-2 rounded-xl transition-colors"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg"
                style={{ background: GREEN, color: '#FFFFFF' }}
              >
                Get Started
              </Link>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-16 inset-x-0 bg-white border-b border-slate-200 shadow-xl p-6 space-y-4"
          >
            {navLinks.map(l => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block text-base font-medium text-slate-700 hover:text-[#080F5B] py-2"
              >
                {l.label}
              </a>
            ))}
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center text-sm font-medium text-slate-700 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center text-sm font-semibold py-2.5 rounded-xl shadow-md"
                style={{ background: GREEN, color: '#FFFFFF' }}
              >
                Get Started
              </Link>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

/* ─── Hero ─── */
function HeroSection() {
  return (
    <section className="relative pt-28 sm:pt-36 lg:pt-44 pb-16 sm:pb-24 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-[0.04]"
          style={{ background: `radial-gradient(circle, ${GREEN} 0%, transparent 70%)` }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full opacity-[0.03]"
          style={{ background: `radial-gradient(circle, ${NAVY} 0%, transparent 70%)` }}
        />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(${NAVY} 1px, transparent 1px), linear-gradient(90deg, ${NAVY} 1px, transparent 1px)`,
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border mb-8"
              style={{ color: NAVY, background: `${GREEN}12`, borderColor: `${GREEN}30` }}
            >
              <Sparkles className="w-3.5 h-3.5" style={{ color: GREEN }} />
              Now with AI-powered smart stamps
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.08]"
            style={{ color: NAVY }}
          >
            Annotate Images.{' '}
            <span className="relative">
              <span style={{ color: GREEN }}>Ship Faster.</span>
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                <path d="M2 8 C50 2, 100 2, 150 6 C200 10, 250 4, 298 8" stroke={GREEN} strokeWidth="3" strokeLinecap="round" opacity="0.3" />
              </svg>
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 sm:mt-8 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed"
          >
            Defix is the professional image annotation tool built for design teams.
            Draw, stamp, comment, and share — all from your browser with enterprise-grade security.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/signup"
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base font-semibold px-8 py-3.5 rounded-2xl transition-all shadow-lg hover:shadow-xl"
              style={{ background: GREEN, color: '#FFFFFF' }}
            >
              Get Started
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#features"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base font-semibold px-8 py-3.5 rounded-2xl border-2 transition-all hover:bg-slate-50"
              style={{ color: NAVY, borderColor: `${NAVY}20` }}
            >
              See How It Works
            </a>
          </motion.div>


        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-16 sm:mt-20 relative max-w-5xl mx-auto"
        >
          <HeroInteractiveDemo />
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Features ─── */
function FeaturesSection() {
  return (
    <section id="features" className="py-20 sm:py-28 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-16 sm:mb-20">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border mb-5"
            style={{ color: GREEN, background: `${GREEN}10`, borderColor: `${GREEN}25` }}
          >
            <Zap className="w-3 h-3" />
            Features
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight" style={{ color: NAVY }}>
            Everything you need to annotate
          </h2>
          <p className="mt-4 sm:mt-5 text-lg text-slate-600 leading-relaxed">
            A complete toolkit for professionals who need precision, speed, and security in their image feedback workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="group relative p-6 sm:p-7 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg transition-all duration-300"
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-colors duration-300"
                style={{ background: `${GREEN}10` }}
              >
                <f.icon className="w-5 h-5 transition-colors duration-300" style={{ color: GREEN }} />
              </div>
              <h3 className="text-lg font-bold mb-2" style={{ color: NAVY }}>{f.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Password Protected Callout ─── */
function PasswordProtectedCallout() {
  return (
    <section className="py-20 sm:py-28">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative rounded-3xl border-2 overflow-hidden"
          style={{ borderColor: `${GREEN}30`, background: `linear-gradient(135deg, ${NAVY}05 0%, ${GREEN}08 100%)` }}
        >
          <div
            className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-10 blur-3xl -translate-y-1/2 translate-x-1/4"
            style={{ background: GREEN }}
          />
          <div className="relative flex flex-col lg:flex-row items-center gap-8 lg:gap-12 p-8 sm:p-10 lg:p-14">
            <div className="shrink-0">
              <div
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY}dd)` }}
              >
                <Lock className="w-8 h-8 sm:w-10 sm:h-10" style={{ color: GREEN }} />
              </div>
            </div>
            <div className="text-center lg:text-left flex-1">
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: NAVY }}>
                Password-Protected Share Links
              </h3>
              <p className="mt-3 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                Share annotated images with anyone via a short link — and lock sensitive content behind a
                password. Only people with the right credentials can view your work. Perfect for client
                reviews, confidential feedback, and NDA-protected deliverables.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-sm font-medium">
                {[
                  'One-click link generation',
                  'Optional password gate',
                  'Expirable links',
                  'No account needed to view',
                ].map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border"
                    style={{ color: NAVY, background: `${GREEN}10`, borderColor: `${GREEN}25` }}
                  >
                    <Check className="w-3.5 h-3.5" style={{ color: GREEN }} />
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="shrink-0 hidden lg:block">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-xl transition-all shadow-md hover:shadow-lg"
                style={{ background: GREEN, color: '#FFFFFF' }}
              >
                Try It Free
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── How It Works ─── */
function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28 scroll-mt-20 relative overflow-hidden" style={{ background: NAVY }}>
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: GREEN }} />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-5 blur-3xl" style={{ background: GREEN }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-2xl mx-auto text-center mb-16 sm:mb-20">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border mb-5"
            style={{ color: GREEN, background: `${GREEN}15`, borderColor: `${GREEN}30` }}
          >
            <MousePointer2 className="w-3 h-3" />
            How It Works
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
            Three steps to better feedback
          </h2>
          <p className="mt-4 sm:mt-5 text-lg text-slate-300 leading-relaxed">
            From upload to share in under 60 seconds. No learning curve required.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-0">
          {STEPS.flatMap((s, i) => {
            const items = [
              <motion.div
                key={s.num}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="w-full lg:flex-1 p-7 sm:p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm"
              >
                <span className="text-5xl sm:text-6xl font-black opacity-20" style={{ color: GREEN }}>
                  {s.num}
                </span>
                <h3 className="text-xl font-bold text-white mt-2 mb-3">{s.title}</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{s.desc}</p>
              </motion.div>,
            ];
            if (i < STEPS.length - 1) {
              items.push(
                <div key={`arrow-${i}`} className="shrink-0 flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12 my-2 lg:my-0 lg:mx-1">
                  <ChevronDown className="w-6 h-6 text-white/30 block lg:hidden" />
                  <ChevronRight className="w-6 h-6 text-white/30 hidden lg:block" />
                </div>
              );
            }
            return items;
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── Use Cases ─── */
function UseCasesSection() {
  return (
    <section id="use-cases" className="py-20 sm:py-28 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-16 sm:mb-20">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border mb-5"
            style={{ color: GREEN, background: `${GREEN}10`, borderColor: `${GREEN}25` }}
          >
            <Briefcase className="w-3 h-3" />
            Use Cases
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight" style={{ color: NAVY }}>
            Built for every team
          </h2>
          <p className="mt-4 sm:mt-5 text-lg text-slate-600 leading-relaxed">
            Whether you're reviewing designs, filing bugs, or approving client work — Defix fits your workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto">
          {USE_CASES.map((uc, i) => (
            <motion.div
              key={uc.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group relative p-7 sm:p-8 rounded-2xl border-2 border-slate-200 bg-white hover:border-[#15DB95]/40 hover:shadow-lg transition-all duration-300"
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: `${GREEN}10` }}
              >
                <uc.icon className="w-6 h-6" style={{ color: GREEN }} />
              </div>
              <h3 className="text-xl font-bold mb-2" style={{ color: NAVY }}>{uc.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-5">{uc.desc}</p>
              <ul className="space-y-2">
                {uc.highlights.map(h => (
                  <li key={h} className="flex items-center gap-2 text-sm text-slate-700">
                    <Check className="w-4 h-4 shrink-0" style={{ color: GREEN }} />
                    {h}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── FAQ ─── */
function FAQItem({ faq }: { faq: { q: string; a: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-200 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 py-5 sm:py-6 text-left"
      >
        <span className="text-base sm:text-lg font-semibold" style={{ color: NAVY }}>{faq.q}</span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <ChevronDown className="w-5 h-5 text-slate-400" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="pb-5 sm:pb-6 text-sm sm:text-base text-slate-600 leading-relaxed pr-10">
              {faq.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FAQSection() {
  return (
    <section id="faq" className="py-20 sm:py-28 scroll-mt-20 bg-slate-50/50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border mb-5"
            style={{ color: GREEN, background: `${GREEN}10`, borderColor: `${GREEN}25` }}
          >
            <HelpCircle className="w-3 h-3" />
            FAQ
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight" style={{ color: NAVY }}>
            Frequently asked questions
          </h2>
          <p className="mt-4 text-lg text-slate-600 leading-relaxed">
            Everything you need to know about Defix.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 px-6 sm:px-8 shadow-sm">
          {FAQS.map(faq => (
            <FAQItem key={faq.q} faq={faq} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Final CTA ─── */
function FinalCTA() {
  return (
    <section className="py-20 sm:py-28 relative overflow-hidden" style={{ background: NAVY }}>
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, ${GREEN} 0%, transparent 50%), radial-gradient(circle at 80% 50%, ${GREEN} 0%, transparent 50%)`,
        }}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
            Start annotating{' '}
            <span style={{ color: GREEN }}>in 30 seconds</span>
          </h2>
          <p className="mt-5 sm:mt-6 text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Create your free account and start annotating images right away.
            All tools included. No credit card. No catch.
          </p>
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/signup"
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base font-semibold px-8 py-3.5 rounded-2xl transition-all shadow-lg hover:shadow-xl"
              style={{ background: GREEN, color: '#FFFFFF' }}
            >
              Create Free Account
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base font-semibold text-white px-8 py-3.5 rounded-2xl border-2 border-white/20 hover:border-white/40 transition-all"
            >
              Sign In
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-5 text-sm text-slate-400">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              Enterprise security
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Setup in 30 seconds
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Free forever
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Logo className="w-6 h-6" />
          <span className="text-sm font-semibold" style={{ color: NAVY }}>Defix</span>
          <span className="text-sm text-slate-400 ml-1">&copy; {new Date().getFullYear()}</span>
        </div>
        <div className="flex items-center gap-6">
          {[
            { label: 'Privacy Policy', href: '/privacy' },
            { label: 'Terms & Conditions', href: '/terms' },
          ].map(l => (
            <Link key={l.label} to={l.href} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}