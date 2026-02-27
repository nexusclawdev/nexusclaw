import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  getSkills,
  getSkillDetail,
  getSkillLearningJob,
  getAvailableLearnedSkills,
  startSkillLearning,
  unlearnSkill,
  type LearnedSkillEntry,
  type SkillHistoryProvider,
  type SkillEntry,
  type SkillDetail,
  type SkillLearnJob,
  type SkillLearnProvider,
} from "../api";
import type { Agent, AgentRole } from "../types";
import AgentAvatar from "./AgentAvatar";
import SkillHistoryPanel from "./SkillHistoryPanel";

/* ================================================================== */
/*  Skills data from skills.sh (loaded dynamically via /api/skills)    */
/* ================================================================== */

interface CategorizedSkill extends SkillEntry {
  category: string;
  installsDisplay: string;
}

type Locale = "ko" | "en" | "ja" | "zh";
type TFunction = (messages: Record<Locale, string>) => string;

const LANGUAGE_STORAGE_KEY = "nexusclaw.language";
const LOCALE_TAGS: Record<Locale, string> = {
  ko: "ko-KR",
  en: "en-US",
  ja: "ja-JP",
  zh: "zh-CN",
};

function normalizeLocale(value: string | null | undefined): Locale | null {
  const code = (value ?? "").toLowerCase();
  if (code.startsWith("ko")) return "ko";
  if (code.startsWith("en")) return "en";
  if (code.startsWith("ja")) return "ja";
  if (code.startsWith("zh")) return "zh";
  return null;
}

function detectLocale(): Locale {
  if (typeof window === "undefined") return "en";
  return (
    normalizeLocale(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)) ??
    normalizeLocale(window.navigator.language) ??
    "en"
  );
}

function useI18n(preferredLocale?: string) {
  const [locale, setLocale] = useState<Locale>(
    () => normalizeLocale(preferredLocale) ?? detectLocale()
  );

  useEffect(() => {
    const preferred = normalizeLocale(preferredLocale);
    if (preferred) setLocale(preferred);
  }, [preferredLocale]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => {
      setLocale(normalizeLocale(preferredLocale) ?? detectLocale());
    };
    window.addEventListener("storage", sync);
    window.addEventListener("nexusclaw-language-change", sync as EventListener);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(
        "nexusclaw-language-change",
        sync as EventListener
      );
    };
  }, [preferredLocale]);

  const t = useCallback(
    (messages: Record<Locale, string>) => messages[locale] ?? messages.en,
    [locale]
  );

  return { locale, localeTag: LOCALE_TAGS[locale], t };
}

function categorize(name: string, repo: string): string {
  const n = name.toLowerCase();
  const r = repo.toLowerCase();
  if (
    n.includes("design") ||
    n.includes("ui") ||
    n.includes("ux") ||
    n.includes("brand") ||
    n.includes("canvas") ||
    n.includes("theme") ||
    n.includes("interface") ||
    n.includes("visual") ||
    n.includes("interaction")
  )
    return "Design";
  if (
    n.includes("marketing") ||
    n.includes("seo") ||
    n.includes("copywriting") ||
    n.includes("content") ||
    n.includes("social") ||
    n.includes("pricing") ||
    n.includes("launch") ||
    n.includes("analytics") ||
    n.includes("cro") ||
    n.includes("ads") ||
    n.includes("email-sequence") ||
    n.includes("referral") ||
    n.includes("competitor") ||
    n.includes("onboarding") ||
    n.includes("signup") ||
    n.includes("paywall") ||
    n.includes("popup") ||
    n.includes("ab-test") ||
    n.includes("free-tool") ||
    n.includes("backlink") ||
    r.includes("marketingskills")
  )
    return "Marketing";
  if (
    n.includes("test") ||
    n.includes("debug") ||
    n.includes("audit") ||
    n.includes("review") ||
    n.includes("verification") ||
    n.includes("e2e")
  )
    return "Testing & QA";
  if (
    n.includes("react") ||
    n.includes("vue") ||
    n.includes("next") ||
    n.includes("expo") ||
    n.includes("flutter") ||
    n.includes("swift") ||
    n.includes("angular") ||
    n.includes("tailwind") ||
    n.includes("shadcn") ||
    n.includes("nuxt") ||
    n.includes("vite") ||
    n.includes("native") ||
    n.includes("responsive") ||
    n.includes("component") ||
    n.includes("frontend") ||
    n.includes("remotion") ||
    n.includes("slidev") ||
    n.includes("stitch")
  )
    return "Frontend";
  if (
    n.includes("api") ||
    n.includes("backend") ||
    n.includes("node") ||
    n.includes("fastapi") ||
    n.includes("nest") ||
    n.includes("laravel") ||
    n.includes("python") ||
    n.includes("golang") ||
    n.includes("async") ||
    n.includes("sql") ||
    n.includes("postgres") ||
    n.includes("supabase") ||
    n.includes("convex") ||
    n.includes("stripe") ||
    n.includes("auth") ||
    n.includes("microservices") ||
    n.includes("error-handling")
  )
    return "Backend";
  if (
    n.includes("docker") ||
    n.includes("github-actions") ||
    n.includes("cicd") ||
    n.includes("deploy") ||
    n.includes("monorepo") ||
    n.includes("turborepo") ||
    n.includes("pnpm") ||
    n.includes("uv-package") ||
    n.includes("git") ||
    n.includes("release") ||
    n.includes("worktree")
  )
    return "DevOps";
  if (
    n.includes("agent") ||
    n.includes("mcp") ||
    n.includes("prompt") ||
    n.includes("langchain") ||
    n.includes("rag") ||
    n.includes("ai-sdk") ||
    n.includes("browser-use") ||
    n.includes("skill-creator") ||
    n.includes("find-skills") ||
    n.includes("remembering") ||
    n.includes("subagent") ||
    n.includes("dispatching") ||
    n.includes("planning") ||
    n.includes("executing") ||
    n.includes("writing-plans") ||
    n.includes("brainstorming") ||
    n.includes("using-superpowers") ||
    n.includes("finishing") ||
    n.includes("requesting") ||
    n.includes("receiving") ||
    n.includes("agentation") ||
    n.includes("clawdirect") ||
    n.includes("instaclaw") ||
    n.includes("nblm") ||
    n.includes("context7")
  )
    return "AI & Agent";
  if (
    n.includes("pdf") ||
    n.includes("pptx") ||
    n.includes("docx") ||
    n.includes("xlsx") ||
    n.includes("doc-coauthor") ||
    n.includes("internal-comms") ||
    n.includes("slack") ||
    n.includes("writing") ||
    n.includes("copy-editing") ||
    n.includes("humanizer") ||
    n.includes("obsidian") ||
    n.includes("baoyu") ||
    n.includes("firecrawl") ||
    n.includes("web-artifacts") ||
    n.includes("comic") ||
    n.includes("image") ||
    n.includes("infographic") ||
    n.includes("url-to-markdown")
  )
    return "Productivity";
  if (n.includes("security") || n.includes("accessibility"))
    return "Security";
  if (
    n.includes("typescript") ||
    n.includes("javascript") ||
    n.includes("architecture") ||
    n.includes("state-management") ||
    n.includes("modern-javascript")
  )
    return "Architecture";
  return "Other";
}

function formatInstalls(n: number, localeTag: string): string {
  return new Intl.NumberFormat(localeTag, {
    notation: n >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(n);
}

const CATEGORIES = [
  "All",
  "Frontend",
  "Backend",
  "Design",
  "AI & Agent",
  "Marketing",
  "Testing & QA",
  "DevOps",
  "Productivity",
  "Architecture",
  "Security",
  "Other",
];

const CATEGORY_ICONS: Record<string, string> = {
  All: "📚",
  Frontend: "🎨",
  Backend: "🔧",
  Design: "✨",
  "AI & Agent": "🤖",
  Marketing: "📈",
  "Testing & QA": "🧪",
  DevOps: "🚀",
  Productivity: "📝",
  Architecture: "🏗️",
  Security: "🔒",
  Other: "📦",
};

const CATEGORY_COLORS: Record<string, string> = {
  Frontend: "text-blue-400 bg-blue-500/15 border-blue-500/30",
  Backend: "text-green-400 bg-green-500/15 border-green-500/30",
  Design: "text-pink-400 bg-pink-500/15 border-pink-500/30",
  "AI & Agent": "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
  Marketing: "text-amber-400 bg-amber-500/15 border-amber-500/30",
  "Testing & QA": "text-cyan-400 bg-cyan-500/15 border-cyan-500/30",
  DevOps: "text-orange-400 bg-orange-500/15 border-orange-500/30",
  Productivity: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
  Architecture: "text-indigo-400 bg-indigo-500/15 border-indigo-500/30",
  Security: "text-red-400 bg-red-500/15 border-red-500/30",
  Other: "text-slate-400 bg-slate-500/15 border-slate-500/30",
};

function categoryLabel(category: string, t: TFunction) {
  switch (category) {
    case "All":
      return t({ ko: "전체", en: "All", ja: "すべて", zh: "全部" });
    case "Frontend":
      return t({ ko: "프론트엔드", en: "Frontend", ja: "フロントエンド", zh: "前端" });
    case "Backend":
      return t({ ko: "백엔드", en: "Backend", ja: "バックエンド", zh: "后端" });
    case "Design":
      return t({ ko: "디자인", en: "Design", ja: "デザイン", zh: "设计" });
    case "AI & Agent":
      return t({ ko: "AI & 에이전트", en: "AI & Agent", ja: "AI & エージェント", zh: "AI 与代理" });
    case "Marketing":
      return t({ ko: "마케팅", en: "Marketing", ja: "マーケティング", zh: "营销" });
    case "Testing & QA":
      return t({ ko: "테스트 & QA", en: "Testing & QA", ja: "テスト & QA", zh: "测试与 QA" });
    case "DevOps":
      return t({ ko: "데브옵스", en: "DevOps", ja: "DevOps", zh: "DevOps" });
    case "Productivity":
      return t({ ko: "생산성", en: "Productivity", ja: "生産性", zh: "效率" });
    case "Architecture":
      return t({ ko: "아키텍처", en: "Architecture", ja: "アーキテクチャ", zh: "架构" });
    case "Security":
      return t({ ko: "보안", en: "Security", ja: "セキュリティ", zh: "安全" });
    case "Other":
      return t({ ko: "기타", en: "Other", ja: "その他", zh: "其他" });
    default:
      return category;
  }
}

function getRankBadge(rank: number) {
  if (rank === 1) return { icon: "🥇", color: "text-yellow-400" };
  if (rank === 2) return { icon: "🥈", color: "text-slate-700" };
  if (rank === 3) return { icon: "🥉", color: "text-amber-600" };
  if (rank <= 10) return { icon: "🏆", color: "text-amber-400" };
  if (rank <= 50) return { icon: "⭐", color: "text-blue-400" };
  return { icon: "", color: "text-slate-400" };
}

function formatFirstSeen(value: string, localeTag: string): string {
  if (!value) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(localeTag, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function localizeAuditStatus(status: string, t: TFunction): string {
  const normalized = status.toLowerCase();
  if (normalized === "pass") {
    return t({ ko: "통과", en: "Pass", ja: "合格", zh: "通过" });
  }
  if (normalized === "warn") {
    return t({ ko: "경고", en: "Warn", ja: "警告", zh: "警告" });
  }
  if (normalized === "pending") {
    return t({ ko: "대기", en: "Pending", ja: "保留", zh: "待处理" });
  }
  if (normalized === "fail") {
    return t({ ko: "실패", en: "Fail", ja: "失敗", zh: "失败" });
  }
  return status;
}

const LEARN_PROVIDER_ORDER: SkillLearnProvider[] = ["claude", "codex", "gemini", "opencode"];
const LEARNED_PROVIDER_ORDER: SkillHistoryProvider[] = [
  "claude",
  "codex",
  "gemini",
  "opencode",
  "copilot",
  "antigravity",
  "api",
];
type UnlearnEffect = "pot" | "hammer";
const ROLE_ORDER: Record<AgentRole, number> = {
  team_leader: 0,
  senior: 1,
  junior: 2,
  intern: 3,
};

function roleLabel(role: AgentRole, t: TFunction): string {
  if (role === "team_leader") return t({ ko: "팀장", en: "Team Lead", ja: "チームリード", zh: "团队负责人" });
  if (role === "senior") return t({ ko: "시니어", en: "Senior", ja: "シニア", zh: "资深" });
  if (role === "junior") return t({ ko: "주니어", en: "Junior", ja: "ジュニア", zh: "初级" });
  return t({ ko: "인턴", en: "Intern", ja: "インターン", zh: "实习生" });
}

function providerLabel(provider: SkillLearnProvider): string {
  if (provider === "claude") return "Claude Code";
  if (provider === "codex") return "Codex";
  if (provider === "gemini") return "Gemini";
  return "OpenCode";
}

function learnedProviderLabel(provider: SkillHistoryProvider): string {
  if (provider === "claude") return "Claude Code";
  if (provider === "codex") return "Codex CLI";
  if (provider === "gemini") return "Gemini CLI";
  if (provider === "opencode") return "OpenCode";
  if (provider === "copilot") return "GitHub Copilot";
  if (provider === "antigravity") return "Antigravity";
  return "API Provider";
}

function CliClaudeLogo({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 400 400" fill="none" aria-hidden="true">
      <path fill="#D97757" d="m124.011 241.251 49.164-27.585.826-2.396-.826-1.333h-2.396l-8.217-.506-28.09-.759-24.363-1.012-23.603-1.266-5.938-1.265L75 197.79l.574-3.661 4.994-3.358 7.153.625 15.808 1.079 23.722 1.637 17.208 1.012 25.493 2.649h4.049l.574-1.637-1.384-1.012-1.079-1.012-24.548-16.635-26.573-17.58-13.919-10.123-7.524-5.129-3.796-4.808-1.637-10.494 6.833-7.525 9.178.624 2.345.625 9.296 7.153 19.858 15.37 25.931 19.098 3.796 3.155 1.519-1.08.185-.759-1.704-2.851-14.104-25.493-15.049-25.931-6.698-10.747-1.772-6.445c-.624-2.649-1.08-4.876-1.08-7.592l7.778-10.561L144.729 75l10.376 1.383 4.37 3.797 6.445 14.745 10.443 23.215 16.197 31.566 4.741 9.364 2.53 8.672.945 2.649h1.637v-1.519l1.332-17.782 2.464-21.832 2.395-28.091.827-7.912 3.914-9.482 7.778-5.129 6.074 2.902 4.994 7.153-.692 4.623-2.969 19.301-5.821 30.234-3.796 20.245h2.21l2.531-2.53 10.241-13.599 17.208-21.511 7.593-8.537 8.857-9.431 5.686-4.488h10.747l7.912 11.76-3.543 12.147-11.067 14.037-9.178 11.895-13.16 17.714-8.216 14.172.759 1.131 1.957-.186 29.727-6.327 16.062-2.901 19.166-3.29 8.672 4.049.944 4.116-3.408 8.419-20.498 5.062-24.042 4.808-35.801 8.469-.439.321.506.624 16.13 1.519 6.9.371h16.888l31.448 2.345 8.217 5.433 4.926 6.647-.827 5.061-12.653 6.445-17.074-4.049-39.85-9.482-13.666-3.408h-1.889v1.131l11.388 11.135 20.87 18.845 26.133 24.295 1.333 6.006-3.357 4.741-3.543-.506-22.962-17.277-8.858-7.777-20.06-16.888H238.5v1.771l4.623 6.765 24.413 36.696 1.265 11.253-1.771 3.661-6.327 2.21-6.951-1.265-14.29-20.06-14.745-22.591-11.895-20.246-1.451.827-7.018 75.601-3.29 3.863-7.592 2.902-6.327-4.808-3.357-7.778 3.357-15.37 4.049-20.06 3.29-15.943 2.969-19.807 1.772-6.58-.118-.439-1.451.186-14.931 20.498-22.709 30.689-17.968 19.234-4.302 1.704-7.458-3.864.692-6.9 4.167-6.141 24.869-31.634 14.999-19.605 9.684-11.32-.068-1.637h-.573l-66.052 42.887-11.759 1.519-5.062-4.741.625-7.778 2.395-2.531 19.858-13.665-.068.067z" />
    </svg>
  );
}

function CliCodexLogo({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M22.282 9.821a5.985 5.985 0 00-.516-4.91 6.046 6.046 0 00-6.51-2.9A6.065 6.065 0 0011.708.413a6.12 6.12 0 00-5.834 4.27 5.984 5.984 0 00-3.996 2.9 6.043 6.043 0 00.743 7.097 5.98 5.98 0 00.51 4.911 6.051 6.051 0 006.515 2.9A5.985 5.985 0 0013.192 24a6.116 6.116 0 005.84-4.27 5.99 5.99 0 003.997-2.9 6.056 6.056 0 00-.747-7.01zM13.192 22.784a4.474 4.474 0 01-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 00.392-.681v-6.737l2.02 1.168a.071.071 0 01.038.052v5.583a4.504 4.504 0 01-4.494 4.494zM3.658 18.607a4.47 4.47 0 01-.535-3.014l.142.085 4.783 2.759a.77.77 0 00.78 0l5.843-3.369v2.332a.08.08 0 01-.033.062L9.74 20.236a4.508 4.508 0 01-6.083-1.63zM2.328 7.847A4.477 4.477 0 014.68 5.879l-.002.159v5.52a.78.78 0 00.391.676l5.84 3.37-2.02 1.166a.08.08 0 01-.073.007L3.917 13.98a4.506 4.506 0 01-1.589-6.132zM19.835 11.94l-5.844-3.37 2.02-1.166a.08.08 0 01.073-.007l4.898 2.794a4.494 4.494 0 01-.69 8.109v-5.68a.79.79 0 00-.457-.68zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 00-.785 0L10.302 9.42V7.088a.08.08 0 01.033-.062l4.898-2.824a4.497 4.497 0 016.612 4.66v.054zM9.076 12.59l-2.02-1.164a.08.08 0 01-.038-.057V5.79A4.498 4.498 0 0114.392 3.2l-.141.08-4.778 2.758a.795.795 0 00-.392.681l-.005 5.87zm1.098-2.358L12 9.019l1.826 1.054v2.109L12 13.235l-1.826-1.054v-2.108z" fill="#10A37F" />
    </svg>
  );
}

function CliGeminiLogo({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 0C12 6.627 6.627 12 0 12c6.627 0 12 5.373 12 12 0-6.627 5.373-12 12-12-6.627 0-12-5.373-12-12z" fill="#6C7FF8" />
    </svg>
  );
}

function cliProviderIcon(provider: SkillHistoryProvider) {
  if (provider === "claude") return <CliClaudeLogo />;
  if (provider === "codex") return <CliCodexLogo />;
  if (provider === "gemini") return <CliGeminiLogo />;
  if (provider === "opencode") return <span className="text-[11px] text-slate-800">⚪</span>;
  if (provider === "copilot") return <span className="text-[11px] text-slate-800">🚀</span>;
  if (provider === "antigravity") return <span className="text-[11px] text-slate-800">🌌</span>;
  return <span className="text-[11px] text-slate-800">🔌</span>;
}

function learningStatusLabel(status: SkillLearnJob["status"] | null, t: TFunction): string {
  if (status === "queued") return t({ ko: "대기중", en: "Queued", ja: "待機中", zh: "排队中" });
  if (status === "running") return t({ ko: "학습중", en: "Running", ja: "学習中", zh: "学习中" });
  if (status === "succeeded") return t({ ko: "완료", en: "Succeeded", ja: "完了", zh: "完成" });
  if (status === "failed") return t({ ko: "실패", en: "Failed", ja: "失敗", zh: "失败" });
  return "-";
}

function pickRepresentativeForProvider(agents: Agent[], provider: Agent["cli_provider"]): Agent | null {
  const candidates = agents.filter((agent) => agent.cli_provider === provider);
  if (candidates.length === 0) return null;
  const sorted = [...candidates].sort((a, b) => {
    const roleGap = ROLE_ORDER[a.role] - ROLE_ORDER[b.role];
    if (roleGap !== 0) return roleGap;
    if (b.stats_xp !== a.stats_xp) return b.stats_xp - a.stats_xp;
    return a.id.localeCompare(b.id);
  });
  return sorted[0];
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */

interface SkillsLibraryProps {
  agents: Agent[];
}

export default function SkillsLibrary({ agents }: SkillsLibraryProps) {
  const { t, localeTag } = useI18n();
  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState<"rank" | "name" | "installs">("rank");
  const [copiedSkill, setCopiedSkill] = useState<string | null>(null);
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, SkillDetail | "loading" | "error">>({});
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [learningSkill, setLearningSkill] = useState<CategorizedSkill | null>(null);
  const [selectedProviders, setSelectedProviders] = useState<SkillLearnProvider[]>([]);
  const [learnJob, setLearnJob] = useState<SkillLearnJob | null>(null);
  const [learnSubmitting, setLearnSubmitting] = useState(false);
  const [learnError, setLearnError] = useState<string | null>(null);
  const [unlearnError, setUnlearnError] = useState<string | null>(null);
  const [unlearningProviders, setUnlearningProviders] = useState<SkillLearnProvider[]>([]);
  const [unlearnEffects, setUnlearnEffects] = useState<Partial<Record<SkillLearnProvider, UnlearnEffect>>>({});
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0);
  const [learnedRows, setLearnedRows] = useState<LearnedSkillEntry[]>([]);
  const unlearnEffectTimersRef = useRef<Partial<Record<SkillLearnProvider, number>>>({});

  const handleCardMouseEnter = useCallback((skill: CategorizedSkill) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      const detailId = skill.skillId || skill.name;
      const key = `${skill.repo}/${detailId}`;
      setHoveredSkill(key);
      if (!detailCache[key]) {
        setDetailCache((prev) => ({ ...prev, [key]: "loading" }));
        getSkillDetail(skill.repo, detailId)
          .then((detail) => {
            setDetailCache((prev) => ({ ...prev, [key]: detail ?? "error" }));
          })
          .catch(() => {
            setDetailCache((prev) => ({ ...prev, [key]: "error" }));
          });
      }
    }, 300);
  }, [detailCache]);

  const handleCardMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHoveredSkill(null);
  }, []);

  useEffect(() => {
    getSkills()
      .then(setSkills)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    getAvailableLearnedSkills({ limit: 500 })
      .then((rows) => {
        if (!cancelled) {
          setLearnedRows(rows);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLearnedRows([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [historyRefreshToken]);

  const categorizedSkills = useMemo<CategorizedSkill[]>(
    () =>
      skills.map((s) => ({
        ...s,
        category: categorize(s.name, s.repo),
        installsDisplay: formatInstalls(s.installs, localeTag),
      })),
    [skills, localeTag]
  );

  const filtered = useMemo(() => {
    let result = categorizedSkills;

    if (selectedCategory !== "All") {
      result = result.filter((s) => s.category === selectedCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.repo.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q)
      );
    }

    if (sortBy === "name") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name, localeTag));
    } else if (sortBy === "installs") {
      result = [...result].sort((a, b) => b.installs - a.installs);
    }
    // rank is default order

    return result;
  }, [categorizedSkills, search, selectedCategory, sortBy, localeTag]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: categorizedSkills.length };
    for (const s of categorizedSkills) {
      counts[s.category] = (counts[s.category] || 0) + 1;
    }
    return counts;
  }, [categorizedSkills]);

  const representatives = useMemo(
    () =>
      LEARN_PROVIDER_ORDER.map((provider) => ({
        provider,
        agent: pickRepresentativeForProvider(agents, provider),
      })),
    [agents]
  );

  const defaultSelectedProviders = useMemo(
    () => representatives.filter((row) => row.agent).map((row) => row.provider),
    [representatives]
  );

  const learnedRepresentatives = useMemo(() => {
    const out = new Map<SkillHistoryProvider, Agent | null>();
    for (const provider of LEARNED_PROVIDER_ORDER) {
      out.set(provider, pickRepresentativeForProvider(agents, provider));
    }
    return out;
  }, [agents]);

  const learnedProvidersBySkill = useMemo(() => {
    const map = new Map<string, SkillHistoryProvider[]>();
    for (const row of learnedRows) {
      const key = `${row.repo}/${row.skill_id}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      const providers = map.get(key)!;
      if (!providers.includes(row.provider)) {
        providers.push(row.provider);
      }
    }
    for (const providers of map.values()) {
      providers.sort(
        (a, b) => LEARNED_PROVIDER_ORDER.indexOf(a) - LEARNED_PROVIDER_ORDER.indexOf(b)
      );
    }
    return map;
  }, [learnedRows]);

  const learningSkillDetailId = learningSkill ? learningSkill.skillId || learningSkill.name : "";
  const learningSkillKey = learningSkill ? `${learningSkill.repo}/${learningSkillDetailId}` : "";
  const modalLearnedProviders = useMemo(() => {
    if (!learningSkillKey) return new Set<SkillHistoryProvider>();
    return new Set(learnedProvidersBySkill.get(learningSkillKey) ?? []);
  }, [learnedProvidersBySkill, learningSkillKey]);

  const learnInProgress =
    learnJob?.status === "queued" || learnJob?.status === "running";
  const preferKoreanName = localeTag.startsWith("ko");

  useEffect(() => {
    return () => {
      for (const timerId of Object.values(unlearnEffectTimersRef.current)) {
        if (typeof timerId === "number") {
          window.clearTimeout(timerId);
        }
      }
    };
  }, []);

  useEffect(() => {
    if (!learnJob || (learnJob.status !== "queued" && learnJob.status !== "running")) {
      return;
    }
    let cancelled = false;
    const timer = window.setInterval(() => {
      getSkillLearningJob(learnJob.id)
        .then((job) => {
          if (!cancelled) {
            setLearnJob(job);
          }
        })
        .catch((e: Error) => {
          if (!cancelled) {
            setLearnError(e.message);
          }
        });
    }, 1500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [learnJob]);

  useEffect(() => {
    if (!learnJob) return;
    if (learnJob.status === "succeeded" || learnJob.status === "failed") {
      setHistoryRefreshToken((prev) => prev + 1);
    }
  }, [learnJob?.id, learnJob?.status]);

  function openLearningModal(skill: CategorizedSkill) {
    const detailId = skill.skillId || skill.name;
    const key = `${skill.repo}/${detailId}`;
    const learnedProviders = new Set(learnedProvidersBySkill.get(key) ?? []);
    const initialSelection = defaultSelectedProviders.filter(
      (provider) => !learnedProviders.has(provider)
    );
    setLearningSkill(skill);
    setSelectedProviders(initialSelection);
    setLearnJob(null);
    setLearnError(null);
    setUnlearnError(null);
    setUnlearningProviders([]);
    setUnlearnEffects({});
  }

  const closeLearningModal = useCallback(() => {
    if (learnInProgress) return;
    setLearningSkill(null);
    setSelectedProviders([]);
    setLearnJob(null);
    setLearnError(null);
    setUnlearnError(null);
    setUnlearningProviders([]);
    setUnlearnEffects({});
  }, [learnInProgress]);

  useEffect(() => {
    if (!learningSkill) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      closeLearningModal();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [learningSkill, closeLearningModal]);

  function toggleProvider(provider: SkillLearnProvider) {
    if (learnInProgress) return;
    setSelectedProviders((prev) => (
      prev.includes(provider)
        ? prev.filter((item) => item !== provider)
        : [...prev, provider]
    ));
  }

  async function handleStartLearning() {
    if (!learningSkill || selectedProviders.length === 0 || learnSubmitting || learnInProgress) return;
    setLearnSubmitting(true);
    setLearnError(null);
    try {
      const job = await startSkillLearning({
        repo: learningSkill.repo,
        skillId: learningSkill.skillId || learningSkill.name,
        providers: selectedProviders,
      });
      setLearnJob(job);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setLearnError(message);
    } finally {
      setLearnSubmitting(false);
    }
  }

  function triggerUnlearnEffect(provider: SkillLearnProvider) {
    const effect: UnlearnEffect = Math.random() < 0.5 ? "pot" : "hammer";
    setUnlearnEffects((prev) => ({ ...prev, [provider]: effect }));
    const currentTimer = unlearnEffectTimersRef.current[provider];
    if (typeof currentTimer === "number") {
      window.clearTimeout(currentTimer);
    }
    unlearnEffectTimersRef.current[provider] = window.setTimeout(() => {
      setUnlearnEffects((prev) => {
        const next = { ...prev };
        delete next[provider];
        return next;
      });
      delete unlearnEffectTimersRef.current[provider];
    }, 1100);
  }

  async function handleUnlearnProvider(provider: SkillLearnProvider) {
    if (!learningSkill) return;
    if (learnInProgress) return;
    if (unlearningProviders.includes(provider)) return;
    const skillId = learningSkill.skillId || learningSkill.name;
    setUnlearnError(null);
    setUnlearningProviders((prev) => [...prev, provider]);
    try {
      const result = await unlearnSkill({
        provider,
        repo: learningSkill.repo,
        skillId,
      });
      if (result.removed > 0) {
        setLearnedRows((prev) => (
          prev.filter((row) => !(
            row.provider === provider &&
            row.repo === learningSkill.repo &&
            row.skill_id === skillId
          ))
        ));
        triggerUnlearnEffect(provider);
      }
      setHistoryRefreshToken((prev) => prev + 1);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setUnlearnError(message);
    } finally {
      setUnlearningProviders((prev) => prev.filter((item) => item !== provider));
    }
  }

  function handleCopy(skill: CategorizedSkill) {
    const cmd = `npx skills add ${skill.repo}`;
    navigator.clipboard.writeText(cmd).then(() => {
      setCopiedSkill(skill.name);
      setTimeout(() => setCopiedSkill(null), 2000);
    });
  }

  const [installAllInProgress, setInstallAllInProgress] = useState(false);
  async function handleInstallAll() {
    if (installAllInProgress) return;
    setInstallAllInProgress(true);
    const defaultProviders = LEARN_PROVIDER_ORDER;
    try {
      for (const skill of skills) {
        await startSkillLearning({
          repo: skill.repo,
          skillId: skill.skillId || skill.name,
          providers: defaultProviders,
        });
      }
      setHistoryRefreshToken((prev) => prev + 1);
    } catch (e) {
      console.error(e);
    } finally {
      setInstallAllInProgress(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <div className="text-slate-400 text-sm">
            {t({
              ko: "skills.sh 데이터 로딩중...",
              en: "Loading skills.sh data...",
              ja: "skills.sh データを読み込み中...",
              zh: "正在加载 skills.sh 数据...",
            })}
          </div>
        </div>
      </div>
    );
  }

  if (error && skills.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <div className="text-slate-400 text-sm">
            {t({
              ko: "스킬 데이터를 불러올 수 없습니다",
              en: "Unable to load skills data",
              ja: "スキルデータを読み込めません",
              zh: "无法加载技能数据",
            })}
          </div>
          <div className="text-slate-400 text-xs mt-1">{error}</div>
          <button
            onClick={() => {
              setLoading(true);
              setError(null);
              getSkills()
                .then(setSkills)
                .catch((e) => setError(e.message))
                .finally(() => setLoading(false));
            }}
            className="mt-4 px-4 py-2 text-sm bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition-all"
          >
            {t({ ko: "다시 시도", en: "Retry", ja: "再試行", zh: "重试" })}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-transparent border border-white/5 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[22px] font-bold text-white tracking-tight flex items-center gap-2">
              <span className="text-2xl">📚</span>
              {t({
                ko: "Agent Skills 문서고",
                en: "Skill Library",
                ja: "Agent Skills ライブラリ",
                zh: "Agent Skills 资料库",
              })}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {t({
                ko: "AI 에이전트 스킬 디렉토리 · skills.sh 실시간 데이터",
                en: "AI agent skill directory · live skills.sh data",
                ja: "AI エージェントスキルディレクトリ · skills.sh リアルタイムデータ",
                zh: "AI 代理技能目录 · skills.sh 实时数据",
              })}
            </p>
          </div>
          <div className="text-right flex items-center gap-4">
            <button
              onClick={handleInstallAll}
              disabled={installAllInProgress}
              className="px-4 py-1.5 text-sm bg-[#162032] hover:bg-[#1e293b] text-slate-300 font-bold transition-all disabled:opacity-50 rounded-lg flex items-center gap-2"
            >
              {installAllInProgress
                ? t({ ko: "설치 중...", en: "Installing...", ja: "インストール中...", zh: "安装中..." })
                : t({ ko: "전체 설치", en: "Install All", ja: "すべてインストール", zh: "全部安装" })}
            </button>
            <div className="text-right flex flex-col items-end">
              <div className="text-2xl font-bold text-indigo-400 leading-none">{skills.length}</div>
              <div className="text-xs text-slate-400 font-semibold mt-0.5">
                {t({ ko: "등록된 스킬", en: "Registered skills", ja: "登録済みスキル", zh: "已收录技能" })}
              </div>
            </div>
          </div>
        </div>

        {/* Search & Sort */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t({
                ko: "스킬 검색... (이름, 저장소, 카테고리)",
                en: "Search skills... (name, repo, category)",
                ja: "スキル検索...（名前・リポジトリ・カテゴリ）",
                zh: "搜索技能...（名称、仓库、分类）",
              })}
              className="w-full bg-[#162032] border border-white/5 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                &times;
              </button>
            )}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-[#162032] border border-white/5 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-300 focus:outline-none focus:border-indigo-500 transition-all"
          >
            <option value="rank">{t({ ko: "순위순", en: "By Rank", ja: "順位順", zh: "按排名" })}</option>
            <option value="installs">{t({ ko: "설치순", en: "By Installs", ja: "インストール順", zh: "按安装量" })}</option>
            <option value="name">{t({ ko: "이름순", en: "By Name", ja: "名前順", zh: "按名称" })}</option>
          </select>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedCategory === cat
              ? "bg-indigo-500 text-white border border-indigo-400"
              : "bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10 hover:text-white"
              }`}
          >
            {CATEGORY_ICONS[cat]} {categoryLabel(cat, t)}
            <span className="ml-1 text-slate-400">
              {categoryCounts[cat] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Results count */}
      <div className="text-xs text-slate-400 px-1">
        {filtered.length}
        {t({ ko: "개 스킬 표시중", en: " skills shown", ja: "件のスキルを表示中", zh: " 个技能已显示" })}
        {search &&
          ` · "${search}" ${t({
            ko: "검색 결과",
            en: "search results",
            ja: "検索結果",
            zh: "搜索结果",
          })}`}
      </div>

      <div className="rounded-xl border border-white/5 bg-black/20 backdrop-blur-sm shadow-[0_4px_24px_rgba(0,0,0,0.3)] p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-bold tracking-wider text-white">
            {t({
              ko: "학습 메모리",
              en: "Learning Memory",
              ja: "学習メモリ",
              zh: "学习记忆",
            })}
          </div>
          <div className="text-[11px] text-slate-400">
            {t({
              ko: "CLI별 스킬 이력",
              en: "Per-CLI skill history",
              ja: "CLI別スキル履歴",
              zh: "按 CLI 的技能记录",
            })}
          </div>
        </div>
        <SkillHistoryPanel
          agents={agents}
          refreshToken={historyRefreshToken}
          onLearningDataChanged={() => setHistoryRefreshToken((prev) => prev + 1)}
          className="h-[380px]"
        />
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((skill) => {
          const badge = getRankBadge(skill.rank);
          const catColor =
            CATEGORY_COLORS[skill.category] || CATEGORY_COLORS.Other;
          const detailId = skill.skillId || skill.name;
          const detailKey = `${skill.repo}/${detailId}`;
          const learnedProviders = learnedProvidersBySkill.get(detailKey) ?? [];
          const learnedProvidersForCard = learnedProviders.slice(0, 4);
          const isHovered = hoveredSkill === detailKey;
          const detail = detailCache[detailKey];
          return (
            <div
              key={`${skill.rank}-${detailId}`}
              className="relative bg-[#0e0e11] border border-white/5 rounded-xl p-4 hover:bg-white/5 hover:border-white/10 transition-all group"
              onMouseEnter={() => handleCardMouseEnter(skill)}
              onMouseLeave={handleCardMouseLeave}
            >
              {/* Top row: rank + name + learned providers */}
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/40 shadow-inner text-sm font-bold border border-white/5">
                    {badge.icon ? (
                      <span>{badge.icon}</span>
                    ) : (
                      <span className={badge.color}>#{skill.rank}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-white tracking-wide">
                      {skill.name}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-slate-400">
                      {skill.repo}
                    </div>
                  </div>
                </div>
                {learnedProvidersForCard.length > 0 && (
                  <div className="grid w-[64px] shrink-0 grid-cols-2 gap-1 rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-1">
                    {learnedProvidersForCard.map((provider) => {
                      const agent = learnedRepresentatives.get(provider) ?? null;
                      return (
                        <span
                          key={`${detailKey}-${provider}`}
                          className="inline-flex h-5 w-6 items-center justify-center gap-0.5 rounded-md border border-emerald-500/20 bg-black/60 shadow-inner"
                          title={`${learnedProviderLabel(provider)}${agent ? ` · ${agent.name}` : ""}`}
                        >
                          <span className="flex h-2.5 w-2.5 items-center justify-center">
                            {cliProviderIcon(provider)}
                          </span>
                          <span className="h-2.5 w-2.5 overflow-hidden rounded-[3px] bg-white/80">
                            <AgentAvatar
                              agent={agent ?? undefined}
                              agents={agents}
                              size={10}
                              rounded="xl"
                            />
                          </span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bottom row: category + installs + learn/copy */}
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full border ${catColor}`}
                >
                  {CATEGORY_ICONS[skill.category]} {categoryLabel(skill.category, t)}
                </span>
                <div className="flex items-center justify-between gap-2 shrink-0">
                  <span className="text-xs text-slate-400 font-semibold tracking-tight">
                    <span className="text-indigo-400">
                      {skill.installsDisplay}
                    </span>{" "}
                    {t({ ko: "설치", en: "installs", ja: "インストール", zh: "安装" })}
                  </span>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => openLearningModal(skill)}
                      className="px-3 py-1.5 text-[10px] font-bold bg-indigo-500 text-white border border-transparent rounded-md hover:bg-indigo-400 transition-all shadow-none"
                      title={t({
                        ko: "CLI 대표자에게 스킬 학습시키기",
                        en: "Teach this skill to selected CLI leaders",
                        ja: "選択したCLI代表にこのスキルを学習させる",
                        zh: "让所选 CLI 代表学习此技能",
                      })}
                    >
                      {t({ ko: "학습", en: "Learn", ja: "学習", zh: "学习" })}
                    </button>
                    <button
                      onClick={() => handleCopy(skill)}
                      className="px-2 py-1 text-[10px] font-bold bg-white/5 text-slate-400 border border-white/10 rounded-md hover:bg-white/10 hover:text-white transition-all"
                      title={`npx skills add ${skill.repo}`}
                    >
                      {copiedSkill === skill.name
                        ? t({ ko: "복사됨", en: "Copied", ja: "コピー済み", zh: "已复制" })
                        : t({ ko: "복사", en: "Copy", ja: "コピー", zh: "复制" })}
                    </button>
                  </div>
                </div>
              </div>

              {/* Hover Detail Tooltip */}
              {
                isHovered && (
                  <div
                    ref={tooltipRef}
                    className="absolute z-50 left-0 right-0 top-full mt-2 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)] animate-in fade-in slide-in-from-top-2 duration-300 ring-1 ring-white/5"
                    onMouseEnter={() => {
                      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
                      setHoveredSkill(detailKey);
                    }}
                    onMouseLeave={handleCardMouseLeave}
                  >
                    {detail === "loading" && (
                      <div className="flex items-center gap-2 text-slate-400 text-xs">
                        <div className="animate-spin w-3 h-3 border border-blue-500 border-t-transparent rounded-full" />
                        {t({ ko: "상세정보 로딩중...", en: "Loading details...", ja: "詳細を読み込み中...", zh: "加载详情..." })}
                      </div>
                    )}
                    {detail === "error" && (
                      <div className="text-slate-400 text-xs">
                        {t({ ko: "상세정보를 불러올 수 없습니다", en: "Could not load details", ja: "詳細を読み込めません", zh: "无法加载详情" })}
                      </div>
                    )}
                    {detail && typeof detail === "object" && (
                      <div className="space-y-3">
                        {detail.title && (
                          <div className="text-sm font-bold text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">
                            {detail.title}
                          </div>
                        )}

                        {/* Description */}
                        {detail.description && (
                          <p className="text-xs text-slate-400 leading-relaxed font-medium">
                            {detail.description}
                          </p>
                        )}

                        {/* When to use */}
                        {detail.whenToUse.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                              {t({ ko: "사용 시점", en: "When to Use", ja: "使うタイミング", zh: "适用场景" })}
                            </div>
                            <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-300 font-medium">
                              {detail.whenToUse.slice(0, 6).map((item, idx) => (
                                <li key={`${detailKey}-when-${idx}`} className="marker:text-cyan-400">
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Meta row */}
                        <div className="flex flex-wrap gap-3 text-[11px]">
                          {detail.weeklyInstalls && (
                            <span className="text-slate-500">
                              <span className="text-cyan-400 font-bold drop-shadow-[0_0_4px_rgba(34,211,238,0.5)]">{detail.weeklyInstalls}</span>
                              {" "}{t({ ko: "주간 설치", en: "weekly", ja: "週間", zh: "周安装" })}
                            </span>
                          )}
                          {detail.firstSeen && (
                            <span className="text-slate-400">
                              {t({ ko: "최초 등록", en: "First seen", ja: "初登録", zh: "首次发现" })}: {formatFirstSeen(detail.firstSeen, localeTag)}
                            </span>
                          )}
                        </div>

                        {/* Platform installs */}
                        {detail.platforms.length > 0 && (
                          <div>
                            <div className="text-[10px] text-slate-400 mb-1.5 uppercase tracking-wider">
                              {t({ ko: "플랫폼별 설치", en: "Platform Installs", ja: "プラットフォーム別", zh: "平台安装量" })}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {detail.platforms.slice(0, 6).map((p) => (
                                <span
                                  key={p.name}
                                  className="text-[10px] px-2 py-0.5 bg-black/40 border border-white/5 rounded-md text-slate-400 font-bold"
                                >
                                  {p.name} <span className="text-cyan-400">{p.installs}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Audits */}
                        {detail.audits.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {detail.audits.map((a) => (
                              <span
                                key={a.name}
                                className={`text-[10px] px-2 py-0.5 rounded-md border ${a.status.toLowerCase() === "pass"
                                  ? "text-green-400 bg-green-500/10 border-green-500/30"
                                  : a.status.toLowerCase() === "warn" || a.status.toLowerCase() === "pending"
                                    ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
                                    : "text-red-400 bg-red-500/10 border-red-500/30"
                                  }`}
                              >
                                {a.name}: {localizeAuditStatus(a.status, t)}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Install command */}
                        <div className="text-[10px] text-cyan-300 font-mono bg-black/60 shadow-inner border border-white/5 rounded-md px-2 py-2 truncate transition-all hover:bg-black/80">
                          $ {detail.installCommand}
                        </div>
                      </div>
                    )}
                  </div>
                )
              }
            </div >
          );
        })}
      </div >

      {/* Empty state */}
      {
        filtered.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🔍</div>
            <div className="text-slate-400 text-sm">
              {t({ ko: "검색 결과가 없습니다", en: "No search results", ja: "検索結果はありません", zh: "没有搜索结果" })}
            </div>
            <div className="text-slate-400 text-xs mt-1">
              {t({
                ko: "다른 키워드로 검색해보세요",
                en: "Try a different keyword",
                ja: "別のキーワードで検索してください",
                zh: "请尝试其他关键词",
              })}
            </div>
          </div>
        )
      }

      {
        learningSkill && (
          <div className="skills-learn-modal fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="skills-learn-modal-card w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0e] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)]">
              <div className="flex items-start justify-between gap-4 border-b border-white/5 px-5 py-4 bg-white/5">
                <div>
                  <h3 className="text-base font-bold text-white tracking-wider drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                    {t({
                      ko: "스킬 학습 스쿼드",
                      en: "Skill Learning Squad",
                      ja: "スキル学習スクワッド",
                      zh: "技能学习小队",
                    })}
                  </h3>
                  <div className="mt-1 text-xs font-medium text-slate-400">
                    {learningSkill.name} · {learningSkill.repo}
                  </div>
                </div>
                <button
                  onClick={closeLearningModal}
                  disabled={learnInProgress}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${learnInProgress
                    ? "cursor-not-allowed border-white/5 text-slate-600"
                    : "border-white/10 text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                >
                  {learnInProgress
                    ? t({ ko: "학습중", en: "Running", ja: "実行中", zh: "进行中" })
                    : t({ ko: "닫기", en: "Close", ja: "閉じる", zh: "关闭" })}
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto px-5 py-6 max-h-[calc(90vh-72px)]">
                <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 px-4 py-3 shadow-inner">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">
                    {t({
                      ko: "실행 명령",
                      en: "Install command",
                      ja: "実行コマンド",
                      zh: "执行命令",
                    })}
                  </div>
                  <div className="mt-1.5 text-[11px] font-mono text-cyan-100 break-all select-all">
                    npx skills add {learningSkill.repo}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-slate-400">
                    {t({
                      ko: "CLI 대표자를 선택하세요 (복수 선택 가능)",
                      en: "Select CLI representatives (multi-select)",
                      ja: "CLI代表を選択してください（複数選択可）",
                      zh: "选择 CLI 代表（可多选）",
                    })}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {selectedProviders.length}
                    {t({
                      ko: "명 선택됨",
                      en: " selected",
                      ja: "名を選択",
                      zh: " 已选择",
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {representatives.map((row) => {
                    const isSelected = selectedProviders.includes(row.provider);
                    const hasAgent = !!row.agent;
                    const isAnimating = learnInProgress && isSelected && hasAgent;
                    const isAlreadyLearned = modalLearnedProviders.has(row.provider);
                    const isUnlearning = unlearningProviders.includes(row.provider);
                    const unlearnEffect = unlearnEffects[row.provider];
                    const isHitAnimating = !!unlearnEffect;
                    const displayName = row.agent
                      ? (preferKoreanName ? row.agent.name_ko || row.agent.name : row.agent.name || row.agent.name_ko)
                      : t({
                        ko: "배치된 인원 없음",
                        en: "No assigned member",
                        ja: "担当メンバーなし",
                        zh: "暂无成员",
                      });
                    return (
                      <div
                        key={row.provider}
                        role={hasAgent ? "button" : undefined}
                        tabIndex={hasAgent ? 0 : -1}
                        onClick={() => {
                          if (!hasAgent || learnInProgress) return;
                          toggleProvider(row.provider);
                        }}
                        onKeyDown={(event) => {
                          if (!hasAgent || learnInProgress) return;
                          const target = event.target as HTMLElement | null;
                          if (target?.closest("button")) return;
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            toggleProvider(row.provider);
                          }
                        }}
                        aria-disabled={!hasAgent || learnInProgress}
                        className={`relative overflow-hidden rounded-xl border p-3.5 text-left transition-all ${!hasAgent
                          ? "cursor-not-allowed border-white/5 bg-black/20 opacity-40 grayscale"
                          : isSelected
                            ? "border-cyan-500/50 bg-cyan-500/10 shadow-[inset_0_0_15px_rgba(6,182,212,0.1)]"
                            : "border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/10"
                          }`}
                      >
                        {isAnimating && (
                          <div className="pointer-events-none absolute inset-0 overflow-hidden">
                            {Array.from({ length: 6 }).map((_, idx) => (
                              <span
                                key={`${row.provider}-book-${idx}`}
                                className="learn-book-drop"
                                style={{
                                  left: `${8 + idx * 15}%`,
                                  animationDelay: `${idx * 0.15}s`,
                                }}
                              >
                                {idx % 2 === 0 ? "📘" : "📙"}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="relative z-10 flex items-center gap-3">
                          <div className={`relative ${isAnimating ? "learn-avatar-reading" : ""} ${isHitAnimating ? "unlearn-avatar-hit" : ""}`}>
                            <AgentAvatar
                              agent={row.agent ?? undefined}
                              agents={agents}
                              size={50}
                              rounded="xl"
                            />
                            {isAnimating && (
                              <span className="learn-reading-book">📖</span>
                            )}
                            {unlearnEffect === "pot" && (
                              <span className="unlearn-pot-drop">🪴</span>
                            )}
                            {unlearnEffect === "hammer" && (
                              <span className="unlearn-hammer-swing">🔨</span>
                            )}
                            {isHitAnimating && (
                              <span className="unlearn-hit-text">
                                {t({ ko: "깡~", en: "Bonk!", ja: "ゴン!", zh: "咣~" })}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] text-slate-400">{providerLabel(row.provider)}</div>
                            <div className="text-sm font-medium text-slate-200 truncate">{displayName}</div>
                            <div className="text-[11px] text-slate-400">
                              {row.agent
                                ? roleLabel(row.agent.role, t)
                                : t({
                                  ko: "사용 불가",
                                  en: "Unavailable",
                                  ja: "利用不可",
                                  zh: "不可用",
                                })}
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1.5">
                            <div
                              className={`text-[11px] px-2 py-0.5 rounded-full border ${isAlreadyLearned
                                ? "border-emerald-400/50 text-emerald-300 bg-emerald-500/15"
                                : isSelected
                                  ? "border-blue-400/50 text-blue-300 bg-blue-500/15"
                                  : "border-slate-200 text-slate-400 bg-slate-700/40"
                                }`}
                            >
                              {isAlreadyLearned
                                ? t({ ko: "학습됨", en: "Learned", ja: "学習済み", zh: "已学习" })
                                : isSelected
                                  ? t({ ko: "선택됨", en: "Selected", ja: "選択", zh: "已选" })
                                  : t({ ko: "대기", en: "Idle", ja: "待機", zh: "待命" })}
                            </div>
                            {isAlreadyLearned && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleUnlearnProvider(row.provider);
                                }}
                                disabled={learnInProgress || isUnlearning}
                                className={`skill-unlearn-btn rounded-md border px-2 py-0.5 text-[10px] transition-all ${learnInProgress || isUnlearning
                                  ? "cursor-not-allowed border-slate-100 text-slate-600"
                                  : "border-rose-500/35 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                                  }`}
                              >
                                {isUnlearning
                                  ? t({ ko: "취소중...", en: "Unlearning...", ja: "取消中...", zh: "取消中..." })
                                  : t({ ko: "학습 취소", en: "Unlearn", ja: "学習取消", zh: "取消学习" })}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="text-slate-300">
                      {t({ ko: "작업 상태", en: "Job status", ja: "ジョブ状態", zh: "任务状态" })}:{" "}
                      <span
                        className={`font-medium ${learnJob?.status === "succeeded"
                          ? "text-emerald-300"
                          : learnJob?.status === "failed"
                            ? "text-rose-300"
                            : learnJob?.status === "running" || learnJob?.status === "queued"
                              ? "text-amber-300"
                              : "text-slate-400"
                          }`}
                      >
                        {learningStatusLabel(learnJob?.status ?? null, t)}
                      </span>
                    </div>
                    {learnJob?.completedAt && (
                      <div className="text-[11px] text-slate-400">
                        {new Intl.DateTimeFormat(localeTag, {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        }).format(new Date(learnJob.completedAt))}
                      </div>
                    )}
                  </div>

                  {learnError && (
                    <div className="mt-2 text-[11px] text-rose-300">{learnError}</div>
                  )}
                  {unlearnError && (
                    <div className="mt-2 text-[11px] text-rose-300">{unlearnError}</div>
                  )}
                  {learnJob?.error && (
                    <div className="mt-2 text-[11px] text-rose-300">{learnJob.error}</div>
                  )}

                  {learnJob && (
                    <div className="mt-2 rounded-lg border border-black/50 bg-[#0A0A0A] shadow-inner p-2 font-mono text-[10px] text-slate-300 max-h-32 overflow-y-auto space-y-1">
                      <div className="text-cyan-400 font-bold">$ {learnJob.command}</div>
                      {learnJob.logTail.length > 0 ? (
                        learnJob.logTail.slice(-10).map((line, idx) => (
                          <div key={`${learnJob.id}-log-${idx}`}>{line}</div>
                        ))
                      ) : (
                        <div className="text-slate-600">
                          {t({
                            ko: "로그가 아직 없습니다",
                            en: "No logs yet",
                            ja: "ログはまだありません",
                            zh: "暂无日志",
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={closeLearningModal}
                    disabled={learnInProgress}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${learnInProgress
                      ? "cursor-not-allowed border-white/5 text-slate-600 bg-transparent"
                      : "border-white/10 text-slate-300 hover:bg-white/5 hover:text-white"
                      }`}
                  >
                    {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
                  </button>
                  <button
                    onClick={handleStartLearning}
                    disabled={
                      selectedProviders.length === 0 ||
                      learnSubmitting ||
                      learnInProgress ||
                      defaultSelectedProviders.length === 0
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${selectedProviders.length === 0 || learnInProgress || defaultSelectedProviders.length === 0
                      ? "cursor-not-allowed border-slate-100 text-slate-600"
                      : "border-emerald-500/50 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
                      }`}
                  >
                    {learnSubmitting || learnInProgress
                      ? t({ ko: "학습중...", en: "Learning...", ja: "学習中...", zh: "学习中..." })
                      : t({ ko: "학습 시작", en: "Start Learning", ja: "学習開始", zh: "开始学习" })}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Footer note */}
      <div className="text-center text-xs text-slate-600 py-4">
        {t({
          ko: "데이터 출처: skills.sh · 설치: npx skills add <owner/repo>",
          en: "Source: skills.sh · Install: npx skills add <owner/repo>",
          ja: "データソース: skills.sh · インストール: npx skills add <owner/repo>",
          zh: "数据来源: skills.sh · 安装: npx skills add <owner/repo>",
        })}
      </div>
    </div >
  );
}
