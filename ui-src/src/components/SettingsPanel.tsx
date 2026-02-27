import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { CompanySettings, CliStatusMap, CliProvider, CliModelInfo, Agent } from "../types";
import * as api from "../api";
import type { OAuthStatus, OAuthConnectProvider, DeviceCodeStart, GatewayTarget, ApiProvider, ApiProviderType } from "../api";
import AgentAvatar, { buildSpriteMap } from "./AgentAvatar";

export interface OAuthCallbackResult {
  ok: boolean;
  provider: string;
  error?: string;
}

interface SettingsPanelProps {
  settings: CompanySettings;
  agents: Agent[];
  cliStatus: CliStatusMap | null;
  onSave: (settings: CompanySettings) => void;
  onRefreshCli: () => void;
  oauthResult?: OAuthCallbackResult | null;
  onOauthResultClear?: () => void;
}

type Locale = "ko" | "en" | "ja" | "zh";
type TFunction = (messages: Record<Locale, string>) => string;
type LocalSettings = Omit<CompanySettings, "language"> & { language: Locale };

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

// SVG logos matching OfficeView CLI Usage icons
function CliClaudeLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 400 400" fill="none">
      <path fill="#D97757" d="m124.011 241.251 49.164-27.585.826-2.396-.826-1.333h-2.396l-8.217-.506-28.09-.759-24.363-1.012-23.603-1.266-5.938-1.265L75 197.79l.574-3.661 4.994-3.358 7.153.625 15.808 1.079 23.722 1.637 17.208 1.012 25.493 2.649h4.049l.574-1.637-1.384-1.012-1.079-1.012-24.548-16.635-26.573-17.58-13.919-10.123-7.524-5.129-3.796-4.808-1.637-10.494 6.833-7.525 9.178.624 2.345.625 9.296 7.153 19.858 15.37 25.931 19.098 3.796 3.155 1.519-1.08.185-.759-1.704-2.851-14.104-25.493-15.049-25.931-6.698-10.747-1.772-6.445c-.624-2.649-1.08-4.876-1.08-7.592l7.778-10.561L144.729 75l10.376 1.383 4.37 3.797 6.445 14.745 10.443 23.215 16.197 31.566 4.741 9.364 2.53 8.672.945 2.649h1.637v-1.519l1.332-17.782 2.464-21.832 2.395-28.091.827-7.912 3.914-9.482 7.778-5.129 6.074 2.902 4.994 7.153-.692 4.623-2.969 19.301-5.821 30.234-3.796 20.245h2.21l2.531-2.53 10.241-13.599 17.208-21.511 7.593-8.537 8.857-9.431 5.686-4.488h10.747l7.912 11.76-3.543 12.147-11.067 14.037-9.178 11.895-13.16 17.714-8.216 14.172.759 1.131 1.957-.186 29.727-6.327 16.062-2.901 19.166-3.29 8.672 4.049.944 4.116-3.408 8.419-20.498 5.062-24.042 4.808-35.801 8.469-.439.321.506.624 16.13 1.519 6.9.371h16.888l31.448 2.345 8.217 5.433 4.926 6.647-.827 5.061-12.653 6.445-17.074-4.049-39.85-9.482-13.666-3.408h-1.889v1.131l11.388 11.135 20.87 18.845 26.133 24.295 1.333 6.006-3.357 4.741-3.543-.506-22.962-17.277-8.858-7.777-20.06-16.888H238.5v1.771l4.623 6.765 24.413 36.696 1.265 11.253-1.771 3.661-6.327 2.21-6.951-1.265-14.29-20.06-14.745-22.591-11.895-20.246-1.451.827-7.018 75.601-3.29 3.863-7.592 2.902-6.327-4.808-3.357-7.778 3.357-15.37 4.049-20.06 3.29-15.943 2.969-19.807 1.772-6.58-.118-.439-1.451.186-14.931 20.498-22.709 30.689-17.968 19.234-4.302 1.704-7.458-3.864.692-6.9 4.167-6.141 24.869-31.634 14.999-19.605 9.684-11.32-.068-1.637h-.573l-66.052 42.887-11.759 1.519-5.062-4.741.625-7.778 2.395-2.531 19.858-13.665-.068.067z" />
    </svg>
  );
}

function CliChatGPTLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.282 9.821a5.985 5.985 0 00-.516-4.91 6.046 6.046 0 00-6.51-2.9A6.065 6.065 0 0011.708.413a6.12 6.12 0 00-5.834 4.27 5.984 5.984 0 00-3.996 2.9 6.043 6.043 0 00.743 7.097 5.98 5.98 0 00.51 4.911 6.051 6.051 0 006.515 2.9A5.985 5.985 0 0013.192 24a6.116 6.116 0 005.84-4.27 5.99 5.99 0 003.997-2.9 6.056 6.056 0 00-.747-7.01zM13.192 22.784a4.474 4.474 0 01-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 00.392-.681v-6.737l2.02 1.168a.071.071 0 01.038.052v5.583a4.504 4.504 0 01-4.494 4.494zM3.658 18.607a4.47 4.47 0 01-.535-3.014l.142.085 4.783 2.759a.77.77 0 00.78 0l5.843-3.369v2.332a.08.08 0 01-.033.062L9.74 20.236a4.508 4.508 0 01-6.083-1.63zM2.328 7.847A4.477 4.477 0 014.68 5.879l-.002.159v5.52a.78.78 0 00.391.676l5.84 3.37-2.02 1.166a.08.08 0 01-.073.007L3.917 13.98a4.506 4.506 0 01-1.589-6.132zM19.835 11.94l-5.844-3.37 2.02-1.166a.08.08 0 01.073-.007l4.898 2.794a4.494 4.494 0 01-.69 8.109v-5.68a.79.79 0 00-.457-.68zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 00-.785 0L10.302 9.42V7.088a.08.08 0 01.033-.062l4.898-2.824a4.497 4.497 0 016.612 4.66v.054zM9.076 12.59l-2.02-1.164a.08.08 0 01-.038-.057V5.79A4.498 4.498 0 0114.392 3.2l-.141.08-4.778 2.758a.795.795 0 00-.392.681l-.005 5.87zm1.098-2.358L12 9.019l1.826 1.054v2.109L12 13.235l-1.826-1.054v-2.108z" fill="#10A37F" />
    </svg>
  );
}

function CliGeminiLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 0C12 6.627 6.627 12 0 12c6.627 0 12 5.373 12 12 0-6.627 5.373-12 12-12-6.627 0-12-5.373-12-12z" fill="url(#cli_gemini_grad)" />
      <defs>
        <linearGradient id="cli_gemini_grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4285F4" />
          <stop offset="1" stopColor="#886FBF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const CLI_INFO: Record<string, { label: string; icon: React.ReactNode }> = {
  claude: { label: "Claude Code", icon: <CliClaudeLogo /> },
  codex: { label: "Codex CLI", icon: <CliChatGPTLogo /> },
  gemini: { label: "Gemini CLI", icon: <CliGeminiLogo /> },
  opencode: { label: "OpenCode", icon: "⚪" },
  copilot: { label: "GitHub Copilot", icon: "\uD83D\uDE80" },
  antigravity: { label: "Antigravity", icon: "\uD83C\uDF0C" },
};

const OAUTH_INFO: Record<string, { label: string }> = {
  "github-copilot": { label: "GitHub Copilot" },
  antigravity: { label: "Antigravity" },
};

// SVG Logo components for OAuth providers
function GitHubCopilotLogo({ className }: { className?: string }) {
  return (
    <svg className={className || "w-5 h-5"} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function AntigravityLogo({ className }: { className?: string }) {
  return (
    <svg className={className || "w-5 h-5"} viewBox="0 0 24 24" fill="#1a73e8">
      <path d="m19.94,20.59c1.09.82,2.73.27,1.23-1.23-4.5-4.36-3.55-16.36-9.14-16.36S7.39,15,2.89,19.36c-1.64,1.64.14,2.05,1.23,1.23,4.23-2.86,3.95-7.91,7.91-7.91s3.68,5.05,7.91,7.91Z" />
    </svg>
  );
}

const CONNECTABLE_PROVIDERS: Array<{
  id: OAuthConnectProvider;
  label: string;
  Logo: ({ className }: { className?: string }) => React.ReactElement;
  description: string;
}> = [
    { id: "github-copilot", label: "GitHub Copilot", Logo: GitHubCopilotLogo, description: "GitHub OAuth (Copilot)" },
    { id: "antigravity", label: "Antigravity", Logo: AntigravityLogo, description: "Google OAuth (Antigravity)" },
  ];

export default function SettingsPanel({
  settings,
  cliStatus,
  onSave,
  onRefreshCli,
  oauthResult,
  onOauthResultClear,
}: SettingsPanelProps) {
  const [form, setForm] = useState<LocalSettings>(settings as LocalSettings);
  const { t, localeTag } = useI18n(form.language);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<"general" | "cli" | "oauth" | "api" | "gateway">(
    oauthResult ? "oauth" : "general"
  );
  const [oauthStatus, setOauthStatus] = useState<OAuthStatus | null>(null);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [savingAccountId, setSavingAccountId] = useState<string | null>(null);
  const [accountDrafts, setAccountDrafts] = useState<Record<string, { label: string; modelOverride: string; priority: string }>>({});

  // OAuth model selection state
  const [models, setModels] = useState<Record<string, string[]> | null>(null);
  const [modelsLoading, setModelsLoading] = useState(false);

  // CLI model selection state
  const [cliModels, setCliModels] = useState<Record<string, CliModelInfo[]> | null>(null);
  const [cliModelsLoading, setCliModelsLoading] = useState(false);

  // GitHub Device Code flow state
  const [deviceCode, setDeviceCode] = useState<DeviceCodeStart | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<string | null>(null); // "polling" | "complete" | "error" | "expired"
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // API Providers state
  const [apiProviders, setApiProviders] = useState<ApiProvider[]>([]);
  const [apiProvidersLoading, setApiProvidersLoading] = useState(false);
  const [apiAddMode, setApiAddMode] = useState(false);
  const [apiEditingId, setApiEditingId] = useState<string | null>(null);
  const [apiForm, setApiForm] = useState<{ name: string; type: ApiProviderType; base_url: string; api_key: string }>({
    name: "", type: "openai", base_url: "https://api.openai.com/v1", api_key: "",
  });
  const [apiSaving, setApiSaving] = useState(false);
  const [apiTesting, setApiTesting] = useState<string | null>(null);
  const [apiTestResult, setApiTestResult] = useState<Record<string, { ok: boolean; msg: string }>>({});
  const [apiModelsExpanded, setApiModelsExpanded] = useState<Record<string, boolean>>({});
  const [apiAssignTarget, setApiAssignTarget] = useState<{ providerId: string; model: string } | null>(null);
  const [apiAssignAgents, setApiAssignAgents] = useState<import("../types").Agent[]>([]);
  const [apiAssignDepts, setApiAssignDepts] = useState<import("../types").Department[]>([]);
  const [apiAssigning, setApiAssigning] = useState(false);

  // Gateway channel messaging state
  const [gwTargets, setGwTargets] = useState<GatewayTarget[]>([]);
  const [gwLoading, setGwLoading] = useState(false);
  const [gwSelected, setGwSelected] = useState<string>(
    () => (typeof window !== "undefined" ? localStorage.getItem("nexusclaw.gateway.lastTarget") ?? "" : "")
  );
  const [gwText, setGwText] = useState("");
  const [gwSending, setGwSending] = useState(false);
  const [gwStatus, setGwStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const persistSettings = useCallback(
    (next: LocalSettings) => {
      onSave(next as unknown as CompanySettings);
    },
    [onSave]
  );

  const API_TYPE_PRESETS: Record<ApiProviderType, { label: string; base_url: string }> = {
    openai: { label: "OpenAI", base_url: "https://api.openai.com/v1" },
    anthropic: { label: "Anthropic", base_url: "https://api.anthropic.com/v1" },
    google: { label: "Google AI", base_url: "https://generativelanguage.googleapis.com/v1beta" },
    ollama: { label: "Ollama", base_url: "http://localhost:11434/v1" },
    openrouter: { label: "OpenRouter", base_url: "https://openrouter.ai/api/v1" },
    together: { label: "Together", base_url: "https://api.together.xyz/v1" },
    groq: { label: "Groq", base_url: "https://api.groq.com/openai/v1" },
    cerebras: { label: "Cerebras", base_url: "https://api.cerebras.ai/v1" },
    custom: { label: "Custom", base_url: "" },
  };

  const apiLoadedRef = useRef(false);

  const loadApiProviders = useCallback(async () => {
    setApiProvidersLoading(true);
    try {
      const providers = await api.getApiProviders();
      setApiProviders(providers);
      apiLoadedRef.current = true;
    } catch (e) {
      console.error("Failed to load API providers:", e);
    } finally {
      setApiProvidersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "api" && !apiLoadedRef.current && !apiProvidersLoading) {
      loadApiProviders();
    }
  }, [tab, apiProvidersLoading, loadApiProviders]);

  async function handleApiProviderSave() {
    if (!apiForm.name.trim() || !apiForm.base_url.trim()) return;
    setApiSaving(true);
    try {
      if (apiEditingId) {
        await api.updateApiProvider(apiEditingId, {
          name: apiForm.name,
          type: apiForm.type,
          base_url: apiForm.base_url,
          ...(apiForm.api_key ? { api_key: apiForm.api_key } : {}),
        });
      } else {
        await api.createApiProvider({
          name: apiForm.name,
          type: apiForm.type,
          base_url: apiForm.base_url,
          api_key: apiForm.api_key || undefined,
        });
      }
      setApiAddMode(false);
      setApiEditingId(null);
      setApiForm({ name: "", type: "openai", base_url: "https://api.openai.com/v1", api_key: "" });
      await loadApiProviders();
    } catch (e) {
      console.error("API provider save failed:", e);
    } finally {
      setApiSaving(false);
    }
  }

  async function handleApiProviderDelete(id: string) {
    try {
      await api.deleteApiProvider(id);
      await loadApiProviders();
    } catch (e) {
      console.error("API provider delete failed:", e);
    }
  }

  async function handleApiProviderTest(id: string) {
    setApiTesting(id);
    setApiTestResult((prev) => ({ ...prev, [id]: { ok: false, msg: "" } }));
    try {
      const result = await api.testApiProvider(id);
      setApiTestResult((prev) => ({
        ...prev,
        [id]: result.ok
          ? { ok: true, msg: `${result.model_count} ${t({ ko: "개 모델 발견", en: "models found", ja: "モデル検出", zh: "个模型" })}` }
          : { ok: false, msg: result.error?.slice(0, 200) || `HTTP ${result.status}` },
      }));
      if (result.ok) await loadApiProviders();
    } catch (e: any) {
      setApiTestResult((prev) => ({ ...prev, [id]: { ok: false, msg: e.message || String(e) } }));
    } finally {
      setApiTesting(null);
    }
  }

  async function handleApiProviderToggle(id: string, enabled: boolean) {
    try {
      await api.updateApiProvider(id, { enabled: !enabled });
      await loadApiProviders();
    } catch (e) {
      console.error("API provider toggle failed:", e);
    }
  }

  function handleApiEditStart(provider: ApiProvider) {
    setApiEditingId(provider.id);
    setApiAddMode(true);
    setApiForm({
      name: provider.name,
      type: provider.type,
      base_url: provider.base_url,
      api_key: "",
    });
  }

  async function handleApiModelAssign(providerId: string, model: string) {
    setApiAssignTarget({ providerId, model });
    try {
      const [agents, depts] = await Promise.all([api.getAgents(), api.getDepartments()]);
      setApiAssignAgents(agents);
      setApiAssignDepts(depts);
    } catch (e) {
      console.error("Failed to load agents:", e);
    }
  }

  async function handleApiAssignToAgent(agentId: string) {
    if (!apiAssignTarget) return;
    setApiAssigning(true);
    try {
      await api.updateAgent(agentId, {
        cli_provider: "api",
        api_provider_id: apiAssignTarget.providerId,
        api_model: apiAssignTarget.model,
      });
      setApiAssignAgents((prev) => prev.map((a) =>
        a.id === agentId
          ? { ...a, cli_provider: "api" as const, api_provider_id: apiAssignTarget.providerId, api_model: apiAssignTarget.model }
          : a
      ));
    } catch (e) {
      console.error("Failed to assign API model to agent:", e);
    } finally {
      setApiAssigning(false);
    }
  }

  const loadOAuthStatus = useCallback(async () => {
    setOauthLoading(true);
    try {
      const next = await api.getOAuthStatus();
      setOauthStatus(next);
      setAccountDrafts((prev) => {
        const merged = { ...prev };
        for (const info of Object.values(next.providers)) {
          for (const account of info.accounts ?? []) {
            if (!merged[account.id]) {
              merged[account.id] = {
                label: account.label ?? "",
                modelOverride: account.modelOverride ?? "",
                priority: String(account.priority ?? 100),
              };
            }
          }
        }
        return merged;
      });
    } finally {
      setOauthLoading(false);
    }
  }, []);

  useEffect(() => {
    setForm(settings as LocalSettings);
    const syncedLocale = normalizeLocale((settings as LocalSettings).language) ?? "en";
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, syncedLocale);
    window.dispatchEvent(new Event("nexusclaw-language-change"));
  }, [settings]);

  // Auto-switch to oauth tab when callback result arrives + 연결 성공 시 모델 새로고침
  useEffect(() => {
    if (oauthResult) {
      setTab("oauth");
      setOauthStatus(null);
      // 새 OAuth 연결 성공 시 모델 목록 강제 갱신
      if (!oauthResult.error) {
        setModels(null); // 캐시 무효화 → 탭 진입 시 자동 로드
      }
    }
  }, [oauthResult]);

  useEffect(() => {
    if (tab === "oauth" && !oauthStatus) {
      loadOAuthStatus().catch(console.error);
    }
  }, [tab, oauthStatus, loadOAuthStatus]);

  // Load CLI models when cli tab is visible
  useEffect(() => {
    if (tab !== "cli" || cliModels) return;
    setCliModelsLoading(true);
    api.getCliModels()
      .then(setCliModels)
      .catch(console.error)
      .finally(() => setCliModelsLoading(false));
  }, [tab, cliModels]);

  // Load models when oauth tab is visible and has connected providers
  useEffect(() => {
    if (tab !== "oauth" || !oauthStatus || models) return;
    const hasConnected = Object.values(oauthStatus.providers).some(p => p.connected);
    if (!hasConnected) return;
    setModelsLoading(true);
    api.getOAuthModels()
      .then(setModels)
      .catch(console.error)
      .finally(() => setModelsLoading(false));
  }, [tab, oauthStatus, models]);

  // Auto-dismiss oauth result banner after 8 seconds
  useEffect(() => {
    if (oauthResult) {
      const timer = setTimeout(() => onOauthResultClear?.(), 8000);
      return () => clearTimeout(timer);
    }
  }, [oauthResult, onOauthResultClear]);

  // Cleanup poll timer on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // Load gateway targets when tab is visible
  const loadGwTargets = useCallback(() => {
    setGwLoading(true);
    setGwStatus(null);
    api.getGatewayTargets()
      .then((targets) => {
        setGwTargets(targets);
        if (targets.length > 0 && !targets.find((t) => t.sessionKey === gwSelected)) {
          const fallback = targets[0].sessionKey;
          setGwSelected(fallback);
          localStorage.setItem("nexusclaw.gateway.lastTarget", fallback);
        }
      })
      .catch((err) => setGwStatus({ ok: false, msg: String(err) }))
      .finally(() => setGwLoading(false));
  }, [gwSelected]);

  useEffect(() => {
    if (tab === "gateway" && gwTargets.length === 0 && !gwLoading) loadGwTargets();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGwSend = useCallback(async () => {
    if (!gwSelected || !gwText.trim()) return;
    setGwSending(true);
    setGwStatus(null);
    try {
      const res = await api.sendGatewayMessage(gwSelected, gwText.trim());
      if (res.ok) {
        setGwStatus({ ok: true, msg: t({ ko: "전송 완료!", en: "Sent!", ja: "送信完了!", zh: "发送成功!" }) });
        setGwText("");
      } else {
        setGwStatus({ ok: false, msg: res.error || "Send failed" });
      }
    } catch (err) {
      setGwStatus({ ok: false, msg: String(err) });
    } finally {
      setGwSending(false);
    }
  }, [gwSelected, gwText, t]);

  function handleSave() {
    const nextLocale = normalizeLocale(form.language) ?? "en";
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLocale);
    window.dispatchEvent(new Event("nexusclaw-language-change"));
    persistSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // Antigravity: web redirect OAuth (Google OAuth works on any localhost port)
  function handleConnect(provider: OAuthConnectProvider) {
    const redirectTo = window.location.origin + window.location.pathname;
    window.location.assign(api.getOAuthStartUrl(provider, redirectTo));
  }

  // GitHub Copilot: Device Code flow
  const startDeviceCodeFlow = useCallback(async () => {
    setDeviceError(null);
    setDeviceStatus(null);
    try {
      const dc = await api.startGitHubDeviceFlow();
      setDeviceCode(dc);
      setDeviceStatus("polling");
      // Open verification URL
      window.open(dc.verificationUri, "_blank");
      // Start polling with expiration timeout
      const interval = Math.max((dc.interval || 5) * 1000, 5000);
      const expiresAt = Date.now() + (dc.expiresIn || 900) * 1000;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = setInterval(async () => {
        if (Date.now() > expiresAt) {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
          setDeviceStatus("expired");
          setDeviceCode(null);
          setDeviceError(
            t({
              ko: "코드가 만료되었습니다. 다시 시도하세요.",
              en: "Code expired. Please try again.",
              ja: "コードの有効期限が切れました。再試行してください。",
              zh: "代码已过期，请重试。",
            })
          );
          return;
        }
        try {
          const result = await api.pollGitHubDevice(dc.stateId);
          if (result.status === "complete") {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            setDeviceStatus("complete");
            setDeviceCode(null);
            // Refresh OAuth status
            await loadOAuthStatus();
          } else if (result.status === "expired" || result.status === "denied") {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            setDeviceStatus(result.status);
            setDeviceError(
              result.status === "expired"
                ? t({ ko: "코드가 만료되었습니다", en: "Code expired", ja: "コードの期限切れ", zh: "代码已过期" })
                : t({ ko: "인증이 거부되었습니다", en: "Authentication denied", ja: "認証が拒否されました", zh: "认证被拒绝" })
            );
          } else if (result.status === "error") {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            setDeviceStatus("error");
            setDeviceError(
              result.error ||
              t({ ko: "알 수 없는 오류", en: "Unknown error", ja: "不明なエラー", zh: "未知错误" })
            );
          }
          // "pending" and "slow_down" → keep polling
        } catch {
          // Network error — keep polling
        }
      }, interval);
    } catch (err) {
      setDeviceError(err instanceof Error ? err.message : String(err));
      setDeviceStatus("error");
    }
  }, [t]);

  async function handleDisconnect(provider: OAuthConnectProvider) {
    setDisconnecting(provider);
    try {
      await api.disconnectOAuth(provider);
      await loadOAuthStatus();
      // Reset device code state if disconnecting github-copilot
      if (provider === "github-copilot") {
        setDeviceCode(null);
        setDeviceStatus(null);
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      }
    } catch (err) {
      console.error("Disconnect failed:", err);
    } finally {
      setDisconnecting(null);
    }
  }

  function updateAccountDraft(accountId: string, patch: Partial<{ label: string; modelOverride: string; priority: string }>) {
    setAccountDrafts((prev) => ({
      ...prev,
      [accountId]: {
        label: prev[accountId]?.label ?? "",
        modelOverride: prev[accountId]?.modelOverride ?? "",
        priority: prev[accountId]?.priority ?? "100",
        ...patch,
      },
    }));
  }

  async function handleActivateAccount(
    provider: OAuthConnectProvider,
    accountId: string,
    currentlyActive: boolean,
  ) {
    setSavingAccountId(accountId);
    try {
      await api.activateOAuthAccount(provider, accountId, currentlyActive ? "remove" : "add");
      await loadOAuthStatus();
    } catch (err) {
      console.error("Activate account failed:", err);
    } finally {
      setSavingAccountId(null);
    }
  }

  async function handleSaveAccount(accountId: string) {
    const draft = accountDrafts[accountId];
    if (!draft) return;
    setSavingAccountId(accountId);
    try {
      await api.updateOAuthAccount(accountId, {
        label: draft.label.trim() || null,
        model_override: draft.modelOverride.trim() || null,
        priority: Number.isFinite(Number(draft.priority)) ? Math.max(1, Math.round(Number(draft.priority))) : 100,
      });
      await loadOAuthStatus();
    } catch (err) {
      console.error("Save account failed:", err);
    } finally {
      setSavingAccountId(null);
    }
  }

  async function handleToggleAccount(accountId: string, nextStatus: "active" | "disabled") {
    setSavingAccountId(accountId);
    try {
      await api.updateOAuthAccount(accountId, { status: nextStatus });
      await loadOAuthStatus();
    } catch (err) {
      console.error("Toggle account failed:", err);
    } finally {
      setSavingAccountId(null);
    }
  }

  async function handleDeleteAccount(provider: OAuthConnectProvider, accountId: string) {
    if (!window.confirm(
      t({
        ko: "이 OAuth 계정을 삭제하시겠습니까?",
        en: "Delete this OAuth account?",
        ja: "この OAuth アカウントを削除しますか？",
        zh: "要删除此 OAuth 账号吗？",
      }),
    )) return;
    setSavingAccountId(accountId);
    try {
      await api.deleteOAuthAccount(provider, accountId);
      await loadOAuthStatus();
    } catch (err) {
      console.error("Delete account failed:", err);
    } finally {
      setSavingAccountId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 sm:space-y-6 pt-2">
      <div className="flex flex-col gap-1">
        <h2 className="text-[22px] font-bold text-white tracking-tight">Settings</h2>
        <p className="text-[13px] text-slate-400">CLI Tools & OAuth Configuration</p>
      </div>

      {/* Tab navigation */}
      <div className="flex flex-wrap gap-1 border-b border-white/5 pb-1">
        {[
          {
            key: "general",
            label: t({ ko: "일반 설정", en: "General", ja: "一般設定", zh: "常规设置" }),
            icon: "⚙️",
          },
          {
            key: "cli",
            label: t({ ko: "CLI 도구", en: "CLI Tools", ja: "CLI 툴", zh: "CLI 工具" }),
            icon: "🔧",
          },
          {
            key: "oauth",
            label: t({ ko: "OAuth 인증", en: "OAuth", ja: "OAuth 認証", zh: "OAuth 认证" }),
            icon: "🔑",
          },
          {
            key: "api",
            label: t({ ko: "API 연동", en: "API", ja: "API 連携", zh: "API 集成" }),
            icon: "🔌",
          },
          {
            key: "gateway",
            label: t({ ko: "채널 메시지", en: "Channel", ja: "チャネル", zh: "频道" }),
            icon: "📡",
          },
        ].map((tItem) => (
          <button
            key={tItem.key}
            onClick={() => setTab(tItem.key as typeof tab)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[14px] font-semibold transition-all sm:px-4 sm:py-2.5 ${tab === tItem.key
              ? "text-indigo-400 border-b-2 border-indigo-500 bg-transparent"
              : "text-slate-400 hover:text-white"
              }`}
          >
            <span>{tItem.icon}</span>
            <span>{tItem.label}</span>
          </button>
        ))}
      </div>

      {/* General Settings Tab */}
      {tab === "general" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <section className="bg-transparent border border-white/5 rounded-xl p-5 sm:p-6 space-y-5">
            <h3 className="text-sm font-bold tracking-wide text-white mb-4">
              {t({ ko: "회사 정보", en: "Company", ja: "会社情報", zh: "公司信息" })}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">
                  {t({ ko: "회사명", en: "Company Name", ja: "회사명", zh: "公司名称" })}
                </label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) =>
                    setForm({ ...form, companyName: e.target.value })
                  }
                  className="w-full bg-black/40 border border-white/10 shadow-inner rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">
                  {t({ ko: "CEO 이름", en: "CEO Name", ja: "CEO 명", zh: "CEO 名称" })}
                </label>
                <input
                  type="text"
                  value={form.ceoName}
                  onChange={(e) =>
                    setForm({ ...form, ceoName: e.target.value })
                  }
                  className="w-full bg-black/40 border border-white/10 shadow-inner rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-none transition-all"
                />
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-white/5 transition-all hover:bg-white/10">
                <label className="text-sm font-bold text-slate-300">
                  {t({ ko: "자동 배정", en: "Auto Assign", ja: "自動割り当て", zh: "自动分配" })}
                </label>
                <button
                  onClick={() =>
                    setForm({ ...form, autoAssign: !form.autoAssign })
                  }
                  className={`w-11 h-6 rounded-full transition-all relative ${form.autoAssign ? "bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" : "bg-slate-700"
                    }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-md ${form.autoAssign ? "left-[22px]" : "left-0.5"
                      }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-white/5 transition-all hover:bg-white/10">
                <label className="text-sm font-bold text-slate-300">
                  {t({ ko: "자동 업데이트 (전역)", en: "Auto Update (Global)", ja: "Auto Update（全体）", zh: "自动更新（全局）" })}
                </label>
                <button
                  onClick={() =>
                    setForm({ ...form, autoUpdateEnabled: !form.autoUpdateEnabled })
                  }
                  className={`w-11 h-6 rounded-full transition-all relative ${form.autoUpdateEnabled ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-slate-700"
                    }`}
                  title={t({
                    ko: "서버 전체 자동 업데이트 루프를 켜거나 끕니다.",
                    en: "Enable or disable auto-update loop for the whole server.",
                    ja: "サーバー全体の자동 업데이트 ループを有効/無効にします。",
                    zh: "启用或禁用整个服务器的自动更新循环。",
                  })}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-md ${form.autoUpdateEnabled ? "left-[22px]" : "left-0.5"
                      }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-white/5 transition-all hover:bg-white/10">
                <label className="text-sm font-bold text-slate-300">
                  {t({ ko: "OAuth 자동 스왑", en: "OAuth Auto Swap", ja: "OAuth 自動スワップ", zh: "OAuth 自动切换" })}
                </label>
                <button
                  onClick={() =>
                    setForm({ ...form, oauthAutoSwap: !(form.oauthAutoSwap !== false) })
                  }
                  className={`w-11 h-6 rounded-full transition-all relative ${form.oauthAutoSwap !== false ? "bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" : "bg-slate-700"
                    }`}
                  title={t({
                    ko: "실패/한도 시 다음 OAuth 계정으로 자동 전환",
                    en: "Auto-switch to next OAuth account on failures/limits",
                    ja: "失敗/上限時に次の OAuth アカウントへ自動切替",
                    zh: "失败/额度限制时自动切换到下一个 OAuth 账号",
                  })}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-md ${form.oauthAutoSwap !== false ? "left-[22px]" : "left-0.5"
                      }`}
                  />
                </button>
              </div>
            </div>

            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">
                  {t({ ko: "기본 CLI 프로바이더", en: "Default CLI Provider", ja: "デフォルト CLI プロバイダ", zh: "默认 CLI 提供方" })}
                </label>
                <select
                  value={form.defaultProvider}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      defaultProvider: e.target.value as CliProvider,
                    })
                  }
                  className="w-full bg-black/40 border border-white/10 shadow-inner rounded-lg px-3 py-2.5 text-sm font-bold text-slate-300 focus:outline-none focus:border-cyan-500/50 transition-all appearance-none"
                >
                  <option value="claude">Claude Code</option>
                  <option value="codex">Codex CLI</option>
                  <option value="gemini">Gemini CLI</option>
                  <option value="opencode">OpenCode</option>
                  <option value="copilot">GitHub Copilot</option>
                  <option value="antigravity">Antigravity</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">
                  {t({ ko: "언어", en: "Language", ja: "言語", zh: "语言" })}
                </label>
                <select
                  value={form.language}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      language: e.target.value as Locale,
                    })
                  }
                  className="w-full bg-black/40 border border-white/10 shadow-inner rounded-lg px-3 py-2.5 text-sm font-bold text-slate-300 focus:outline-none focus:border-cyan-500/50 transition-all appearance-none"
                >
                  <option value="ko">{t({ ko: "한국어", en: "Korean", ja: "韓国語", zh: "韩语" })}</option>
                  <option value="en">{t({ ko: "영어", en: "English", ja: "英語", zh: "英语" })}</option>
                  <option value="ja">{t({ ko: "일본어", en: "Japanese", ja: "日本語", zh: "日语" })}</option>
                  <option value="zh">{t({ ko: "중국어", en: "Chinese", ja: "中国語", zh: "中文" })}</option>
                </select>
              </div>
            </div>
          </section>

          <button
            onClick={handleSave}
            className="w-full py-4 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl transition-all active:scale-[0.98] tracking-widest flex items-center justify-center gap-2"
          >
            {saved ? "✅ " : "💾 "}
            {saved ? t({ ko: "저장 완료!", en: "Saved!", ja: "保存完了!", zh: "保存成功!" }) : t({ ko: "설정 저장", en: "Save Settings", ja: "設定を保存", zh: "保存设置" })}
          </button>
        </div>
      )}

      {/* CLI Status Tab */}
      {tab === "cli" && (
        <section className="bg-transparent border border-white/5 rounded-xl p-5 sm:p-6 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold tracking-wide text-white">
              {t({ ko: "CLI 도구 상태", en: "CLI Tool Status", ja: "CLI ツール状態", zh: "CLI 工具状态" })}
            </h3>
            <button
              onClick={() => {
                onRefreshCli();
                setCliModelsLoading(true);
                api.getCliModels(true)
                  .then(setCliModels)
                  .catch(console.error)
                  .finally(() => setCliModelsLoading(false));
              }}
              className="text-xs font-bold text-indigo-400 hover:text-cyan-300 transition-all flex items-center gap-1.5"
            >
              🔄 {t({ ko: "새로고침", en: "Refresh", ja: "更新", zh: "刷新" })}
            </button>
          </div>

          {cliStatus ? (
            <div className="space-y-3">
              {Object.entries(cliStatus)
                .filter(([provider]) => !["copilot", "antigravity"].includes(provider))
                .map(([provider, status]) => {
                  const info = CLI_INFO[provider];
                  const isReady = status.installed && status.authenticated;
                  const hasSubModel = provider === "claude" || provider === "codex";
                  const modelList = cliModels?.[provider] ?? [];
                  const currentModel = form.providerModelConfig?.[provider]?.model || "";

                  return (
                    <div
                      key={provider}
                      className="bg-white/5 rounded-xl p-4 border border-white/5 transition-all hover:bg-white/10"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">{info?.icon ?? "?"}</span>
                        <div className="flex-1">
                          <div className="text-sm font-bold text-white tracking-wide">
                            {info?.label ?? provider}
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">
                            {status.version
                              ?? (status.installed
                                ? t({ ko: "버전 확인 불가", en: "Version unknown", ja: "バージョン不明", zh: "版本未知" })
                                : t({ ko: "미설치", en: "Not installed", ja: "未インストール", zh: "未安装" }))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <span
                            className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border ${status.installed
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-none"
                              : "bg-slate-700/30 text-slate-500 border-white/5"
                              }`}
                          >
                            {status.installed
                              ? t({ ko: "설치됨", en: "Installed", ja: "インストール済み", zh: "已安装" })
                              : t({ ko: "미설치", en: "Not installed", ja: "未インストール", zh: "未安装" })}
                          </span>
                          {status.installed && (
                            <span
                              className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border ${status.authenticated
                                ? "bg-cyan-500/10 text-indigo-400 border-cyan-500/20 shadow-[0_0_8px_rgba(6,182,212,0.1)]"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                }`}
                            >
                              {status.authenticated
                                ? t({ ko: "인증됨", en: "Authenticated", ja: "認証済み", zh: "已认证" })
                                : t({ ko: "미인증", en: "Not Authenticated", ja: "未認証", zh: "未认证" })}
                            </span>
                          )}
                        </div>
                      </div>

                      {isReady && (
                        <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest w-20">
                              {hasSubModel
                                ? t({ ko: "메인 모델", en: "Main Model", ja: "メインモデル", zh: "主模型" })
                                : t({ ko: "모델", en: "Model", ja: "モデル", zh: "模型" })}
                            </span>
                            {cliModelsLoading ? (
                              <div className="h-4 w-32 bg-white/5 rounded animate-pulse" />
                            ) : modelList.length > 0 ? (
                              <select
                                value={currentModel}
                                onChange={(e) => {
                                  const newSlug = e.target.value;
                                  const newModel = modelList.find((m) => m.slug === newSlug);
                                  const prev = form.providerModelConfig?.[provider] || {};
                                  const newConfig = {
                                    ...form.providerModelConfig,
                                    [provider]: {
                                      ...prev,
                                      model: newSlug,
                                      reasoningLevel: newModel?.defaultReasoningLevel || undefined,
                                    },
                                  };
                                  const newForm = { ...form, providerModelConfig: newConfig };
                                  setForm(newForm);
                                  persistSettings(newForm);
                                }}
                                className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[11px] font-bold text-slate-300 focus:outline-none focus:border-cyan-500/50 transition-all flex-1"
                              >
                                <option value="">{t({ ko: "기본값", en: "Default", ja: "デフォルト", zh: "默认" })}</option>
                                {modelList.map((m) => (
                                  <option key={m.slug} value={m.slug}>
                                    {m.displayName || m.slug}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-[10px] text-slate-500 italic">
                                {t({ ko: "모델 목록 없음", en: "No models", ja: "モデル一覧なし", zh: "无模型列表" })}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 opacity-50">
              <div className="animate-spin text-2xl mb-2">🔄</div>
              <div className="text-xs font-bold tracking-widest uppercase">
                {t({ ko: "로딩 중...", en: "Loading...", ja: "読み込み中...", zh: "加载中..." })}
              </div>
            </div>
          )}

          <div className="mt-4 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
            <p className="text-[11px] leading-relaxed text-indigo-300 flex gap-2">
              <span className="shrink-0">💡</span>
              {t({
                ko: "각 에이전트의 CLI 도구는 오피스에서 에이전트 클릭 후 변경할 수 있습니다. Copilot/Antigravity 모델은 OAuth 탭에서 설정합니다.",
                en: "Each agent's CLI tool can be changed in Office by clicking an agent. Configure Copilot/Antigravity models in OAuth tab.",
                ja: "各エージェントの CLI ツールは Office でエージェントをクリックして変更できます。Copilot/Antigravity のモデルは OAuth タブで設定してください。",
                zh: "每个代理的 CLI 工具可在 Office 中点击代理后修改。Copilot/Antigravity 模型请在 OAuth 页签配置。",
              })}
            </p>
          </div>
        </section>
      )}

      {/* OAuth Tab */}
      {tab === "oauth" && (
        <section className="bg-[#1e2333]/60 backdrop-blur-md border border-slate-700/50 rounded-xl p-5 sm:p-6 space-y-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold uppercase tracking-wide text-slate-200">
              {t({ ko: "OAuth 인증 현황", en: "OAuth Status", ja: "OAuth 認証状態", zh: "OAuth 认证状态" })}
            </h3>
            <button
              onClick={() => {
                setOauthStatus(null);
                setOauthLoading(true);
                loadOAuthStatus().catch(console.error);
                setModelsLoading(true);
                api.getOAuthModels(true)
                  .then(setModels)
                  .catch(console.error)
                  .finally(() => setModelsLoading(false));
              }}
              className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-all flex items-center gap-1.5 bg-slate-800/50 px-3 py-1.5 rounded-md border border-blue-500/20"
            >
              🔄 {t({ ko: "새로고침", en: "Refresh", ja: "更新", zh: "刷新" })}
            </button>
          </div>

          {/* OAuth callback result banner */}
          {oauthResult && (
            <div className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold animate-pulse-subtle border ${oauthResult.error
              ? "bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
              }`}>
              <span>
                {oauthResult.error
                  ? `${t({ ko: "OAuth 연결 실패", en: "OAuth connection failed", ja: "OAuth 接続失敗", zh: "OAuth 连接失败" })}: ${oauthResult.error}`
                  : `${OAUTH_INFO[oauthResult.provider || ""]?.label || oauthResult.provider} ${t({ ko: "연결 완료!", en: "connected!", ja: "接続完了!", zh: "连接成功!" })}`}
              </span>
              <button
                onClick={() => onOauthResultClear?.()}
                className="text-xs hover:scale-110 transition-transform p-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* Storage status */}
          {oauthStatus && (
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border ${oauthStatus.storageReady
              ? "bg-[#064e3b]/80 text-[#34d399] border-[#10b981]/50"
              : "bg-amber-900/40 text-amber-300 border-amber-500/40"
              }`}>
              <span className="text-lg">{oauthStatus.storageReady ? "🔒" : "⚠️"}</span>
              <span className="tracking-wide">
                {oauthStatus.storageReady
                  ? t({
                    ko: "OAuth 저장소가 활성화되었습니다 (암호화 키 설정됨)",
                    en: "OAuth storage is active (encryption key configured)",
                    ja: "OAuth ストレージが有効です（暗号化キー設定済み）",
                    zh: "OAuth 存储已启用（已配置加密密钥）",
                  })
                  : t({
                    ko: "OAUTH_ENCRYPTION_SECRET 환경변수가 필요합니다",
                    en: "OAUTH_ENCRYPTION_SECRET environment variable is missing",
                    ja: "OAUTH_ENCRYPTION_SECRET 環境変数が必要です",
                    zh: "缺少 OAUTH_ENCRYPTION_SECRET 环境变量",
                  })}
              </span>
            </div>
          )}

          {oauthLoading ? (
            <div className="flex flex-col items-center justify-center py-12 opacity-50">
              <div className="animate-spin text-3xl mb-3">🔄</div>
              <div className="text-xs font-bold tracking-widest uppercase">
                {t({ ko: "로딩 중...", en: "Loading...", ja: "読み込み中...", zh: "加载中..." })}
              </div>
            </div>
          ) : oauthStatus ? (
            <>
              {/* Connected services section */}
              {(() => {
                const detectedProviders = Object.entries(oauthStatus.providers).filter(
                  ([, info]) => Boolean(info.detected ?? info.connected),
                );
                if (detectedProviders.length === 0) return null;
                const logoMap: Record<string, ({ className }: { className?: string }) => React.ReactElement> = {
                  "github-copilot": GitHubCopilotLogo, antigravity: AntigravityLogo,
                };
                return (
                  <div className="space-y-4">
                    <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">
                      {t({ ko: "연결된 서비스", en: "Connected Services", ja: "接続されたサービス", zh: "已连接的服务" })}
                    </div>
                    {detectedProviders.map(([provider, info]) => {
                      const oauthInfo = OAUTH_INFO[provider];
                      const LogoComp = logoMap[provider];
                      const expiresAt = info.expires_at ? new Date(info.expires_at) : null;
                      const isExpired = expiresAt ? expiresAt.getTime() < Date.now() : false;
                      const isWebOAuth = info.source === "web-oauth";
                      const isFileDetected = info.source === "file-detected";
                      const isRunnable = Boolean(info.executionReady ?? info.connected);
                      const accountList = info.accounts ?? [];
                      return (
                        <div key={provider} className="bg-[#232b3e] rounded-xl p-5 border border-slate-700/60 transition-all hover:bg-slate-800/80 shadow-md">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
                              {LogoComp ? <LogoComp className="w-8 h-8 text-white" /> : <span className="text-2xl">🔑</span>}
                              <div className="flex items-center gap-3">
                                <span className="text-lg font-semibold text-white tracking-wide">
                                  {oauthInfo?.label ?? provider}
                                </span>
                                {info.email && (
                                  <span className="text-sm text-slate-400 font-mono italic">{info.email}</span>
                                )}
                              </div>
                              <div className="flex gap-2 ml-2">
                                {isFileDetected && (
                                  <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-700/80 text-slate-300">
                                    {t({ ko: "CLI 감지", en: "CLI detected", ja: "CLI 検出", zh: "检测到 CLI" })}
                                  </span>
                                )}
                                {isWebOAuth && (
                                  <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-blue-900/40 text-blue-300 border border-blue-500/30">
                                    {t({ ko: "웹 OAuth", en: "Web OAuth", ja: "Web OAuth", zh: "网页 OAuth" })}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 sm:justify-end shrink-0">
                              {!isRunnable ? (
                                <span className="text-sm font-medium px-3 py-1 rounded-full bg-amber-900/50 text-amber-400 border border-amber-500/30">
                                  {t({ ko: "감지됨 (실행 불가)", en: "Detected (not runnable)", ja: "検出済み（実行不可）", zh: "已检测（不可执行）" })}
                                </span>
                              ) : !isExpired ? (
                                <span className="text-sm font-medium px-4 py-1.5 rounded-full bg-[#064e3b]/80 text-[#34d399] border-none shadow-sm">
                                  {info.lastRefreshed ? t({ ko: "자동 갱신됨", en: "Auto-refreshed", ja: "自動更新済", zh: "已自动刷新" }) : t({ ko: "연결됨", en: "Connected", ja: "接続中", zh: "已连接" })}
                                </span>
                              ) : (
                                <span className="text-sm font-medium px-3 py-1 rounded-full bg-red-900/50 text-red-400 border border-red-500/30">
                                  {info.refreshFailed ? t({ ko: "갱신 실패", en: "Refresh failed", ja: "更新失敗", zh: "刷新失败" }) : t({ ko: "만료됨", en: "Expired", ja: "期限切れ", zh: "已过期" })}
                                </span>
                              )}
                              {info.hasRefreshToken && isWebOAuth && (
                                <button
                                  onClick={async () => {
                                    setRefreshing(provider);
                                    try { await api.refreshOAuthToken(provider as OAuthConnectProvider); await loadOAuthStatus(); }
                                    catch (err) { console.error("Refresh failed:", err); }
                                    finally { setRefreshing(null); }
                                  }}
                                  disabled={refreshing === provider}
                                  className="text-sm font-medium px-4 py-1.5 rounded-lg bg-blue-900/20 hover:bg-blue-900/40 text-blue-400 border border-blue-500/30 transition-colors disabled:opacity-50"
                                >
                                  {refreshing === provider ? t({ ko: "갱신 중...", en: "Refreshing...", ja: "更新中...", zh: "刷新中..." }) : t({ ko: "갱신", en: "Refresh", ja: "更新", zh: "刷新" })}
                                </button>
                              )}
                              {/* Re-connect button for expired tokens without refresh token */}
                              {isExpired && !info.hasRefreshToken && isWebOAuth && (
                                <button
                                  onClick={() => handleConnect(provider as OAuthConnectProvider)}
                                  className="text-sm font-medium px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                                >
                                  {t({ ko: "재연결", en: "Reconnect", ja: "再接続", zh: "重新连接" })}
                                </button>
                              )}
                              {isWebOAuth && (
                                <button
                                  onClick={() => handleDisconnect(provider as OAuthConnectProvider)}
                                  disabled={disconnecting === provider}
                                  className="text-sm font-medium px-4 py-1.5 rounded-lg bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-500/30 transition-colors disabled:opacity-50"
                                >
                                  {disconnecting === provider ? "..." : t({ ko: "해제", en: "Disconnect", ja: "解除", zh: "断开" })}
                                </button>
                              )}
                            </div>
                          </div>
                          {info.requiresWebOAuth && (
                            <div className="mt-3 text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 leading-relaxed">
                              {t({
                                ko: "CLI에서 감지된 자격 증명은 NexusClaw 실행에 직접 사용되지 않습니다. Web OAuth로 다시 연결하세요.",
                                en: "CLI-detected credentials are not used directly for NexusClaw execution. Reconnect with Web OAuth.",
                                ja: "CLI 検出の資格情報は NexusClaw 実行では直接利用されません。Web OAuth で再接続してください。",
                                zh: "CLI 检测到的凭据不会直接用于 NexusClaw 执行。请使用 Web OAuth 重新连接。",
                              })}
                            </div>
                          )}
                          {(info.scope || expiresAt || (info.created_at > 0)) && (
                            <div className="mt-5 pt-4 grid grid-cols-1 gap-y-3 gap-x-6 text-sm sm:grid-cols-2">
                              {info.scope && (
                                <div className="col-span-2 flex items-center gap-2">
                                  <span className="text-slate-500 font-medium whitespace-nowrap">
                                    {t({ ko: "스코프", en: "Scope", ja: "スコープ", zh: "范围" })}:
                                  </span>
                                  <span className="font-mono text-sm leading-relaxed text-slate-300 break-all">{info.scope}</span>
                                </div>
                              )}
                              {info.created_at > 0 && (
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-500 font-medium whitespace-nowrap">
                                    {t({ ko: "등록", en: "Created", ja: "登録", zh: "创建" })}:
                                  </span>
                                  <span className="text-slate-200">
                                    {new Date(info.created_at).toLocaleString(localeTag)}
                                  </span>
                                </div>
                              )}
                              {expiresAt && (
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-500 font-medium whitespace-nowrap">
                                    {t({ ko: "만료", en: "Expires", ja: "期限", zh: "到期" })}:
                                  </span>
                                  <span className={isExpired ? "text-red-400" : "text-slate-200"}>
                                    {expiresAt.toLocaleString(localeTag)}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                          {/* Model selection dropdown */}
                          {(() => {
                            const modelKey = provider === "github-copilot" ? "copilot" : provider === "antigravity" ? "antigravity" : null;
                            if (!modelKey) return null;
                            const modelList = models?.[modelKey];
                            const currentModel = form.providerModelConfig?.[modelKey]?.model || "";
                            return (
                              <div className="flex min-w-0 flex-col items-stretch gap-3 mt-4 sm:flex-row sm:items-center sm:gap-4">
                                <span className="w-auto shrink-0 text-sm font-medium text-slate-500">
                                  {t({ ko: "모델:", en: "Model:", ja: "モデル:", zh: "模型:" })}
                                </span>
                                {modelsLoading ? (
                                  <span className="text-sm text-slate-500 animate-pulse">
                                    {t({ ko: "로딩 중...", en: "Loading...", ja: "読み込み中...", zh: "加载中..." })}
                                  </span>
                                ) : modelList && modelList.length > 0 ? (
                                  <select
                                    value={currentModel}
                                    onChange={(e) => {
                                      const newConfig = { ...form.providerModelConfig, [modelKey]: { model: e.target.value } };
                                      const newForm = { ...form, providerModelConfig: newConfig };
                                      setForm(newForm);
                                      persistSettings(newForm);
                                    }}
                                    className="w-full min-w-0 rounded-lg border border-slate-700 bg-[#1a2133] px-3 py-2 text-sm font-medium text-slate-300 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 sm:flex-1 appearance-none cursor-pointer"
                                  >
                                    {!currentModel && (
                                      <option value="">
                                        {t({ ko: "선택하세요...", en: "Select...", ja: "選択してください...", zh: "请选择..." })}
                                      </option>
                                    )}
                                    {modelList.map((m, idx) => (
                                      <option key={`${m}-${idx}`} value={m}>{m}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="text-sm text-slate-500 italic">
                                    {t({ ko: "모델 목록 없음", en: "No models", ja: "モデル一覧なし", zh: "无模型列表" })}
                                  </span>
                                )}
                              </div>
                            );
                          })()}

                          {accountList.length > 0 && (
                            <div className="space-y-3 rounded-xl border border-white/5 bg-black/30 p-4 mt-4">
                              <div className="flex flex-wrap items-center justify-between gap-1.5">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                  {t({ ko: "계정 풀", en: "Account Pool", ja: "アカウントプール", zh: "账号池" })}
                                </div>
                                <div className="text-[9px] text-slate-500 text-right leading-snug">
                                  {t({
                                    ko: "여러 계정을 동시에 활성 가능 · 우선순위 숫자가 낮을수록 먼저 시도",
                                    en: "Multiple active accounts supported · lower priority runs first",
                                    ja: "複数アクティブ対応 · 優先度の数字が小さいほど先に実行",
                                    zh: "支持多账号同时激活 · 优先级数字越小越先执行",
                                  })}
                                </div>
                              </div>
                              {accountList.map((account) => {
                                const modelKey = provider === "github-copilot" ? "copilot" : provider === "antigravity" ? "antigravity" : null;
                                const modelList = modelKey ? (models?.[modelKey] ?? []) : [];
                                const draft = accountDrafts[account.id] ?? {
                                  label: account.label ?? "",
                                  modelOverride: account.modelOverride ?? "",
                                  priority: String(account.priority ?? 100),
                                };
                                const hasCustomOverride = Boolean(draft.modelOverride) && !modelList.includes(draft.modelOverride);
                                return (
                                  <div key={account.id} className="rounded-lg border border-white/5 bg-black/40 p-3 space-y-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${account.active ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" : "bg-slate-700/30 text-slate-500 border border-white/5"}`}>
                                        {account.active
                                          ? t({ ko: "활성", en: "Active", ja: "有効", zh: "活动" })
                                          : t({ ko: "대기", en: "Standby", ja: "待機", zh: "待命" })}
                                      </span>
                                      <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${account.executionReady ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20" : "bg-amber-500/10 text-amber-300 border border-amber-500/20"}`}>
                                        {account.executionReady
                                          ? t({ ko: "실행 가능", en: "Runnable", ja: "実行可能", zh: "可执行" })
                                          : t({ ko: "실행 불가", en: "Not runnable", ja: "実行不可", zh: "不可执行" })}
                                      </span>
                                      {account.email && (
                                        <span className="text-[10px] text-slate-400 font-mono italic break-all">{account.email}</span>
                                      )}
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                      <label className="space-y-1">
                                        <span className="block text-[9px] uppercase tracking-widest text-slate-500">
                                          {t({ ko: "라벨", en: "Label", ja: "ラベル", zh: "标签" })}
                                        </span>
                                        <input
                                          value={draft.label}
                                          onChange={(e) => updateAccountDraft(account.id, { label: e.target.value })}
                                          placeholder={t({ ko: "계정 별칭", en: "Account alias", ja: "アカウント別名", zh: "账号别名" })}
                                          className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs font-bold text-slate-300 focus:border-cyan-500/50 focus:outline-none"
                                        />
                                      </label>
                                      <label className="space-y-1">
                                        <span className="block text-[9px] uppercase tracking-widest text-slate-500">
                                          {t({ ko: "모델 오버라이드", en: "Model Override", ja: "モデル上書き", zh: "模型覆盖" })}
                                        </span>
                                        <select
                                          value={draft.modelOverride}
                                          onChange={(e) => updateAccountDraft(account.id, { modelOverride: e.target.value })}
                                          className="w-full rounded border border-slate-200 bg-white/70 px-2 py-1 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                                        >
                                          <option value="">
                                            {t({
                                              ko: "프로바이더 기본값 사용",
                                              en: "Use provider default",
                                              ja: "プロバイダ既定値を使用",
                                              zh: "使用提供方默认值",
                                            })}
                                          </option>
                                          {hasCustomOverride && (
                                            <option value={draft.modelOverride}>
                                              {draft.modelOverride}
                                            </option>
                                          )}
                                          {modelList.map((m, idx) => (
                                            <option key={`${m}-${idx}`} value={m}>
                                              {m}
                                            </option>
                                          ))}
                                        </select>
                                      </label>
                                      <label className="space-y-1">
                                        <span className="block text-[10px] uppercase tracking-wider text-slate-400">
                                          {t({ ko: "우선순위", en: "Priority", ja: "優先度", zh: "优先级" })}
                                        </span>
                                        <input
                                          type="number"
                                          min={1}
                                          step={1}
                                          value={draft.priority}
                                          onChange={(e) => updateAccountDraft(account.id, { priority: e.target.value })}
                                          placeholder="100"
                                          className="w-full rounded border border-slate-200 bg-white/70 px-2 py-1 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                                        />
                                      </label>
                                    </div>

                                    <div className="flex flex-wrap gap-1.5">
                                      <button
                                        onClick={() => handleActivateAccount(provider as OAuthConnectProvider, account.id, account.active)}
                                        disabled={savingAccountId === account.id || account.status !== "active"}
                                        className={`text-[11px] px-2 py-1 rounded disabled:opacity-50 ${account.active
                                          ? "bg-orange-600/20 hover:bg-orange-600/35 text-orange-200"
                                          : "bg-blue-600/30 hover:bg-blue-600/45 text-blue-200"
                                          }`}
                                      >
                                        {account.active
                                          ? t({ ko: "풀 해제", en: "Pool Off", ja: "プール解除", zh: "移出池" })
                                          : t({ ko: "풀 추가", en: "Pool On", ja: "プール追加", zh: "加入池" })}
                                      </button>
                                      <button
                                        onClick={() => handleSaveAccount(account.id)}
                                        disabled={savingAccountId === account.id}
                                        className="text-[11px] px-2 py-1 rounded bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-200 disabled:opacity-50"
                                      >
                                        {t({ ko: "저장", en: "Save", ja: "保存", zh: "保存" })}
                                      </button>
                                      <button
                                        onClick={() => handleToggleAccount(account.id, account.status === "active" ? "disabled" : "active")}
                                        disabled={savingAccountId === account.id}
                                        className="text-[11px] px-2 py-1 rounded bg-amber-600/20 hover:bg-amber-600/35 text-amber-200 disabled:opacity-50"
                                      >
                                        {account.status === "active"
                                          ? t({ ko: "비활성", en: "Disable", ja: "無効化", zh: "禁用" })
                                          : t({ ko: "활성화", en: "Enable", ja: "有効化", zh: "启用" })}
                                      </button>
                                      <button
                                        onClick={() => handleDeleteAccount(provider as OAuthConnectProvider, account.id)}
                                        disabled={savingAccountId === account.id}
                                        className="text-[11px] px-2 py-1 rounded bg-red-600/20 hover:bg-red-600/35 text-red-300 disabled:opacity-50"
                                      >
                                        {t({ ko: "삭제", en: "Delete", ja: "削除", zh: "删除" })}
                                      </button>
                                    </div>

                                    {account.lastError && (
                                      <div className="text-[10px] text-red-300 break-words">
                                        {account.lastError}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* New OAuth Connect section — provider cards */}
              <div className="space-y-4 mt-8">
                <div className="text-sm font-bold text-slate-400 uppercase tracking-widest px-1">
                  {t({ ko: "NEW OAUTH CONNECTION", en: "NEW OAUTH CONNECTION", ja: "NEW OAUTH CONNECTION", zh: "NEW OAUTH CONNECTION" })}
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {CONNECTABLE_PROVIDERS.map(({ id, label, Logo, description }) => {
                    const providerInfo = oauthStatus.providers[id];
                    const isConnected = Boolean(providerInfo?.executionReady ?? providerInfo?.connected);
                    const isDetectedOnly = Boolean(providerInfo?.detected) && !isConnected;
                    const storageOk = oauthStatus.storageReady;
                    const isGitHub = id === "github-copilot";

                    return (
                      <div
                        key={id}
                        className={`flex flex-col items-center gap-4 py-8 px-6 rounded-xl border transition-all ${isConnected
                          ? "bg-[#1e2333]/80 border-emerald-500/30 hover:bg-[#232b3e]/80"
                          : isDetectedOnly
                            ? "bg-amber-500/5 border-amber-500/30"
                            : storageOk
                              ? "bg-[#1e2333]/60 border-slate-700/60 hover:border-slate-600 hover:bg-[#232b3e]/60"
                              : "bg-white/5 border-slate-800 opacity-50"
                          }`}
                      >
                        <div className="w-12 h-12 flex items-center justify-center bg-black/20 rounded-full mb-2 border border-slate-700/30">
                          <Logo className="w-8 h-8 text-white" />
                        </div>
                        <div className="text-center">
                          <span className="block text-xl font-bold text-slate-100">{label}</span>
                          <span className="block mt-1 text-sm text-slate-400 leading-tight">{description}</span>
                        </div>

                        <div className="mt-2 flex flex-col items-center gap-2">
                          {!storageOk ? (
                            <span className="text-xs px-3 py-1.5 rounded-lg bg-amber-900/50 text-amber-500 font-medium border border-amber-500/20">
                              {t({ ko: "암호화 키 필요", en: "Encryption key required", ja: "暗号化キーが必要", zh: "需要加密密钥" })}
                            </span>
                          ) : (
                            <>
                              {isConnected ? (
                                <span className="text-sm font-medium px-4 py-1.5 rounded-lg bg-[#064e3b]/80 text-[#34d399] border-none shadow-sm">
                                  {t({ ko: "연결됨", en: "Connected", ja: "接続中", zh: "已连接" })}
                                </span>
                              ) : isDetectedOnly ? (
                                <span className="text-sm px-4 py-1.5 rounded-lg bg-amber-900/40 text-amber-400 font-medium">
                                  {t({ ko: "감지됨", en: "Detected", ja: "検出済み", zh: "已检测" })}
                                </span>
                              ) : null}
                              <div className="flex gap-2">
                                {isGitHub ? (
                                  /* GitHub Copilot: Device Code flow */
                                  deviceCode && deviceStatus === "polling" ? (
                                    <div className="flex flex-col items-center gap-2 mt-2">
                                      <div className="text-lg text-slate-100 font-mono bg-slate-800/80 border border-slate-700 px-4 py-2 rounded-lg tracking-[0.2em] select-all shadow-inner">
                                        {deviceCode.userCode}
                                      </div>
                                      <span className="text-xs text-blue-400 animate-pulse font-medium">
                                        {t({ ko: "코드 입력 대기 중...", en: "Waiting for code...", ja: "コード入力待機中...", zh: "等待输入代码..." })}
                                      </span>
                                    </div>
                                  ) : (
                                    <>
                                      <button
                                        onClick={startDeviceCodeFlow}
                                        className="text-sm px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors shadow-sm inline-flex items-center"
                                      >
                                        {isConnected || isDetectedOnly
                                          ? t({ ko: "계정 추가", en: "Add Account", ja: "アカウント追加", zh: "添加账号" })
                                          : t({ ko: "연결하기", en: "Connect", ja: "接続", zh: "连接" })}
                                      </button>
                                      {isConnected && (
                                        <button
                                          onClick={() => handleDisconnect(id)}
                                          disabled={disconnecting === id}
                                          className="text-sm px-4 py-2 rounded-lg bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-500/30 transition-colors disabled:opacity-50"
                                        >
                                          {disconnecting === id ? "..." : t({ ko: "해제", en: "Disconnect", ja: "解除", zh: "断开" })}
                                        </button>
                                      )}
                                    </>
                                  )
                                ) : (
                                  /* Antigravity: Web redirect OAuth */
                                  <>
                                    <button
                                      onClick={() => handleConnect(id)}
                                      className="text-sm px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors shadow-sm inline-flex items-center"
                                    >
                                      {isConnected || isDetectedOnly
                                        ? t({ ko: "계정 추가", en: "Add Account", ja: "アカウント追가", zh: "添加账号" })
                                        : t({ ko: "연결하기", en: "Connect", ja: "接속", zh: "连接" })}
                                    </button>
                                    {isConnected && (
                                      <button
                                        onClick={() => handleDisconnect(id)}
                                        disabled={disconnecting === id}
                                        className="text-sm px-4 py-2 rounded-lg bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-500/30 transition-colors disabled:opacity-50"
                                      >
                                        {disconnecting === id ? "..." : t({ ko: "해제", en: "Disconnect", ja: "解除", zh: "断开" })}
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Device Code flow status messages */}
                {deviceStatus === "complete" && (
                  <div className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-2 rounded-lg">
                    {t({ ko: "GitHub Copilot 연결 완료!", en: "GitHub Copilot connected!", ja: "GitHub Copilot 接続完了!", zh: "GitHub Copilot 已连接!" })}
                  </div>
                )}
                {deviceError && (
                  <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
                    {deviceError}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </section>
      )}

      {/* API Providers Tab */}
      {tab === "api" && (
        <section className="bg-black/20 backdrop-blur-md border border-white/5 rounded-xl p-5 sm:p-6 space-y-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">
              {t({ ko: "API 프로바이더", en: "API Providers", ja: "API プロバイダー", zh: "API 提供商" })}
            </h3>
            <div className="flex items-center gap-3">
              <button
                onClick={loadApiProviders}
                disabled={apiProvidersLoading}
                className="text-xs font-bold text-indigo-400 hover:text-cyan-300 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                🔄 {t({ ko: "새로고침", en: "Refresh", ja: "更新", zh: "刷新" })}
              </button>
              {!apiAddMode && (
                <button
                  onClick={() => {
                    setApiAddMode(true);
                    setApiEditingId(null);
                    setApiForm({ name: "", type: "openai", base_url: "https://api.openai.com/v1", api_key: "" });
                  }}
                  className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-lg shadow-lg transition-all active:scale-[0.98]"
                >
                  + {t({ ko: "추가", en: "Add", ja: "追加", zh: "添加" })}
                </button>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
            {t({
              ko: "로컬 모델(Ollama 등), 프론티어 모델(OpenAI, Anthropic 등), 기타 서비스의 API를 등록하여 언어모델에 접근합니다.",
              en: "Register APIs for local models (Ollama, etc.), frontier models (OpenAI, Anthropic, etc.), and other services.",
              ja: "ローカルモデル（Ollama等）、フロンティアモデル（OpenAI, Anthropic等）、その他サービスのAPIを登録します。",
              zh: "注册本地模型（Ollama等）、前沿模型（OpenAI、Anthropic等）及其他服务的API。",
            })}
          </p>

          {/* Add/Edit Form */}
          {apiAddMode && (
            <div className="space-y-4 bg-white/5 border border-cyan-500/20 rounded-xl p-5 shadow-inner animate-in zoom-in-95 duration-200">
              <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                {apiEditingId
                  ? t({ ko: "프로바이더 수정", en: "Edit Provider", ja: "プロバイダー編集", zh: "编辑提供商" })
                  : t({ ko: "새 프로바이더 추가", en: "Add New Provider", ja: "新規プロバイダー追加", zh: "添加新提供商" })}
              </h4>

              {/* Type presets */}
              <div className="space-y-2">
                <label className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                  {t({ ko: "유형", en: "Type", ja: "タイプ", zh: "类型" })}
                </label>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(API_TYPE_PRESETS) as [ApiProviderType, { label: string; base_url: string }][]).map(
                    ([key, preset]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setApiForm((prev) => ({
                            ...prev,
                            type: key,
                            base_url: preset.base_url || prev.base_url,
                            name: prev.name || preset.label,
                          }));
                        }}
                        className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all ${apiForm.type === key
                          ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.1)]"
                          : "bg-black/30 border-white/5 text-slate-500 hover:border-white/10 hover:text-slate-300"
                          }`}
                      >
                        {preset.label}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Name / Base URL / API Key form */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                    {t({ ko: "이름", en: "Name", ja: "名前", zh: "名称" })}
                  </span>
                  <input
                    type="text"
                    value={apiForm.name}
                    onChange={(e) => setApiForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder={t({ ko: "예: My OpenAI", en: "e.g. My OpenAI", ja: "例: My OpenAI", zh: "如: My OpenAI" })}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-cyan-500/50 transition-all font-medium"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">Base URL</span>
                  <input
                    type="text"
                    value={apiForm.base_url}
                    onChange={(e) => setApiForm((prev) => ({ ...prev, base_url: e.target.value }))}
                    placeholder="https://api.openai.com/v1"
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-slate-300 text-sm font-mono focus:outline-none focus:border-cyan-500/50 transition-all"
                  />
                </label>
                <label className="col-span-full space-y-1.5">
                  <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                    API Key {apiForm.type === "ollama" && (
                      <span className="text-slate-600 italic normal-case">
                        ({t({ ko: "로컬은 보통 불필요", en: "usually not needed for local", ja: "ローカルは通常不要", zh: "本地通常不需要" })})
                      </span>
                    )}
                  </span>
                  <input
                    type="password"
                    value={apiForm.api_key}
                    onChange={(e) => setApiForm((prev) => ({ ...prev, api_key: e.target.value }))}
                    placeholder={apiEditingId
                      ? t({ ko: "변경하려면 입력 (빈칸=유지)", en: "Enter to change (blank=keep)", ja: "変更する場合は入力", zh: "输入以更改（空白=保持）" })
                      : "sk-..."
                    }
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-slate-300 text-sm font-mono focus:outline-none focus:border-cyan-500/50 transition-all"
                  />
                </label>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleApiProviderSave}
                  disabled={apiSaving || !apiForm.name.trim() || !apiForm.base_url.trim()}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {apiSaving
                    ? t({ ko: "저장 중...", en: "Saving...", ja: "保存中...", zh: "保存中..." })
                    : apiEditingId
                      ? t({ ko: "수정", en: "Update", ja: "更新", zh: "更新" })
                      : t({ ko: "추가", en: "Add", ja: "追加", zh: "添加" })}
                </button>
                <button
                  onClick={() => {
                    setApiAddMode(false);
                    setApiEditingId(null);
                    setApiForm({ name: "", type: "openai", base_url: "https://api.openai.com/v1", api_key: "" });
                  }}
                  className="px-6 py-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-bold rounded-xl border border-white/5 transition-all"
                >
                  {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
                </button>
              </div>
            </div>
          )}

          {/* Provider list */}
          {apiProvidersLoading ? (
            <div className="flex flex-col items-center justify-center py-12 opacity-50">
              <div className="animate-spin text-2xl mb-3">🔄</div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
                {t({ ko: "로딩 중...", en: "Loading...", ja: "読み込み中...", zh: "加载中..." })}
              </div>
            </div>
          ) : apiProviders.length === 0 && !apiAddMode ? (
            <div className="py-12 text-center rounded-xl bg-black/20 border border-white/5 border-dashed">
              <div className="text-3xl mb-4 opacity-30">🌐</div>
              <div className="text-xs font-bold text-slate-500 px-4">
                {t({
                  ko: "등록된 API 프로바이더가 없습니다. 위의 + 추가 버튼으로 시작하세요.",
                  en: "No API providers registered. Click + Add above to get started.",
                  ja: "APIプロバイダーが登録されていません。上の+追加ボタン부터 시작하세요.",
                  zh: "没有已注册的API提供商。点击上方的+添加按钮开始。",
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {apiProviders.map((provider) => {
                const testResult = apiTestResult[provider.id];
                const isExpanded = apiModelsExpanded[provider.id];
                return (
                  <div
                    key={provider.id}
                    className={`rounded-2xl border p-5 transition-all duration-300 ${provider.enabled
                      ? "bg-white/5 border-white/10 hover:bg-white/10 shadow-lg"
                      : "bg-black/40 border-white/5 opacity-50"
                      }`}
                  >
                    {/* Header */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-[0_0_8px_currentcolor] ${provider.enabled ? "bg-emerald-400 text-emerald-400" : "bg-slate-600 text-slate-600"
                          }`} />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-white truncate drop-shadow-[0_0_5px_rgba(255,255,255,0.2)]">
                            {provider.name}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/40 text-slate-400 uppercase font-bold border border-white/5 tracking-wider">
                              {provider.type}
                            </span>
                            {provider.has_api_key && (
                              <span className="text-[10px] text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.3)]">🔑 KEY</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                        {/* Test */}
                        <button
                          onClick={() => handleApiProviderTest(provider.id)}
                          disabled={apiTesting === provider.id}
                          className="text-[10px] uppercase font-bold px-3 py-1.5 rounded-lg bg-cyan-500/10 text-indigo-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all disabled:opacity-50"
                        >
                          {apiTesting === provider.id ? "..." : t({ ko: "연결 테스트", en: "Test", ja: "テスト", zh: "测试" })}
                        </button>
                        {/* Edit */}
                        <button
                          onClick={() => handleApiEditStart(provider)}
                          className="text-[10px] uppercase font-bold px-3 py-1.5 rounded-lg bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white transition-all"
                        >
                          {t({ ko: "수정", en: "Edit", ja: "編集", zh: "编辑" })}
                        </button>
                        {/* Toggle */}
                        <button
                          onClick={() => handleApiProviderToggle(provider.id, provider.enabled)}
                          className={`text-[10px] uppercase font-bold px-3 py-1.5 rounded-lg border transition-all ${provider.enabled
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                            }`}
                        >
                          {provider.enabled
                            ? t({ ko: "비활성", en: "Disable", ja: "無効化", zh: "禁用" })
                            : t({ ko: "활성화", en: "Enable", ja: "有効化", zh: "启用" })}
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => handleApiProviderDelete(provider.id)}
                          className="text-[10px] uppercase font-bold px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                        >
                          {t({ ko: "삭제", en: "Delete", ja: "削除", zh: "删除" })}
                        </button>
                      </div>
                    </div>

                    {/* Base URL */}
                    <div className="mt-2 text-[11px] font-mono text-slate-500 truncate italic">
                      {provider.base_url}
                    </div>

                    {/* Test result */}
                    {testResult && (
                      <div className={`mt-3 text-[11px] font-bold px-3 py-2 rounded-xl border ${testResult.ok
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                        : "bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                        }`}>
                        {testResult.ok ? "✨ " : "❌ "}{testResult.msg}
                      </div>
                    )}

                    {/* Models Display */}
                    {provider.models_cache && provider.models_cache.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-white/5">
                        <button
                          onClick={() => setApiModelsExpanded((prev) => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                          className="flex items-center gap-2 text-[10px] font-bold text-slate-500 hover:text-slate-300 uppercase tracking-widest transition-colors group"
                        >
                          <span className={`transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}>▶</span>
                          <span>
                            {t({ ko: "모델 카탈로그", en: "Model Catalog", ja: "モデル一覧", zh: "模型列表" })}
                            <span className="ml-2 text-slate-700">[{provider.models_cache.length}]</span>
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[12rem] overflow-y-auto pr-2 custom-scrollbar">
                            {provider.models_cache.map((model) => (
                              <div key={model} className="flex items-center justify-between bg-black/40 border border-white/5 rounded-lg p-2 group/model hover:border-cyan-500/30 transition-all shadow-inner">
                                <span className="text-[11px] font-mono text-slate-400 truncate group-hover/model:text-slate-200">{model}</span>
                                <button
                                  onClick={() => handleApiModelAssign(provider.id, model)}
                                  className="text-[9px] uppercase font-bold px-2 py-1 bg-cyan-500/10 hover:bg-cyan-500 text-indigo-400 hover:text-black rounded transition-all opacity-0 group-hover/model:opacity-100 whitespace-nowrap shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                                >
                                  {t({ ko: "배정", en: "Assign", ja: "割当", zh: "分配" })}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Agent Assign Modal */}
          {apiAssignTarget && (() => {
            const spriteMap = buildSpriteMap(apiAssignAgents);
            const localName = (nameEn: string, nameKo: string) =>
              localeTag === "ko" ? (nameKo || nameEn) : (nameEn || nameKo);
            const ROLE_LABELS: Record<string, Record<string, string>> = {
              team_leader: { ko: "팀장", en: "Team Leader", ja: "チームリーダー", zh: "组长" },
              senior: { ko: "시니어", en: "Senior", ja: "シニア", zh: "高级" },
              junior: { ko: "주니어", en: "Junior", ja: "ジュニア", zh: "初级" },
              intern: { ko: "인턴", en: "Intern", ja: "インターン", zh: "实习生" },
            };
            const roleBadge = (role: string) => {
              const label = ROLE_LABELS[role];
              const text = label ? t(label as Record<"ko" | "en" | "ja" | "zh", string>) : role;
              const color = role === "team_leader" ? "text-amber-400 bg-amber-500/15"
                : role === "senior" ? "text-blue-400 bg-blue-500/15"
                  : role === "junior" ? "text-emerald-400 bg-emerald-500/15"
                    : "text-slate-400 bg-slate-500/15";
              return <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter ${color}`}>{text}</span>;
            };
            const grouped = apiAssignDepts
              .map((dept) => ({
                dept,
                agents: apiAssignAgents.filter((a) => a.department_id === dept.id),
              }))
              .filter((g) => g.agents.length > 0);
            const deptIds = new Set(apiAssignDepts.map((d) => d.id));
            const unassigned = apiAssignAgents.filter((a) => !deptIds.has(a.department_id));

            const renderAgentRow = (agent: import("../types").Agent) => {
              const isAssigned = agent.cli_provider === "api"
                && agent.api_provider_id === apiAssignTarget.providerId
                && agent.api_model === apiAssignTarget.model;
              return (
                <button
                  key={agent.id}
                  disabled={apiAssigning || isAssigned}
                  onClick={() => handleApiAssignToAgent(agent.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-3 border ${isAssigned
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 cursor-default"
                    : "bg-black/20 border-white/5 hover:border-cyan-500/30 hover:bg-white/5 text-slate-300"
                    } disabled:opacity-50`}
                >
                  <AgentAvatar agent={agent} spriteMap={spriteMap} size={32} rounded="xl" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold truncate drop-shadow-[0_0_5px_rgba(255,255,255,0.1)]">
                        {localName(agent.name, agent.name_ko)}
                      </span>
                      {roleBadge(agent.role)}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5 italic">
                      {agent.cli_provider === "api" && agent.api_model
                        ? `API: ${agent.api_model}`
                        : agent.cli_provider}
                    </div>
                  </div>
                  {isAssigned && <span className="text-emerald-400 text-sm">✓</span>}
                </button>
              );
            };

            return (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setApiAssignTarget(null)}>
                <div className="w-[450px] max-w-(--vw) max-h-[85vh] rounded-2xl border border-white/10 bg-black/80 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
                  <div className="px-6 py-5 border-b border-white/5 bg-white/5">
                    <h4 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-cyan-500/20 text-indigo-400 text-lg">🤖</span>
                      {t({ ko: "에이전트 모델 배정", en: "Assign to Agent", ja: "エージェントに割り当て", zh: "分配给代理" })}
                    </h4>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest">{t({ ko: "대상 모델", en: "Target Model", ja: "対象モデル", zh: "目标模型" })}:</span>
                      <span className="text-[10px] px-2 py-0.5 bg-black/40 border border-white/5 rounded text-indigo-400 font-mono font-bold">{apiAssignTarget.model}</span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                    {apiAssignAgents.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 opacity-50">
                        <div className="animate-spin text-2xl mb-3">🔄</div>
                        <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
                          {t({ ko: "에이전트 로딩 중...", en: "Loading agents...", ja: "エージェント読み込み中...", zh: "正在加载代理..." })}
                        </div>
                      </div>
                    ) : (
                      <>
                        {grouped.map(({ dept, agents: deptAgents }) => (
                          <div key={dept.id} className="space-y-2.5">
                            <div className="flex items-center gap-2 px-1 mb-1">
                              <span className="text-lg drop-shadow-[0_0_5px_rgba(255,255,255,0.2)]">{dept.icon}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {localName(dept.name, dept.name_ko)}
                              </span>
                              <div className="h-px flex-1 bg-gradient-to-r from-white/5 to-transparent ml-2" />
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                              {deptAgents.map(renderAgentRow)}
                            </div>
                          </div>
                        ))}
                        {unassigned.length > 0 && (
                          <div className="space-y-2.5">
                            <div className="flex items-center gap-2 px-1 mb-1">
                              <span className="text-lg opacity-50">📁</span>
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                {t({ ko: "미배정", en: "Unassigned", ja: "未配属", zh: "未分配" })}
                              </span>
                              <div className="h-px flex-1 bg-gradient-to-r from-white/5 to-transparent ml-2" />
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                              {unassigned.map(renderAgentRow)}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="px-6 py-4 border-t border-white/5 bg-black/40 flex justify-end">
                    <button
                      onClick={() => setApiAssignTarget(null)}
                      className="px-6 py-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-[10px] font-bold uppercase tracking-widest rounded-xl border border-white/10 transition-all"
                    >
                      {t({ ko: "닫기", en: "Close", ja: "閉じる", zh: "关闭" })}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </section>
      )}

      {/* Gateway Channel Messaging Tab */}
      {tab === "gateway" && (
        <section className="bg-black/20 backdrop-blur-md border border-white/5 rounded-xl p-5 sm:p-6 space-y-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">
              {t({ ko: "채널 메시지 전송", en: "Channel Messaging", ja: "チャネルメッセージ", zh: "频道消息" })}
            </h3>
            <button
              onClick={loadGwTargets}
              disabled={gwLoading}
              className="text-xs font-bold text-indigo-400 hover:text-cyan-300 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              🔄 {t({ ko: "새로고침", en: "Refresh", ja: "更新", zh: "刷新" })}
            </button>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            {t({
              ko: "활성화된 Gateway 세션에 직접 메시지를 전송합니다.",
              en: "Send messages directly to active Gateway sessions.",
              ja: "有効な Gateway セッションに直接メッセージを送信します。",
              zh: "直接向活动的网关会话发送消息。",
            })}
          </p>

          {/* Channel selector */}
          <div className="space-y-2">
            <label className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">
              {t({ ko: "대상 채널", en: "Target Channel", ja: "対象チャネル", zh: "目标频道" })}
            </label>
            {gwLoading ? (
              <div className="text-xs text-slate-500 animate-pulse py-2 flex items-center gap-2">
                <span className="animate-spin">🔄</span>
                <span>{t({ ko: "채널 목록 로딩 중...", en: "Loading channels...", ja: "チャネル読み込み中...", zh: "正在加载频道..." })}</span>
              </div>
            ) : gwTargets.length === 0 ? (
              <div className="text-xs text-amber-500/80 bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 italic">
                {t({
                  ko: "채널이 없습니다. Gateway가 실행 중인지 확인하세요.",
                  en: "No channels found. Make sure Gateway is running.",
                  ja: "チャネルがありません。ゲートウェイが実行中인지 확인하세요.",
                  zh: "未找到频道。请确认网关正在运行。",
                })}
              </div>
            ) : (
              <select
                value={gwSelected}
                onChange={(e) => {
                  setGwSelected(e.target.value);
                  localStorage.setItem("nexusclaw.gateway.lastTarget", e.target.value);
                }}
                className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-slate-200 text-sm font-bold focus:outline-none focus:border-cyan-500/50 transition-all appearance-none cursor-pointer"
              >
                {gwTargets.map((tgt) => (
                  <option key={tgt.sessionKey} value={tgt.sessionKey} className="bg-[#0c0c14] text-slate-200">
                    {tgt.displayName} ({tgt.channel})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Message input */}
          <div className="space-y-2">
            <label className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">
              {t({ ko: "메시지", en: "Message", ja: "メッセージ", zh: "消息" })}
            </label>
            <textarea
              value={gwText}
              onChange={(e) => setGwText(e.target.value)}
              placeholder={t({ ko: "메시지를 입력하세요...", en: "Type a message...", ja: "メッセージを入力...", zh: "输入消息..." })}
              rows={4}
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-2xl text-slate-200 text-sm focus:outline-none focus:border-cyan-500/50 transition-all resize-none shadow-inner custom-scrollbar"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleGwSend();
                }
              }}
            />
          </div>

          {/* Send button + status */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-4">
              <button
                onClick={handleGwSend}
                disabled={gwSending || !gwSelected || !gwText.trim()}
                className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold rounded-xl shadow-[0_4px_15px_rgba(6,182,212,0.2)] transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {gwSending
                  ? t({ ko: "전송 중...", en: "Sending...", ja: "送信中...", zh: "发送中..." })
                  : t({ ko: "메시지 전송", en: "Send Message", ja: "送信", zh: "发送" })}
              </button>
              <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest hidden sm:block">
                Ctrl + Enter
              </span>
            </div>
            {/* Status feedback */}
            {gwStatus && (
              <div className={`text-[10px] uppercase font-bold px-4 py-2 rounded-lg animate-in slide-in-from-right-4 duration-300 shadow-lg border ${gwStatus.ok
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-red-500/10 text-red-400 border-red-500/20"
                }`}>
                {gwStatus.ok ? "✓ " : "❌ "}{gwStatus.msg}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
