import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Calendar as CalendarIcon, Download, Users, TrendingUp, DollarSign, ExternalLink, Share2, Globe, RefreshCcw } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Pie, PieChart, Cell } from "recharts";

// -----------------------------
// Types
// -----------------------------

type Account = { id: string; name: string; type: "personal" | "business" };

type DailyPoint = {
  date: string; // YYYY-MM-DD
  organicReach: number;
  paidReach: number;
  impressions: number;
  engagements: number;
  clicks: number;
  spend: number;
  followers?: number;
  sessions?: number;
  conversions?: number;
  source?: string;
};

// -----------------------------
// Helpers
// -----------------------------

const fmt = {
  num: (n: number) => n.toLocaleString(undefined),
  pct: (n: number) => `${(n * 100).toFixed(1)}%`,
  cur: (n: number, currency: string = "USD") => new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n),
};

const toCSV = (rows: Record<string, string | number>[]) => {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const body = rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")).join("\n");
  return headers.join(",") + "\n" + body;
};

const downloadFile = (filename: string, contents: string, type = "text/csv") => {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const dateRangePresets = [
  { key: "last14", label: "Last 14 days", days: 14 },
  { key: "last30", label: "Last 30 days", days: 30 },
  { key: "last90", label: "Last 90 days", days: 90 },
];

function makeDates(days: number) {
  const out: string[] = [];
  const end = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function makeDatesBetween(startISO: string, endISO: string) {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const out: string[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    out.push(new Date(d).toISOString().slice(0, 10));
  }
  return out;
}

function rand(seed: number) {
  let x = Math.sin(seed) * 10000;
  return () => {
    x = Math.sin(x) * 10000;
    return x - Math.floor(x);
  };
}

function generateDemoSeries(days: number, accountMix: number) {
  const dates = makeDates(days);
  const r = rand(days * 13 + accountMix * 7);
  let followers = 1000 + Math.round(r() * 500);
  return dates.map((date, i) => {
    const base = 300 + r() * 300 * accountMix;
    const paid = (i % 3 === 0 ? 1 : 0) * (50 + r() * 250);
    const organic = base + r() * 200;
    const impressions = organic * (1.6 + r() * 0.6) + paid * (2.2 + r() * 0.8);
    const clicks = impressions * (0.02 + r() * 0.02);
    const engagements = clicks * (0.6 + r() * 0.5);
    const spend = paid * (0.5 + r() * 0.5);
    followers += Math.round(r() * 5 + (i % 7 === 0 ? 10 : 2));
    const sessions = clicks * (0.6 + r() * 0.4);
    const conversions = sessions * (0.03 + r() * 0.03);
    const sources = ["linkedin / organic", "linkedin / paid", "direct / none", "google / cpc", "newsletter / email"];
    return {
      date,
      organicReach: Math.round(organic),
      paidReach: Math.round(paid),
      impressions: Math.round(impressions),
      clicks: Math.round(clicks),
      engagements: Math.round(engagements),
      spend: Number(spend.toFixed(2)),
      followers,
      sessions: Math.round(sessions),
      conversions: Math.round(conversions),
      source: sources[Math.floor(r() * sources.length)],
    } as DailyPoint;
  });
}

const DEMO_ACCOUNTS: Account[] = [
  { id: "pers_1", name: "Philip Treiner", type: "personal" },
  { id: "pers_2", name: "Jesper Kring", type: "personal" },
  { id: "pers_3", name: "Mia Lena", type: "personal" },
  { id: "biz_1", name: "Valified (Company Page)", type: "business" },
];

async function fetchLinkedInSeries(accountIds: string[], days: number): Promise<Record<string, DailyPoint[]>> {
  await new Promise((r) => setTimeout(r, 200));
  const mix = accountIds.map((id, i) => [id, generateDemoSeries(days, i + 1)] as const);
  return Object.fromEntries(mix);
}

async function fetchGA4Series(days: number): Promise<DailyPoint[]> {
  await new Promise((r) => setTimeout(r, 200));
  return generateDemoSeries(days, 2).map((d) => ({
    date: d.date,
    sessions: d.sessions ?? 0,
    conversions: d.conversions ?? 0,
    source: d.source,
    organicReach: d.organicReach,
    paidReach: d.paidReach,
    impressions: d.impressions,
    engagements: d.engagements,
    clicks: d.clicks,
    spend: d.spend,
  }));
}

function transformLinkedInToDaily(rawByAccount: Record<string, DailyPoint[]>) {
  return rawByAccount;
}

function transformGA4ToDaily(raw: DailyPoint[]) {
  return raw;
}

function KPI({ label, value, sub, icon }: { label: string; value: string; sub?: string | null; icon?: React.ReactNode }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function SectionTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="flex items-center gap-2">{right}</div>
    </div>
  );
}

export default function MarketingDashboardV2() {
  const [accounts, setAccounts] = useState<Account[]>(DEMO_ACCOUNTS);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(accounts.map((a) => a.id));
  const [preset, setPreset] = useState(dateRangePresets[1]);
  const [manualStart, setManualStart] = useState<string>("");
  const [manualEnd, setManualEnd] = useState<string>("");
  const [compareEnabled, setCompareEnabled] = useState<boolean>(true);
  const [includeOrganic, setIncludeOrganic] = useState(true);
  const [includePaid, setIncludePaid] = useState(true);
  const [currency, setCurrency] = useState("USD");
  const [isLoading, setIsLoading] = useState(false);
  const [printMode, setPrintMode] = useState(false);

  const [liDataByAccount, setLiDataByAccount] = useState<Record<string, DailyPoint[]>>({});
  const [ga4Data, setGa4Data] = useState<DailyPoint[]>([]);
  const [prevLiDataByAccount, setPrevLiDataByAccount] = useState<Record<string, DailyPoint[]>>({});
  const [prevGa4Data, setPrevGa4Data] = useState<DailyPoint[]>([]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      let dates: string[];
      if (manualStart && manualEnd) {
        dates = makeDatesBetween(manualStart, manualEnd);
      } else {
        dates = makeDates(preset.days);
      }
      const len = dates.length;

      const [liRaw, gaRaw] = await Promise.all([
        fetchLinkedInSeries(selectedAccounts, len),
        fetchGA4Series(len),
      ]);
      setLiDataByAccount(transformLinkedInToDaily(liRaw));
      setGa4Data(transformGA4ToDaily(gaRaw));

      if (compareEnabled) {
        const [prevLiRaw, prevGaRaw] = await Promise.all([
          fetchLinkedInSeries(selectedAccounts, len),
          fetchGA4Series(len),
        ]);
        setPrevLiDataByAccount(transformLinkedInToDaily(prevLiRaw));
        setPrevGa4Data(transformGA4ToDaily(prevGaRaw));
      } else {
        setPrevLiDataByAccount({});
        setPrevGa4Data([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, selectedAccounts, manualStart, manualEnd, compareEnabled]);

  // Aggregate LI (current)
  const liAggregated = useMemo(() => {
    const byDate: Record<string, DailyPoint> = {};
    for (const accId of Object.keys(liDataByAccount)) {
      for (const d of liDataByAccount[accId] || []) {
        if (!byDate[d.date]) byDate[d.date] = { ...d };
        else {
          const x = byDate[d.date];
          x.organicReach += d.organicReach;
          x.paidReach += d.paidReach;
          x.impressions += d.impressions;
          x.engagements += d.engagements;
          x.clicks += d.clicks;
          x.spend += d.spend;
          x.followers = (x.followers || 0) + (d.followers || 0);
        }
      }
    }
    const dates = manualStart && manualEnd ? makeDatesBetween(manualStart, manualEnd) : makeDates(preset.days);
    return dates.map((date) => byDate[date] || { date, organicReach: 0, paidReach: 0, impressions: 0, engagements: 0, clicks: 0, spend: 0, followers: 0 });
  }, [liDataByAccount, preset.days, manualStart, manualEnd]);

  const total = useMemo(() => {
    const t = { organicReach: 0, paidReach: 0, impressions: 0, engagements: 0, clicks: 0, spend: 0, sessions: 0, conversions: 0 };
    for (const d of liAggregated) { t.organicReach += d.organicReach; t.paidReach += d.paidReach; t.impressions += d.impressions; t.engagements += d.engagements; t.clicks += d.clicks; t.spend += d.spend; }
    for (const g of ga4Data) { t.sessions += g.sessions || 0; t.conversions += g.conversions || 0; }
    return t;
  }, [liAggregated, ga4Data]);

  const prevTotal = useMemo(() => {
    const t = { organicReach: 0, paidReach: 0, impressions: 0, engagements: 0, clicks: 0, spend: 0, sessions: 0, conversions: 0 };
    const byDate: Record<string, DailyPoint> = {};
    for (const accId of Object.keys(prevLiDataByAccount)) {
      for (const d of prevLiDataByAccount[accId] || []) {
        if (!byDate[d.date]) byDate[d.date] = { ...d };
        else {
          const x = byDate[d.date];
          x.organicReach += d.organicReach; x.paidReach += d.paidReach; x.impressions += d.impressions; x.engagements += d.engagements; x.clicks += d.clicks; x.spend += d.spend;
        }
      }
    }
    const prevAgg = Object.values(byDate).sort((a,b)=>a.date<b.date?-1:1).slice(0, liAggregated.length);
    for (const d of prevAgg) { t.organicReach += d.organicReach; t.paidReach += d.paidReach; t.impressions += d.impressions; t.engagements += d.engagements; t.clicks += d.clicks; t.spend += d.spend; }
    for (const g of prevGa4Data.slice(0, ga4Data.length)) { t.sessions += g.sessions || 0; t.conversions += g.conversions || 0; }
    return t;
  }, [prevLiDataByAccount, prevGa4Data, liAggregated.length, ga4Data.length]);

  const ctr = total.impressions ? total.clicks / total.impressions : 0;
  const cpc = total.clicks ? total.spend / total.clicks : 0;
  const cpm = total.impressions ? (total.spend / total.impressions) * 1000 : 0;
  const convRate = total.sessions ? (total.conversions || 0) / total.sessions : 0;

  const timeSeries = useMemo(() => {
    const map: Record<string, any> = {};
    for (const d of liAggregated) map[d.date] = { date: d.date, ...d };
    for (const g of ga4Data) {
      map[g.date] = { ...(map[g.date] || { date: g.date, organicReach: 0, paidReach: 0, impressions: 0, engagements: 0, clicks: 0, spend: 0 }), sessions: g.sessions || 0, conversions: g.conversions || 0 };
    }
    const merged = Object.values(map).sort((a, b) => (a.date < b.date ? -1 : 1));
    const current = merged.map((d) => ({ ...d, organicReach: includeOrganic ? d.organicReach : 0, paidReach: includePaid ? d.paidReach : 0 }));

    let previousAligned: any[] = [];
    if (compareEnabled) {
      const byDate: Record<string, DailyPoint> = {};
      for (const accId of Object.keys(prevLiDataByAccount)) {
        for (const d of prevLiDataByAccount[accId] || []) {
          if (!byDate[d.date]) byDate[d.date] = { ...d };
          else { const x = byDate[d.date]; x.organicReach += d.organicReach; x.paidReach += d.paidReach; x.impressions += d.impressions; x.engagements += d.engagements; x.clicks += d.clicks; x.spend += d.spend; }
        }
      }
      const prevAgg = Object.values(byDate).sort((a, b) => (a.date < b.date ? -1 : 1));
      previousAligned = current.map((d, i) => ({
        date: d.date,
        prevReach: (prevAgg[i]?.organicReach || 0) + (prevAgg[i]?.paidReach || 0),
        prevSessions: prevGa4Data[i]?.sessions || 0,
        prevConversions: prevGa4Data[i]?.conversions || 0,
      }));
    }
    return current.map((d, i) => ({ ...d, ...(previousAligned[i] || {}) }));
  }, [liAggregated, ga4Data, includeOrganic, includePaid, compareEnabled, prevLiDataByAccount, prevGa4Data]);

  const trafficBySource = useMemo(() => {
    const by: Record<string, { source: string; sessions: number; conversions: number }> = {};
    for (const g of ga4Data) { const key = g.source || "unknown"; if (!by[key]) by[key] = { source: key, sessions: 0, conversions: 0 }; by[key].sessions += g.sessions || 0; by[key].conversions += g.conversions || 0; }
    return Object.values(by).sort((a, b) => b.sessions - a.sessions);
  }, [ga4Data]);

  const exportCSV = () => {
    const rows = timeSeries.map((d) => ({ date: d.date, organicReach: d.organicReach, paidReach: d.paidReach, impressions: d.impressions, clicks: d.clicks, engagements: d.engagements, spend: d.spend, sessions: d.sessions ?? 0, conversions: d.conversions ?? 0, prevReach: d.prevReach ?? 0, prevSessions: d.prevSessions ?? 0, prevConversions: d.prevConversions ?? 0 }));
    downloadFile("dashboard_timeseries.csv", toCSV(rows));
  };

  const selectedLabels = useMemo(() => accounts.filter((a) => selectedAccounts.includes(a.id)).map((a) => a.name), [accounts, selectedAccounts]);

  const changeLabel = (cur: number, prev: number) => {
    if (!compareEnabled || !prev) return null;
    const delta = ((cur - prev) / prev) * 100;
    const sign = delta >= 0 ? "▲" : "▼";
    return `${sign} ${Math.abs(delta).toFixed(1)}% vs prev`;
  };

  return (
    <div className={`min-h-screen ${printMode ? "bg-white" : "bg-slate-50"}`}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Marketing Performance</h1>
            <p className="text-sm text-muted-foreground">LinkedIn (organic + paid) · Website (GA4)</p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <Button variant="outline" onClick={() => setPrintMode((v) => !v)}>
              <ExternalLink className="w-4 h-4 mr-2" /> {printMode ? "Exit Print" : "Print Mode"}
            </Button>
            <Button variant="outline" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
            <Button onClick={loadData} disabled={isLoading}>
              <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
            </Button>
          </div>
        </div>

        {/* Controls */}
        <Card className="mt-4">
          <CardContent className="py-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
              {/* Date & Compare */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Label className="w-28">Date range</Label>
                  <div className="flex gap-2 flex-wrap">
                    {dateRangePresets.map((p) => (
                      <Button key={p.key} size="sm" variant={preset.key === p.key && !manualStart ? "default" : "outline"} onClick={() => { setPreset(p); setManualStart(""); setManualEnd(""); }}>
                        <CalendarIcon className="w-4 h-4 mr-2" /> {p.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Label className="w-28">Custom</Label>
                  <Input type="date" value={manualStart} onChange={(e) => setManualStart(e.target.value)} className="w-44" />
                  <span>to</span>
                  <Input type="date" value={manualEnd} onChange={(e) => setManualEnd(e.target.value)} className="w-44" />
                  <Button size="sm" onClick={loadData} disabled={!manualStart || !manualEnd}>Apply</Button>
                  <div className="flex items-center gap-2 ml-2">
                    <Switch id="compare" checked={compareEnabled} onCheckedChange={setCompareEnabled} />
                    <Label htmlFor="compare">Compare to previous period</Label>
                  </div>
                </div>
              </div>

              {/* Accounts & Toggles */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Label className="w-28">Accounts</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Users className="w-4 h-4 mr-2" /> {selectedLabels.length} selected
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-72">
                      <DropdownMenuLabel>Select accounts</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {accounts.map((a) => (
                        <DropdownMenuCheckboxItem key={a.id} checked={selectedAccounts.includes(a.id)} onCheckedChange={(v) => setSelectedAccounts((prev) => v ? [...prev, a.id] : prev.filter((x) => x !== a.id))}>
                          <div className="flex items-center gap-2">
                            <Badge variant={a.type === "business" ? "default" : "secondary"}>{a.type}</Badge>
                            <span>{a.name}</span>
                          </div>
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch id="organic" checked={includeOrganic} onCheckedChange={setIncludeOrganic} />
                    <Label htmlFor="organic">Include Organic</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="paid" checked={includePaid} onCheckedChange={setIncludePaid} />
                    <Label htmlFor="paid">Include Paid</Label>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <KPI label="Total Reach" value={fmt.num(total.organicReach + total.paidReach)} sub={changeLabel(total.organicReach + total.paidReach, (prevTotal.organicReach + prevTotal.paidReach) || 0) || `${fmt.num(total.organicReach)} organic · ${fmt.num(total.paidReach)} paid`} icon={<Share2 className="w-4 h-4 text-muted-foreground" />} />
          <KPI label="Impressions" value={fmt.num(total.impressions)} sub={changeLabel(total.impressions, prevTotal.impressions) || `CTR ${fmt.pct(total.impressions ? total.clicks / total.impressions : 0)}`} icon={<TrendingUp className="w-4 h-4 text-muted-foreground" />} />
          <KPI label="Spend" value={fmt.cur(total.spend, currency)} sub={changeLabel(total.spend, prevTotal.spend) || `CPC ${fmt.cur(total.clicks ? total.spend / total.clicks : 0, currency)} · CPM ${fmt.cur(total.impressions ? (total.spend / total.impressions) * 1000 : 0, currency)}`} icon={<DollarSign className="w-4 h-4 text-muted-foreground" />} />
          <KPI label="Website" value={fmt.num(total.sessions)} sub={changeLabel(total.sessions, prevTotal.sessions) || `${fmt.num(total.conversions)} conv · CR ${fmt.pct(total.sessions ? (total.conversions || 0) / total.sessions : 0)}`} icon={<Globe className="w-4 h-4 text-muted-foreground" />} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
          <Card className="xl:col-span-2">
            <CardHeader className="pb-2">
              <SectionTitle title="Reach over time" right={<Badge variant="secondary">Stacked + Compare</Badge>} />
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeSeries} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradOrg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopOpacity={0.45} />
                        <stop offset="95%" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="gradPaid" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopOpacity={0.45} />
                        <stop offset="95%" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickMargin={8} />
                    <YAxis />
                    <Tooltip formatter={(v: any) => (typeof v === "number" ? v.toLocaleString() : v)} />
                    <Legend />
                    <Area type="monotone" dataKey="organicReach" name="Organic" stackId="1" fill="url(#gradOrg)" strokeWidth={2} />
                    <Area type="monotone" dataKey="paidReach" name="Paid" stackId="1" fill="url(#gradPaid)" strokeWidth={2} />
                    {compareEnabled && (
                      <Line type="monotone" dataKey="prevReach" name="Prev period (total reach)" strokeDasharray="4 4" strokeWidth={2} dot={false} />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <SectionTitle title="Sessions & Conversions" right={<Badge variant="secondary">GA4</Badge>} />
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeries} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickMargin={8} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="sessions" name="Sessions" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="conversions" name="Conversions" strokeDasharray="4 4" strokeWidth={2} dot={false} />
                    {compareEnabled && (
                      <>
                        <Line type="monotone" dataKey="prevSessions" name="Prev Sessions" strokeWidth={2} dot={false} strokeDasharray="3 3" />
                        <Line type="monotone" dataKey="prevConversions" name="Prev Conversions" strokeWidth={2} dot={false} strokeDasharray="2 6" />
                      </>
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
          <Card className="xl:col-span-2">
            <CardHeader className="pb-2">
              <SectionTitle title="Impressions, Clicks & Spend" right={<Badge variant="secondary">All LI</Badge>} />
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeSeries} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickMargin={8} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="impressions" name="Impressions" stackId="a" />
                    <Bar dataKey="clicks" name="Clicks" stackId="a" />
                    <Bar dataKey="spend" name="Spend" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <SectionTitle title="Traffic by Source" right={<Badge variant="secondary">GA4</Badge>} />
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={trafficBySource} dataKey="sessions" nameKey="source" innerRadius={50} outerRadius={90}>
                      {trafficBySource.map((_, idx) => (
                        <Cell key={idx} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detail Tabs (same as v1, truncated for brevity or reuse) */}
        <Tabs defaultValue="accounts" className="mt-4">
          <TabsList>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="campaigns">Paid Campaigns</TabsTrigger>
            <TabsTrigger value="notes">Client Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="accounts">
            <Card>
              <CardHeader className="pb-2">
                <SectionTitle title="Account breakdown" right={<Badge variant="secondary">LinkedIn</Badge>} />
              </CardHeader>
              <CardContent>
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-muted-foreground">
                      <tr>
                        <th className="py-2 pr-4">Account</th>
                        <th className="py-2 pr-4">Type</th>
                        <th className="py-2 pr-4">Reach (Org)</th>
                        <th className="py-2 pr-4">Reach (Paid)</th>
                        <th className="py-2 pr-4">Impr.</th>
                        <th className="py-2 pr-4">Clicks</th>
                        <th className="py-2 pr-4">Engagements</th>
                        <th className="py-2 pr-4">Spend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts
                        .filter((a) => selectedAccounts.includes(a.id))
                        .map((a) => {
                          const series = liDataByAccount[a.id] || [];
                          const sum = series.reduce((acc, d) => { acc.org += d.organicReach; acc.paid += d.paidReach; acc.impr += d.impressions; acc.clicks += d.clicks; acc.eng += d.engagements; acc.spend += d.spend; return acc; }, { org: 0, paid: 0, impr: 0, clicks: 0, eng: 0, spend: 0 });
                          return (
                            <tr key={a.id} className="border-t">
                              <td className="py-2 pr-4 font-medium">{a.name}</td>
                              <td className="py-2 pr-4"><Badge variant={a.type === "business" ? "default" : "secondary"}>{a.type}</Badge></td>
                              <td className="py-2 pr-4">{fmt.num(sum.org)}</td>
                              <td className="py-2 pr-4">{fmt.num(sum.paid)}</td>
                              <td className="py-2 pr-4">{fmt.num(sum.impr)}</td>
                              <td className="py-2 pr-4">{fmt.num(sum.clicks)}</td>
                              <td className="py-2 pr-4">{fmt.num(sum.eng)}</td>
                              <td className="py-2 pr-4">{new Intl.NumberFormat(undefined, { style: "currency", currency }).format(sum.spend)}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="campaigns">
            <Card>
              <CardHeader className="pb-2">
                <SectionTitle title="Paid campaigns (demo)" right={<Badge variant="secondary">Ads</Badge>} />
              </CardHeader>
              <CardContent>
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-muted-foreground">
                      <tr>
                        <th className="py-2 pr-4">Campaign</th>
                        <th className="py-2 pr-4">Impr.</th>
                        <th className="py-2 pr-4">Clicks</th>
                        <th className="py-2 pr-4">Spend</th>
                        <th className="py-2 pr-4">CPC</th>
                        <th className="py-2 pr-4">CPM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {["Brand Awareness", "Lead Gen Form", "Retargeting Website"].map((name, i) => {
                        const impr = 5000 + i * 3000;
                        const clicks = 200 + i * 120;
                        const spend = 400 + i * 220;
                        return (
                          <tr key={name} className="border-t">
                            <td className="py-2 pr-4 font-medium">{name}</td>
                            <td className="py-2 pr-4">{impr.toLocaleString()}</td>
                            <td className="py-2 pr-4">{clicks.toLocaleString()}</td>
                            <td className="py-2 pr-4">{new Intl.NumberFormat(undefined, { style: "currency", currency }).format(spend)}</td>
                            <td className="py-2 pr-4">{new Intl.NumberFormat(undefined, { style: "currency", currency }).format(spend / clicks)}</td>
                            <td className="py-2 pr-4">{new Intl.NumberFormat(undefined, { style: "currency", currency }).format((spend / impr) * 1000)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes">
            <Card>
              <CardHeader className="pb-2">
                <SectionTitle title="Client-ready talking points" right={<Badge variant="secondary">Notes</Badge>} />
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  <div>
                    <Label>Highlights</Label>
                    <Input placeholder="e.g. Organic reach up 18% vs prev; Retargeting CPC at €2.10" />
                  </div>
                  <div>
                    <Label>Risks / Watchouts</Label>
                    <Input placeholder="e.g. Paid frequency rising > 3.0 in DACH" />
                  </div>
                  <div>
                    <Label>Next actions</Label>
                    <Input placeholder="e.g. Launch creator collab; Increase Lead Gen budget 20%" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
