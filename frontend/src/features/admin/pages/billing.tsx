import { useEffect, useState } from "react";
import { Check, Download, Loader2 } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChipGroup, Field, formatDateTime, Stepper, TogglePair } from "@/features/studio-kit";
import {
  adjustUserCredits,
  fetchCreditSettings,
  saveCreditSettings,
  type CreditSettings,
} from "../services/admin-credits-service";
import { fetchAdminUsers } from "../services/admin-users-service";
import { fetchAdminTools, updateAdminTool, type AdminToolConfig } from "../services/admin-ai-service";
import { PageHeader } from "@/components/common/page-header";
import { PanelCard } from "@/components/common/panel-card";
import { SearchField } from "@/components/common/search-field";
import { Modal } from "@/components/common/modal";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { AdminTable, StatusPill } from "../components";
import {
  createAdminPlan,
  deleteAdminPlan,
  downloadAdminInvoice,
  fetchAdminPayments,
  exportPaymentsCsv,
  fetchAdminPlans,
  toDraft,
  toggleAdminPlan,
  updateAdminPlan,
  type ApiAdminPayment,
  type ApiAdminPlan,
  type PlanDraft,
} from "../services/admin-billing-service";
import { SettingRow } from "@/features/settings";

const PLAN_BADGES = ["None", "Popular", "Recommended", "Best Value", "New"];
const PLAN_TOOLS = ["logo", "avatar", "tattoo", "image", "flyer", "image-description"];

function PlanEditorModal({
  open,
  plan,
  onClose,
  onSaved,
}: {
  open: boolean;
  plan: ApiAdminPlan | null;
  onClose: () => void;
  onSaved: (fresh: ApiAdminPlan, created: boolean) => void;
}) {
  const [draft, setDraft] = useState<PlanDraft>(toDraft(plan));
  const [loadedFor, setLoadedFor] = useState<number | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = plan?.id ?? "new";
  if (open && loadedFor !== key) {
    setDraft(toDraft(plan));
    setLoadedFor(key);
    setError(null);
  }
  if (!open && loadedFor !== null) setLoadedFor(null);

  const patch = (p: Partial<PlanDraft>) => setDraft((d) => ({ ...d, ...p }));

  function submit() {
    if (!draft.name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    (plan ? updateAdminPlan(plan.id, draft) : createAdminPlan(draft))
      .then((fresh) => {
        onSaved(fresh, plan === null);
        onClose();
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not save the plan."))
      .finally(() => setSaving(false));
  }

  return (
    <Modal open={open} onClose={onClose} title={plan ? `${plan.name} — edit plan` : "New plan"} className="max-w-lg">
      <div className="max-h-[70svh] overflow-y-auto p-5">
        <Field label="Name">
          <Input value={draft.name} onChange={(e) => patch({ name: e.target.value })} className="rounded-[3px]" aria-label="Plan name" />
        </Field>
        <Field label="Tagline">
          <Input value={draft.tagline} onChange={(e) => patch({ tagline: e.target.value })} className="rounded-[3px]" aria-label="Tagline" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Monthly price ($)">
            <Input type="number" value={draft.monthly_price} onChange={(e) => patch({ monthly_price: e.target.value })} placeholder="Empty = custom" className="rounded-[3px] font-mono text-xs" aria-label="Monthly price" />
          </Field>
          <Field label="Yearly price ($ total per year)">
            <Input type="number" value={draft.yearly_price} onChange={(e) => patch({ yearly_price: e.target.value })} placeholder="Empty = custom" className="rounded-[3px] font-mono text-xs" aria-label="Yearly price" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Credits / cycle">
            <Input type="number" value={draft.credits_per_cycle} onChange={(e) => patch({ credits_per_cycle: e.target.value })} placeholder="Empty = unlimited" className="rounded-[3px] font-mono text-xs" aria-label="Credits per cycle" />
          </Field>
          <Field label="Storage (GB)">
            <Input type="number" value={draft.storage_gb} onChange={(e) => patch({ storage_gb: e.target.value })} placeholder="Empty = unlimited" className="rounded-[3px] font-mono text-xs" aria-label="Storage limit" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Max generations">
            <Input type="number" value={draft.max_generations} onChange={(e) => patch({ max_generations: e.target.value })} placeholder="Empty = unlimited" className="rounded-[3px] font-mono text-xs" aria-label="Max generations" />
          </Field>
          <Field label="Seats">
            <Stepper value={draft.seats} onChange={(v) => patch({ seats: v })} min={1} max={999} />
          </Field>
        </div>
        <Field label="Display order">
          <Stepper value={draft.sort_order} onChange={(v) => patch({ sort_order: v })} min={0} max={99} />
        </Field>
        <Field label="Badge">
          <ChipGroup options={PLAN_BADGES} value={draft.badge === "" ? "None" : draft.badge} onChange={(v) => patch({ badge: v === "None" ? "" : v })} />
        </Field>
        <Field label="Available AI tools">
          <ChipGroup
            options={PLAN_TOOLS}
            value={draft.allowed_tools[0] ?? ""}
            onChange={(v) =>
              patch({
                allowed_tools: draft.allowed_tools.includes(v)
                  ? draft.allowed_tools.filter((t) => t !== v)
                  : [...draft.allowed_tools, v],
              })
            }
          />
          <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.04em] text-muted-foreground">
            Active: {draft.allowed_tools.join(", ") || "all tools"}
          </p>
        </Field>
        <Field label="Feature list (one per line)">
          <textarea
            value={draft.features}
            onChange={(e) => patch({ features: e.target.value })}
            className="min-h-24 w-full resize-y rounded-[3px] border bg-background px-3 py-2.5 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Feature list"
          />
        </Field>
        <Field label="Active">
          <div className="flex items-center gap-3">
            <Switch checked={draft.is_active} onCheckedChange={(v) => patch({ is_active: v })} aria-label="Plan active" />
            <span className="text-sm text-muted-foreground">{draft.is_active ? "Purchasable by customers" : "Hidden from the pricing page"}</span>
          </div>
        </Field>
        {error && <p className="mb-2 text-xs leading-relaxed text-destructive">{error}</p>}
        <div className="mt-2 flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            {saving ? "Saving…" : plan ? "Save plan" : "Create plan"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function AdminPlansPage() {
  const [plans, setPlans] = useState<ApiAdminPlan[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ApiAdminPlan | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ApiAdminPlan | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAdminPlans()
      .then((data) => {
        if (!cancelled) setPlans(data);
      })
      .catch((e) => {
        if (!cancelled)
          setPageError(e instanceof ApiError ? `Could not load plans: ${e.message}` : "Could not load plans. Is the backend running?");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function flash(text: string) {
    setNotice(text);
    window.setTimeout(() => setNotice(null), 2500);
  }

  function onSaved(fresh: ApiAdminPlan, created: boolean) {
    setPlans((list) =>
      created ? [...list, fresh].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
              : list.map((pl) => (pl.id === fresh.id ? fresh : pl)),
    );
    flash(created ? `${fresh.name} created.` : `${fresh.name} saved.`);
  }

  function toggle(plan: ApiAdminPlan, active: boolean) {
    setPlans((list) => list.map((pl) => (pl.id === plan.id ? { ...pl, is_active: active } : pl)));
    toggleAdminPlan(plan.id, active)
      .then((fresh) => {
        setPlans((list) => list.map((pl) => (pl.id === fresh.id ? fresh : pl)));
        flash(`${fresh.name} ${active ? "enabled" : "disabled"}.`);
      })
      .catch(() => {
        setPlans((list) => list.map((pl) => (pl.id === plan.id ? { ...pl, is_active: !active } : pl)));
        flash(`Could not update ${plan.name}.`);
      });
  }

  function confirmDelete() {
    const plan = pendingDelete;
    if (!plan) return;
    deleteAdminPlan(plan.id)
      .then(() => {
        setPlans((list) => list.filter((pl) => pl.id !== plan.id));
        flash(`${plan.name} deleted.`);
      })
      .catch((e) => flash(e instanceof ApiError ? e.message : `Could not delete ${plan.name}.`));
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Billing"
        title="Subscription Plans"
        description={pageError ?? "The tiers customers can buy — changes go live on the pricing page immediately."}
        action={
          <Button size="sm" onClick={() => { setEditing(null); setEditorOpen(true); }}>
            New plan
          </Button>
        }
      />
      {notice && (
        <p className="mb-3 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-teal">
          <Check className="size-3.5" strokeWidth={2} />
          {notice}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <PanelCard
            key={plan.id}
            label={plan.name}
            action={plan.badge ? <Badge variant="secondary">{plan.badge}</Badge> : undefined}
          >
            <p className="font-display text-2xl font-medium">
              {plan.monthly_price === null ? "Custom" : `$${Number(plan.monthly_price)}`}
              {plan.monthly_price !== null && Number(plan.monthly_price) > 0 && <span className="text-xs font-normal text-muted-foreground"> / mo</span>}
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.06em] text-brass-deep dark:text-brass">
              {plan.credits_per_cycle === null ? "Unlimited credits" : `${plan.credits_per_cycle.toLocaleString()} credits / cycle`}
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{plan.tagline}</p>
            <ul className="mt-3 space-y-1 text-[12.5px] text-muted-foreground">
              {plan.features.map((f) => (
                <li key={f}>· {f}</li>
              ))}
            </ul>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.04em] text-muted-foreground">
              {plan.subscriptions.toLocaleString()} subscription{plan.subscriptions === 1 ? "" : "s"}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => { setEditing(plan); setEditorOpen(true); }}>
                Edit plan
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive"
                onClick={() => setPendingDelete(plan)}
              >
                Delete
              </Button>
              <div className="ml-auto">
                <Switch checked={plan.is_active} onCheckedChange={(v) => toggle(plan, v)} aria-label={`Toggle ${plan.name}`} />
              </div>
            </div>
          </PanelCard>
        ))}
      </div>

      <PlanEditorModal open={editorOpen} plan={editing} onClose={() => setEditorOpen(false)} onSaved={onSaved} />

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Delete plan"
        message={`Delete "${pendingDelete?.name ?? ""}"? Plans with existing subscriptions are protected and can only be disabled.`}
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}

const PAYMENT_TONE: Record<ApiAdminPayment["status"], "teal" | "brass" | "destructive" | "muted"> = {
  paid: "teal",
  pending: "brass",
  failed: "destructive",
  refunded: "muted",
};

const GATEWAY_FILTERS = ["All gateways", "Stripe", "PayPal", "Manual"];

export function AdminPaymentsPage() {
  const [payments, setPayments] = useState<ApiAdminPayment[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [gateway, setGateway] = useState("All gateways");
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  // Server-driven list; search debounced, filters immediate, page 1 reset.
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(
      () => {
        fetchAdminPayments({
          search: search || undefined,
          status: status === "All" ? undefined : status.toLowerCase(),
          gateway: gateway === "All gateways" ? undefined : gateway.toLowerCase(),
          page: 1,
        })
          .then((data) => {
            if (cancelled) return;
            setPayments(data.payments);
            setTotal(data.total);
            setHasMore(data.hasMore);
            setPage(1);
            setPageError(null);
          })
          .catch((e) => {
            if (!cancelled)
              setPageError(e instanceof ApiError ? `Could not load payments: ${e.message}` : "Could not load payments. Is the backend running?");
          });
      },
      search ? 300 : 0,
    );

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search, status, gateway]);

  function loadMore() {
    setLoadingMore(true);
    fetchAdminPayments({
      search: search || undefined,
      status: status === "All" ? undefined : status.toLowerCase(),
      gateway: gateway === "All gateways" ? undefined : gateway.toLowerCase(),
      page: page + 1,
    })
      .then((data) => {
        setPayments((list) => [...list, ...data.payments]);
        setHasMore(data.hasMore);
        setPage((n) => n + 1);
      })
      .catch(() => undefined)
      .finally(() => setLoadingMore(false));
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Billing"
        title="Payments"
        description={pageError ?? "Every charge across the platform, newest first. Records are created by billing flows — read-only here."}
      />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <SearchField value={search} onChange={setSearch} placeholder="Search customer or invoice…" className="w-full" />
        <ChipGroup options={["All", "Paid", "Pending", "Failed", "Refunded"]} value={status} onChange={setStatus} />
        <ChipGroup options={GATEWAY_FILTERS} value={gateway} onChange={setGateway} />
        <Button size="sm" variant="outline" className="ml-auto gap-1.5" onClick={() => exportPaymentsCsv(payments)} disabled={payments.length === 0}>
          <Download className="size-3.5" /> Export CSV
        </Button>
      </div>
      <AdminTable
        label={`Payments (${total.toLocaleString()})`}
        columns={[
          { key: "date", header: "Date", render: (p) => <span className="font-mono text-[10px] uppercase text-muted-foreground">{formatDateTime(p.date.replace(" ", "T"))}</span> },
          { key: "cust", header: "Customer", render: (p) => (
            <div className="min-w-0">
              <p className="truncate font-medium">{p.customer}</p>
              {p.customer_email && <p className="truncate text-xs text-muted-foreground">{p.customer_email}</p>}
            </div>
          ) },
          { key: "plan", header: "Plan", render: (p) => <span className="text-muted-foreground">{p.plan ?? p.description}</span> },
          { key: "amt", header: "Amount", className: "text-right", render: (p) => <span className="block text-right font-mono tabular-nums">${p.amount.toFixed(2)} <span className="text-[10px] uppercase text-muted-foreground">{p.currency}</span></span> },
          { key: "gw", header: "Gateway", className: "hidden md:table-cell", render: (p) => (
            <div className="hidden md:block">
              <p className="font-mono text-[10px] uppercase text-muted-foreground">{p.gateway}</p>
              {p.transaction && <p className="max-w-36 truncate font-mono text-[9px] text-muted-foreground/70" title={p.transaction}>{p.transaction}</p>}
            </div>
          ) },
          { key: "status", header: "Status", render: (p) => <StatusPill tone={PAYMENT_TONE[p.status]}>{p.status}</StatusPill> },
          { key: "inv", header: "", className: "w-10", render: (p) => (
            <button
              type="button"
              onClick={() => void downloadAdminInvoice(p.id, p.invoice_no)}
              className="grid size-7 place-items-center rounded-[3px] border text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label={`Invoice ${p.invoice_no}`}
              title={p.invoice_no}
            >
              <Download className="size-3.5" strokeWidth={1.6} />
            </button>
          ) },
        ]}
        rows={payments}
      />
      {hasMore && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" size="sm" disabled={loadingMore} onClick={loadMore} className="gap-1.5">
            {loadingMore && <Loader2 className="size-3.5 animate-spin" />}
            {loadingMore ? "Loading…" : `Load more (${payments.length} of ${total})`}
          </Button>
        </div>
      )}
    </div>
  );
}

export function AdminCreditsPage() {
  const [config, setConfig] = useState<CreditSettings>({
    default_free_credits: 0,
    daily_credit_limit: 0,
    monthly_credit_reset: false,
    credit_expiry_days: 0,
  });
  const [rulesSaving, setRulesSaving] = useState(false);
  const [users, setUsers] = useState<{ id: string; email: string }[]>([]);
  const [tools, setTools] = useState<AdminToolConfig[]>([]);
  const [adjustUser, setAdjustUser] = useState("");
  const [adjustAmount, setAdjustAmount] = useState("100");
  const [adjustMode, setAdjustMode] = useState("Add");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustBusy, setAdjustBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchCreditSettings(),
      fetchAdminUsers({}),
      fetchAdminTools(),
    ])
      .then(([settings, userData, toolData]) => {
        if (cancelled) return;
        setConfig(settings);
        const list = userData.users.map((u) => ({ id: u.id, email: u.email }));
        setUsers(list);
        setAdjustUser((current) => current || (list[0]?.email ?? ""));
        setTools(toolData);
      })
      .catch((e) => {
        if (!cancelled)
          setPageError(e instanceof ApiError ? `Could not load credit settings: ${e.message}` : "Could not load credit settings. Is the backend running?");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function flash(text: string, ok = true) {
    setNotice({ text, ok });
    window.setTimeout(() => setNotice(null), 3000);
  }

  function saveRules() {
    setRulesSaving(true);
    saveCreditSettings(config)
      .then((fresh) => {
        setConfig(fresh);
        flash("Credit rules saved.");
      })
      .catch((e) => flash(e instanceof ApiError ? e.message : "Could not save credit rules.", false))
      .finally(() => setRulesSaving(false));
  }

  /** Real adjustment through the ledger endpoint (admin recorded). */
  function applyAdjustment() {
    const target = users.find((u) => u.email === adjustUser);
    const amount = Math.abs(Number(adjustAmount));
    if (!target || !amount) return;
    const signed = adjustMode === "Add" ? amount : -amount;

    setAdjustBusy(true);
    adjustUserCredits(target.id, signed, adjustReason.trim() || "Adjusted from Credits Management")
      .then(({ balance }) => {
        flash(`${adjustMode === "Add" ? "+" : "−"}${amount} credits — ${target.email}. New balance: ${balance.toLocaleString()}.`);
        setAdjustReason("");
      })
      .catch((e) => flash(e instanceof ApiError ? e.message : "Adjustment failed.", false))
      .finally(() => setAdjustBusy(false));
  }

  /** Per-tool credits: writes to the SAME ai_tools rows the engine reads. */
  function setToolCredits(tool: AdminToolConfig, credits: number) {
    setTools((list) => list.map((t) => (t.id === tool.id ? { ...t, creditsPerGeneration: credits } : t)));
    updateAdminTool({ ...tool, creditsPerGeneration: credits })
      .then((fresh) => setTools((list) => list.map((t) => (t.id === fresh.id ? fresh : t))))
      .catch(() => {
        setTools((list) => list.map((t) => (t.id === tool.id ? { ...t, creditsPerGeneration: tool.creditsPerGeneration } : t)));
        flash(`Could not update ${tool.name}.`, false);
      });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Billing"
        title="Credits Management"
        description={pageError ?? "How credits are earned, spent, and expire across the platform."}
      />
      {notice && (
        <p className={`mb-3 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.06em] ${notice.ok ? "text-teal" : "text-destructive"}`}>
          {notice.ok && <Check className="size-3.5" strokeWidth={2} />}
          {notice.text}
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <PanelCard label="Credit rules">
          <SettingRow title="Default free credits" description="Granted to every new account.">
            <Input type="number" value={config.default_free_credits} onChange={(e) => setConfig((c) => ({ ...c, default_free_credits: Number(e.target.value) }))} className="w-24 rounded-[3px] text-right font-mono text-xs" aria-label="Default free credits" />
          </SettingRow>
          <SettingRow title="Daily credit limit" description="Maximum spend per user per day. 0 = no limit.">
            <Input type="number" value={config.daily_credit_limit} onChange={(e) => setConfig((c) => ({ ...c, daily_credit_limit: Number(e.target.value) }))} className="w-24 rounded-[3px] text-right font-mono text-xs" aria-label="Daily credit limit" />
          </SettingRow>
          <SettingRow title="Monthly credit reset" description="Reset balances on the billing date.">
            <Switch checked={config.monthly_credit_reset} onCheckedChange={(v) => setConfig((c) => ({ ...c, monthly_credit_reset: v }))} aria-label="Monthly reset" />
          </SettingRow>
          <SettingRow title="Credit expiry" description="Unused credits expire after this many days. 0 = never.">
            <div className="flex items-center gap-2">
              <Input type="number" value={config.credit_expiry_days} onChange={(e) => setConfig((c) => ({ ...c, credit_expiry_days: Number(e.target.value) }))} className="w-20 rounded-[3px] text-right font-mono text-xs" aria-label="Credit expiry days" />
              <span className="font-mono text-[10px] uppercase text-muted-foreground">days</span>
            </div>
          </SettingRow>
          <div className="mt-4 border-t pt-4">
            <Button size="sm" onClick={saveRules} disabled={rulesSaving} className="gap-1.5">
              {rulesSaving && <Loader2 className="size-3.5 animate-spin" />}
              {rulesSaving ? "Saving…" : "Save rules"}
            </Button>
          </div>
        </PanelCard>

        <PanelCard label="Manual adjustment">
          <div className="space-y-4">
            <Field label="User">
              <NativeSelect value={adjustUser} onChange={setAdjustUser} options={users.map((u) => u.email)} aria-label="User" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Amount">
                <Input type="number" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} className="rounded-[3px] font-mono text-xs" aria-label="Amount" />
              </Field>
              <Field label="Action">
                <TogglePair options={["Add", "Deduct"]} value={adjustMode} onChange={setAdjustMode} />
              </Field>
            </div>
            <Field label="Reason">
              <Input value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="Recorded in the credit ledger…" className="rounded-[3px]" aria-label="Reason" />
            </Field>
            <Button size="sm" onClick={applyAdjustment} disabled={adjustBusy || !adjustUser || !Number(adjustAmount)} className="gap-1.5">
              {adjustBusy && <Loader2 className="size-3.5 animate-spin" />}
              {adjustBusy ? "Applying…" : "Apply adjustment"}
            </Button>
          </div>
        </PanelCard>
      </div>

      <div className="mt-4">
        <PanelCard label="Credits per AI tool">
          <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {tools.map((tool) => (
              <div key={tool.id} className="flex items-center justify-between gap-4">
                <span className="text-sm">{tool.name}</span>
                <Stepper value={tool.creditsPerGeneration} min={0} max={100} onChange={(v) => setToolCredits(tool, v)} />
              </div>
            ))}
          </div>
          <p className="mt-4 border-t pt-3 font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
            Writes to the same AI Tools configuration the generation engine reads — one source of truth.
          </p>
        </PanelCard>
      </div>
    </div>
  );
}
