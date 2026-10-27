import Link from "next/link";
import {
  ArrowRight,
  Bot,
  BarChart3,
  Shield,
  Share2,
  Users,
  Zap,
  CheckCircle,
  Trophy,
  Settings,
  Megaphone,
  Star,
  ChevronRight,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-orange-500 flex items-center justify-center">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight text-white">TribeOS</span>
            </div>
            <nav className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#modules" className="hover:text-white transition-colors">Modules</a>
              <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
              <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
              <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            </nav>
            <div className="flex items-center gap-3">
              <Link
                href="/auth/signin"
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-1.5 rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-orange-500/5 blur-3xl" />
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-sm text-orange-400 mb-8">
            <Star className="h-3.5 w-3.5" />
            Built for Web3 Communities &amp; DAOs
          </div>
          <h1 className="mx-auto max-w-4xl text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-tight">
            One platform.{" "}
            <span className="text-orange-400">Every community</span>{" "}
            configured.
          </h1>
          <p className="mt-6 mx-auto max-w-2xl text-lg text-zinc-400 leading-relaxed">
            TribeOS is a modular Telegram community management platform for token
            projects, DAOs, and ambassador programs. Run referral contests,
            automate moderation, and grow your community — without building it yourself.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-8 py-3 text-base font-semibold text-white hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20"
            >
              Open Dashboard <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-8 py-3 text-base font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <Bot className="h-5 w-5" /> Add to Telegram
            </a>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-zinc-800 bg-zinc-900/50 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { label: "Modules Available", value: "8+" },
              { label: "Community Features", value: "40+" },
              { label: "Fraud Signals", value: "12" },
              { label: "Avg. Setup Time", value: "<5 min" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-white">{stat.value}</div>
                <div className="mt-1 text-sm text-zinc-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Everything your community needs
            </h2>
            <p className="mt-4 text-zinc-400 max-w-2xl mx-auto">
              A complete management stack for modern Telegram communities — from referral contests to moderation.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Share2,
                title: "Referral Campaigns",
                description:
                  "Launch viral referral contests with unique deep-links, real-time leaderboards, and automated tracking.",
                color: "orange",
              },
              {
                icon: Shield,
                title: "Anti-Fraud Protection",
                description:
                  "Automatically detect self-referrals, duplicate accounts, and suspicious join patterns.",
                color: "blue",
              },
              {
                icon: Settings,
                title: "Modular Configuration",
                description:
                  "Every group configures its own feature set. Enable only what you need, per community.",
                color: "purple",
              },
              {
                icon: BarChart3,
                title: "Community Analytics",
                description:
                  "Track member growth, referral rates, qualification trends, and campaign ROI.",
                color: "green",
              },
              {
                icon: Trophy,
                title: "Rewards & Claims",
                description:
                  "Manage reward pools, allocate prizes, and track claim status with a full audit trail.",
                color: "yellow",
              },
              {
                icon: Megaphone,
                title: "Announcements",
                description:
                  "Schedule community messages and campaign reminders directly from the dashboard.",
                color: "red",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:border-zinc-700 transition-colors"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">
                  <feature.icon className="h-5 w-5 text-orange-400" />
                </div>
                <h3 className="font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Referral Demo */}
      <section className="py-24 bg-zinc-900/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-16 lg:grid-cols-2 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs text-orange-400 mb-6">
                Primary Feature
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
                Referral campaigns that actually track
              </h2>
              <p className="mt-4 text-zinc-400 leading-relaxed">
                Launch a campaign in minutes. Every participant gets a unique deep-link.
                Joins are tracked, qualifications are verified, and leaderboards update in real time.
              </p>
              <ul className="mt-8 space-y-3">
                {[
                  "Unique deep-links per participant",
                  "Configurable qualification rules",
                  "Anti-fraud: self-referral & duplicate prevention",
                  "Multi-phase contest lifecycle management",
                  "Finalized results with audit trail",
                  "Reward allocation and claims tracking",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-zinc-300">
                    <CheckCircle className="h-4 w-4 text-orange-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
                >
                  Start a campaign <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-white">Summer DAO Referral Campaign</h3>
                <span className="inline-flex items-center rounded-full bg-green-900 px-2.5 py-0.5 text-xs font-semibold text-green-300">
                  ACTIVE
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: "Participants", value: "284" },
                  { label: "Qualified Refs", value: "1,047" },
                  { label: "Pending Review", value: "23" },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg bg-zinc-800 p-3 text-center">
                    <div className="text-2xl font-bold text-white">{s.value}</div>
                    <div className="text-xs text-zinc-500 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <div className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Top Referrers</div>
                {[
                  { name: "@cryptoninja", refs: 47, pts: 470 },
                  { name: "@web3whale", refs: 38, pts: 380 },
                  { name: "@daobuilder", refs: 31, pts: 310 },
                ].map((p, i) => (
                  <div key={p.name} className="flex items-center gap-3 rounded-lg bg-zinc-800/60 px-3 py-2">
                    <span className="text-sm font-medium text-orange-400 w-5">#{i + 1}</span>
                    <span className="flex-1 text-sm text-zinc-200">{p.name}</span>
                    <span className="text-sm text-zinc-400">{p.refs} refs</span>
                    <span className="text-sm font-semibold text-orange-400">{p.pts} pts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modules */}
      <section id="modules" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Module marketplace
            </h2>
            <p className="mt-4 text-zinc-400 max-w-xl mx-auto">
              Enable only the features your community needs. Each module is independently configured.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { id: "A", name: "Referral & Contest Engine", status: "Available", desc: "Campaign management, deep-links, leaderboards" },
              { id: "B", name: "Referral Integrity & Anti-Fraud", status: "Available", desc: "Velocity checks, duplicate prevention, review queue" },
              { id: "C", name: "Welcome & Onboarding", status: "Available", desc: "Custom welcome messages, rules, instructions" },
              { id: "D", name: "Moderation & Anti-Spam", status: "Available", desc: "Rate limits, warnings, auto-moderation" },
              { id: "E", name: "Quests & Missions", status: "Planned", desc: "Engagement tasks, points, badges" },
              { id: "F", name: "Team Battles & Leagues", status: "Available", desc: "Team scores, rankings, competition periods" },
              { id: "G", name: "Community Analytics", status: "Available", desc: "Growth, retention, referral rate dashboards" },
              { id: "H", name: "Rewards & Claims", status: "Available", desc: "Reward pools, eligibility, claims tracking" },
              { id: "I", name: "Wallet Verification", status: "Planned", desc: "Wallet ownership and blockchain eligibility" },
              { id: "J", name: "Announcements", status: "Available", desc: "Scheduled messages, campaign reminders" },
              { id: "K", name: "Contributor Reputation", status: "Planned", desc: "Verified contributions and achievements" },
            ].map((mod) => (
              <div
                key={mod.id}
                className="flex gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 transition-colors"
              >
                <div className="shrink-0 h-9 w-9 rounded-lg bg-zinc-800 flex items-center justify-center text-sm font-bold text-orange-400">
                  {mod.id}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{mod.name}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      mod.status === "Available"
                        ? "bg-green-900 text-green-300"
                        : "bg-zinc-800 text-zinc-500"
                    }`}>
                      {mod.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">{mod.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-zinc-900/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">How it works</h2>
            <p className="mt-4 text-zinc-400">
              From zero to a managed community in under 10 minutes.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-4">
            {[
              { step: "01", title: "Create account", desc: "Sign up with your email and create your TribeOS account." },
              { step: "02", title: "Add the bot", desc: "Add @TribeOSBot as an admin to your Telegram group." },
              { step: "03", title: "Link & configure", desc: "Verify ownership and enable the modules your community needs." },
              { step: "04", title: "Launch & grow", desc: "Start a referral campaign and watch your community grow." },
            ].map((step) => (
              <div key={step.step} className="relative">
                <div className="text-5xl font-black text-zinc-800 mb-4">{step.step}</div>
                <h3 className="font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-zinc-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 lg:p-12">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-400 mb-6">
                  <Shield className="h-3.5 w-3.5" /> Security & Reliability
                </div>
                <h2 className="text-3xl font-bold text-white">
                  Built with security from the ground up
                </h2>
                <p className="mt-4 text-zinc-400">
                  Every group is isolated. Your data never touches another community&apos;s configuration.
                  Administrative actions require proof of Telegram ownership.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  "Per-group tenant isolation",
                  "Server-side authorization",
                  "Webhook secret validation",
                  "Input validation with Zod",
                  "Audit log for all actions",
                  "No secrets exposed to client",
                  "Rate limiting on all endpoints",
                  "CSRF protection",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-zinc-300">
                    <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-zinc-900/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Pricing</h2>
            <p className="mt-4 text-zinc-400">
              Transparent, community-first pricing.{" "}
              <span className="text-orange-400">Plans are proposed and subject to change.</span>
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                name: "Community",
                price: "Free",
                period: "",
                desc: "For small communities getting started",
                features: ["1 community", "Core modules (A–D)", "Up to 500 members", "Basic analytics"],
                cta: "Get started",
                highlighted: false,
              },
              {
                name: "Growth",
                price: "$29",
                period: "/mo",
                desc: "For active communities running campaigns",
                features: ["5 communities", "All available modules", "Unlimited members", "Advanced analytics", "Priority support"],
                cta: "Start trial",
                highlighted: true,
              },
              {
                name: "Enterprise",
                price: "Custom",
                period: "",
                desc: "For large DAOs and token projects",
                features: ["Unlimited communities", "Custom modules", "SLA guarantee", "Dedicated support", "Custom integrations"],
                cta: "Contact us",
                highlighted: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-8 ${
                  plan.highlighted
                    ? "border-orange-500 bg-zinc-900"
                    : "border-zinc-800 bg-zinc-900"
                }`}
              >
                {plan.highlighted && (
                  <div className="inline-flex items-center rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white mb-4">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">{plan.price}</span>
                  <span className="text-zinc-400">{plan.period}</span>
                </div>
                <p className="mt-2 text-sm text-zinc-500">{plan.desc}</p>
                <ul className="mt-6 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                      <CheckCircle className="h-4 w-4 text-orange-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/signup"
                  className={`mt-8 flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                    plan.highlighted
                      ? "bg-orange-500 text-white hover:bg-orange-600"
                      : "border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">FAQ</h2>
          </div>
          <div className="space-y-6">
            {[
              {
                q: "Do I need to give TribeOS admin access to my group?",
                a: "Yes, the bot needs admin permissions to track joins, send messages, and moderate. You control exactly which permissions you grant — TribeOS only requests what each enabled module requires.",
              },
              {
                q: "How does group ownership verification work?",
                a: "After adding the bot, you'll receive a one-time challenge code in your group. Submitting it through the dashboard proves you're an admin of that group — no passwords, no OAuth tokens shared.",
              },
              {
                q: "Can multiple admins manage the same group?",
                a: "Yes. Multiple TribeOS users can be granted access to a group's dashboard, with configurable roles (Owner, Admin, Viewer).",
              },
              {
                q: "Is referral data cryptographically verifiable?",
                a: "Referral attribution is stored in a tamper-evident audit log in PostgreSQL. We do not currently offer on-chain verification. We will never claim more than what we actually implement.",
              },
              {
                q: "What happens to my data if I remove TribeOS?",
                a: "Your data remains in your TribeOS account for 90 days after removal, then is purged per our retention policy. You can export a full data dump at any time.",
              },
            ].map((item) => (
              <div key={item.q} className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
                <h3 className="font-semibold text-white">{item.q}</h3>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-zinc-900/30">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Ready to manage your community?
          </h2>
          <p className="mt-4 text-zinc-400">
            Join the platform built for serious Telegram communities.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-8 py-3 text-base font-semibold text-white hover:bg-orange-600 transition-colors"
            >
              Open Dashboard <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-md bg-orange-500 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-white">TribeOS</span>
              </div>
              <p className="text-sm text-zinc-500">
                Modular community management for Telegram.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-300 mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li><a href="#features" className="hover:text-zinc-300 transition-colors">Features</a></li>
                <li><a href="#modules" className="hover:text-zinc-300 transition-colors">Modules</a></li>
                <li><a href="#pricing" className="hover:text-zinc-300 transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-300 mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li><a href="/privacy" className="hover:text-zinc-300 transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-zinc-300 transition-colors">Terms of Service</a></li>
                <li><a href="mailto:support@tribeos.app" className="hover:text-zinc-300 transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-300 mb-3">Developers</h4>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li><a href="/docs" className="hover:text-zinc-300 transition-colors">Documentation</a></li>
                <li><a href="https://github.com" className="hover:text-zinc-300 transition-colors">GitHub</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-zinc-800 pt-8 text-center text-sm text-zinc-600">
            © 2026 TribeOS. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
