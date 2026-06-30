// FinGuard AI — API Client
// All calls go through this centralized client.

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("fg_token");
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

// ── Auth ────────────────────────────────────────────────────
export const auth = {
  signup: (data: { name: string; email: string; password: string; role?: string }) =>
    apiFetch<{ access_token: string; user: User }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    apiFetch<{ access_token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  me: () => apiFetch<User>("/api/auth/me"),
};

// ── Reports ─────────────────────────────────────────────────
export const reports = {
  upload: (formData: FormData) => {
    const token = getToken();
    return fetch(`${API_BASE}/api/reports/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }).then(async (r) => {
      if (!r.ok) {
        const err = await r.json().catch(() => ({ detail: r.statusText }));
        throw new Error(err.detail || "Upload failed");
      }
      return r.json();
    });
  },

  status: (reportId: string) =>
    apiFetch<ReportStatus>(`/api/reports/${reportId}/status`),

  companies: () => apiFetch<Company[]>("/api/companies"),

  companyReports: (companyId: string) =>
    apiFetch<ReportSummary[]>(`/api/companies/${companyId}/reports`),

  list: () => apiFetch<RecentReport[]>("/api/reports"),
};

// ── Analysis ─────────────────────────────────────────────────
export const analysis = {
  get: (reportId: string) =>
    apiFetch<AnalysisResult>(`/api/analysis/${reportId}`),

  history: (reportId: string) =>
    apiFetch<AnalysisHistory[]>(`/api/analysis/${reportId}/history`),

  recompute: (reportId: string) =>
    apiFetch(`/api/analysis/${reportId}/recompute`, { method: "POST" }),

  search: (reportId: string, q: string) =>
    apiFetch<any[]>(`/api/analysis/${reportId}/search?q=${encodeURIComponent(q)}`),
};

// ── Chat ─────────────────────────────────────────────────────
export const chat = {
  history: (reportId: string) =>
    apiFetch<ChatMessage[]>(`/api/chat/${reportId}/history`),

  stream: (reportId: string, message: string, history: ChatMessage[] = []) => {
    const token = getToken();
    return fetch(`${API_BASE}/api/chat/${reportId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        message,
        history: history.map((m) => ({ role: m.role, content: m.content })),
      }),
    });
  },

  portfolioStream: (reportIds: string[], message: string, history: ChatMessage[] = []) => {
    const token = getToken();
    return fetch(`${API_BASE}/api/chat/portfolio`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        report_ids: reportIds,
        message,
        history: history.map((m) => ({ role: m.role, content: m.content })),
      }),
    });
  },
};

// ── Portfolio ─────────────────────────────────────────────────
export const portfolio = {
  create: (name: string, description?: string) =>
    apiFetch("/api/portfolio/", { method: "POST", body: JSON.stringify({ name, description }) }),

  riskSummary: (portfolioId: string) =>
    apiFetch<PortfolioRisk>(`/api/portfolio/${portfolioId}/risk-summary`),

  addHolding: (portfolioId: string, companyId: string, weightPct: number) =>
    apiFetch(`/api/portfolio/${portfolioId}/holdings`, {
      method: "POST",
      body: JSON.stringify({ company_id: companyId, weight_pct: weightPct }),
    }),

  simulatorData: () =>
    apiFetch<any[]>("/api/portfolio/simulator-data"),
};

// ── Watchlist ─────────────────────────────────────────────────
export const watchlist = {
  get: () => apiFetch<WatchlistItem[]>("/api/watchlist/"),
  add: (companyId: string) =>
    apiFetch(`/api/watchlist/${companyId}`, { method: "POST" }),
  remove: (companyId: string) =>
    apiFetch(`/api/watchlist/${companyId}`, { method: "DELETE" }),
};

// ── Alerts ────────────────────────────────────────────────────
export const alerts = {
  listRules: () => apiFetch<AlertRule[]>("/api/alerts/rules"),
  createRule: (rule: Partial<AlertRule>) =>
    apiFetch("/api/alerts/rules", { method: "POST", body: JSON.stringify(rule) }),
  feed: () => apiFetch<TriggeredAlert[]>("/api/alerts/feed"),
};

// ── Compare ───────────────────────────────────────────────────
export const compare = {
  companies: (companyIds: string[]) =>
    apiFetch<{ companies: CompareResult[] }>("/api/compare/", {
      method: "POST",
      body: JSON.stringify({ company_ids: companyIds }),
    }),
};

// ── News & Insider ────────────────────────────────────────────
export const news = {
  getCompanyNews: (companyId: string) =>
    apiFetch<NewsFeedItem[]>(`/api/news/${companyId}`),
};

export const insider = {
  getCompanyInsiderActivity: (companyId: string) =>
    apiFetch<InsiderActivity[]>(`/api/insider/${companyId}`),
};

// ── Annotations ───────────────────────────────────────────────
export const annotations = {
  get: (reportId: string) => apiFetch<Annotation[]>(`/api/annotations/${reportId}`),
  create: (reportId: string, data: { target_ref: string; comment: string; target_type?: string; parent_id?: string }) =>
    apiFetch<any>(`/api/annotations/${reportId}`, { method: "POST", body: JSON.stringify(data) }),
};

// ── Diff ──────────────────────────────────────────────────────
export const diff = {
  create: (companyId: string, yearFrom: number, yearTo: number) =>
    apiFetch<any>("/api/diff/", {
      method: "POST",
      body: JSON.stringify({ company_id: companyId, year_from: yearFrom, year_to: yearTo }),
    }),
  getCompanyDiffs: (companyId: string) =>
    apiFetch<any[]>(`/api/diff/${companyId}`),
};

// ── Earnings ──────────────────────────────────────────────────
export const earnings = {
  sentiment: (callId: string) =>
    apiFetch(`/api/earnings-calls/${callId}/sentiment`),
};

// ── Export ────────────────────────────────────────────────────
export const exportReport = (reportId: string) => {
  const token = getToken();
  return fetch(`${API_BASE}/api/export/${reportId}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};

// ── Admin ─────────────────────────────────────────────────────
export const admin = {
  usageMetrics: () => apiFetch("/api/admin/usage-metrics"),
  apiKeys: () => apiFetch("/api/admin/api-keys"),
  createApiKey: (name: string) =>
    apiFetch(`/api/admin/api-keys?name=${encodeURIComponent(name)}`, { method: "POST" }),
};

// ── Types ─────────────────────────────────────────────────────
export interface User {
  user_id: string;
  name: string;
  email: string;
  role: string;
  created_at?: string;
}

export interface Company {
  company_id: string;
  name: string;
  sector?: string;
  ticker?: string;
}

export interface ReportStatus {
  report_id: string;
  status: "uploaded" | "processing" | "extracted" | "analyzed" | "failed";
  page_count?: number;
  ocr_quality?: number;
  error_message?: string;
}

export interface RecentReport {
  report_id: string;
  company_name: string;
  year: number;
  status: string;
  health_score?: number;
  fraud_score?: number;
  created_at: string;
}

export interface ReportSummary {
  report_id: string;
  year: number;
  status: string;
  file_name?: string;
  created_at: string;
}

export interface Citation {
  text: string;
  page: number;
  impact: "positive" | "negative" | "neutral";
}

export interface AnalysisResult {
  report_id: string;
  company_id: string;
  status: string;
  health_score: number;
  fraud_score: number;
  risk_score: number;
  esg_score: number;
  investment_outlook: string;
  profitability_score?: number;
  liquidity_score?: number;
  solvency_score?: number;
  growth_score?: number;
  esg_environmental?: number;
  esg_social?: number;
  esg_governance?: number;
  financials: {
    revenue?: number;
    net_profit?: number;
    ebitda?: number;
    total_debt?: number;
    cash_and_equivalents?: number;
    total_assets?: number;
    total_equity?: number;
    operating_cash_flow?: number;
    eps?: number;
  };
  ratios: {
    roe?: number;
    roa?: number;
    current_ratio?: number;
    quick_ratio?: number;
    debt_to_equity?: number;
    interest_coverage?: number;
    profit_margin?: number;
    operating_margin?: number;
  };
  fraud_citations: Citation[];
  health_citations: Citation[];
  risk_citations: Citation[];
  executive_summary?: string;
  fraud_narrative?: string;
  investment_narrative?: string;
  risk_narrative?: string;
  esg_narrative?: string;
  self_critique_passed?: boolean;
  self_critique_notes?: string;
  model_used?: string;
  prompt_version?: string;
  analyzed_at?: string;

  // New local computed fields
  local_fraud_alerts?: {
    flags: {
      flag: string;
      detail: string;
      category: string;
      severity: "low" | "medium" | "high" | "critical";
      rule: string;
      prior_auditor?: string;
      current_auditor?: string;
    }[];
    total_count: number;
    counts_by_category: Record<string, number>;
    counts_by_severity: Record<string, number>;
  };
  risk_heatmap?: {
    debt_risk?: { level: string; score?: number };
    liquidity_risk?: { level: string; score?: number };
    interest_coverage_risk?: { level: string; score?: number };
    fraud_risk?: { level: string; score?: number };
    governance_risk?: { level: string; score?: number };
  };
  confidence_score?: number;
  confidence_breakdown?: {
    ocr_quality?: number;
    citations_count?: number;
    section_coverage?: number;
  };
  boardroom_summary?: string;
  investment_committee?: {
    bull: string[];
    bear: string[];
    neutral: string[];
  };
}

export interface AnalysisHistory {
  year: number;
  health_score?: number;
  fraud_score?: number;
  risk_score?: number;
  esg_score?: number;
  auditor_name?: string;
  auditor_changed?: boolean;
  restated_flag?: boolean;
  revenue?: number;
  net_profit?: number;
  total_debt?: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: { page: number }[];
  created_at?: string;
}

export interface PortfolioRisk {
  portfolio_id: string;
  weighted_fraud_score: number;
  weighted_health_score: number;
  weighted_risk_score: number;
  sector_exposure: Record<string, number>;
  concentration_risk: number;
  holdings: {
    company: string;
    sector?: string;
    weight_pct: number;
    fraud_score?: number;
    health_score?: number;
  }[];
}

export interface WatchlistItem {
  company_id: string;
  name: string;
  sector?: string;
  added_at: string;
}

export interface AlertRule {
  rule_id: string;
  name: string;
  metric: string;
  operator: string;
  threshold: number;
  channel: string;
  is_active: boolean;
}

export interface TriggeredAlert {
  alert_id: string;
  rule_id: string;
  rule_name: string;
  company_id: string;
  company_name: string;
  metric: string;
  operator: string;
  threshold: number;
  value: number;
  channel: string;
  triggered_at: string;
  severity: "critical" | "high" | "info";
}

export interface CompareResult {
  company_id: string;
  name: string;
  sector?: string;
  year?: number;
  health_score?: number;
  fraud_score?: number;
  risk_score?: number;
  esg_score?: number;
  revenue?: number;
  net_profit?: number;
  profit_margin?: number;
  operating_margin?: number;
  debt_to_equity?: number;
  roe?: number;
  roa?: number;
  current_ratio?: number;
  quick_ratio?: number;
  interest_coverage?: number;
  pe_ratio?: number;
  revenue_growth?: number;
}

export interface Annotation {
  annotation_id: string;
  author: string;
  target_ref: string;
  comment: string;
  resolved: boolean;
  created_at: string;
}

export interface NewsFeedItem {
  news_id: string;
  source: string;
  headline: string;
  summary: string;
  url: string;
  sentiment: "positive" | "neutral" | "negative";
  relevance_score: number;
  published_at: string;
}

export interface InsiderActivity {
  activity_id: string;
  activity_type: "buy" | "sell" | "block_deal" | "pledge";
  holder_name: string;
  holder_category: string;
  shares_traded: number;
  pct_change: number;
  value_inr_cr: number;
  date: string;
  source_url: string;
}
