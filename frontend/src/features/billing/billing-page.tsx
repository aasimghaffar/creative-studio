import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { invalidateCreditsSummary } from "@/lib/use-credits-summary";
import { ArrowUpRight, Check, Download, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime, TogglePair } from "@/features/studio-kit";
import { ApiError, apiRequest, downloadFile } from "@/lib/api-client";
import { PageHeader } from "@/components/common/page-header";
import { PanelCard } from "@/components/common/panel-card";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fetchCredits,
  fetchCurrentPlan,
  fetchCreditUsage,
  fetchPayments,
  fetchPlans,
  upgradePlan,
  type ApiCredits,
  type ApiCreditUsage,
  type ApiCurrentPlan,
  type ApiPayment,
  type ApiPlan,
  invoiceUrlPath,
} from "./services/billing-service";

function toIso(value: string | null): string {
  return (value ?? new Date().toISOString()).replace(" ", "T");
}

function downloadInvoice(record: ApiPayment) {
  // Real server-rendered invoice (HTML, printable to PDF).
  void downloadFile(invoiceUrlPath(record.id), `${record.invoice_no}.html`);
}

const PAYMENT_STATUS_CLASS: Record<ApiPayment["status"], string> = {
  paid: "text-teal",
  pending: "text-brass",
  failed: "text-destructive",
  refunded: "text-muted-foreground",
};

export function BillingPage() {
  const navigate = useNavigate();
  const [yearly, setYearly] = useState(true);
  const [plans, setPlans] = useState<ApiPlan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<ApiCurrentPlan | null>(null);
  const [credits, setCredits] = useState<ApiCredits | null>(null);
  const [payments, setPayments] = useState<ApiPayment[]>([]);
  const [usage, setUsage] = useState<ApiCreditUsage[]>([]);
  const [upgradeTarget, setUpgradeTarget] = useState<ApiPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [changeNote, setChangeNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void Promise.allSettled([
      fetchPlans(),
      fetchCurrentPlan(),
      fetchCredits(),
      fetchPayments(),
      fetchCreditUsage(),
    ]).then(([planList, current, creditData, paymentList, usageList]) => {
      if (cancelled) return;
      if (planList.status === "fulfilled") setPlans(planList.value);
      if (current.status === "fulfilled") setCurrentPlan(current.value);
      if (creditData.status === "fulfilled") setCredits(creditData.value);
      if (paymentList.status === "fulfilled") setPayments(paymentList.value);
      if (usageList.status === "fulfilled") setUsage(usageList.value);
      if (current.status === "rejected") setError("Could not load billing data. Is the backend running?");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function confirmUpgrade() {
    if (!upgradeTarget) return;
    setError(null);

    // Custom-priced plans (Agency): "Request contact" files a real support
    // ticket — admins get a bell notification and see it in the Support
    // Inbox with the requester's account details.
    if (upgradeTarget.monthly_price === null) {
      try {
        await apiRequest("/v1/support/tickets", {
          method: "POST",
          body: JSON.stringify({
            topic: "billing",
            priority: "high",
            subject: `Contact request: ${upgradeTarget.name} plan`,
            message: `Please contact me about the ${upgradeTarget.name} plan (custom pricing). Requested from Billing & Plans.`,
          }),
        });
        setUpgradeTarget(null);
        setChangeNote("Request sent — our team will reach out to your account email.");
      } catch (e: unknown) {
        setError(e instanceof ApiError ? e.message : "Could not send the request. Please try again.");
      }
      return;
    }

    try {
      // PAID plans go through real checkout; only free plans switch here.
      const cycle = yearly ? "yearly" : "monthly";
      const price = yearly ? upgradeTarget.yearly_price : upgradeTarget.monthly_price;
      if ((price ?? 0) > 0) {
        navigate(`/app/checkout?plan=${encodeURIComponent(upgradeTarget.slug)}&cycle=${cycle}`);
        setUpgradeTarget(null);
        return;
      }
      const result = await upgradePlan(upgradeTarget.slug, cycle);
      setCurrentPlan(result.current_plan);
      setCredits(result.credits);
      invalidateCreditsSummary();
      // Invoice + cycle usage change with the plan — refresh both.
      void fetchPayments().then(setPayments).catch(() => undefined);
      void fetchCreditUsage().then(setUsage).catch(() => undefined);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not change the plan.");
    }
  }

  const balance = credits?.balance ?? 0;
  const allowance = credits?.credits_per_cycle ?? null;
  const usedThisCycle = credits?.used_this_cycle ?? 0;
  const usedPct = allowance ? Math.min((usedThisCycle / allowance) * 100, 100) : 0;
  const resetsOn = credits?.resets_on ? formatDateTime(toIso(credits.resets_on)) : "next cycle";
  const maxUsage = Math.max(...usage.map((u) => u.credits), 1);
  const currentSlug = currentPlan?.plan_slug ?? "sketch";

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Account"
        title="Billing & Plans"
        description="Your plan, credits, invoices, and where the cycle's usage actually went."
      />

      {error && <p className="mb-4 text-xs leading-relaxed text-destructive">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Current plan */}
        <PanelCard
          label="Current plan"
          action={
            <Badge className="border-transparent bg-teal text-white">
              {currentPlan?.status === "trialing" ? "Trial" : "Active"}
            </Badge>
          }
        >
          <div className="flex h-full flex-col justify-between gap-4">
            <div>
              <p className="font-display text-2xl font-medium">
                {currentPlan?.plan_name ?? "—"}
                <span className="ml-2 font-mono text-xs font-normal uppercase tracking-[0.08em] text-muted-foreground">
                  {currentPlan?.billing_cycle ?? "monthly"}
                </span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {currentPlan?.price != null ? `$${currentPlan.price} / month` : "Free plan"}
                {currentPlan?.renews_on
                  ? ` · renews ${formatDateTime(toIso(currentPlan.renews_on))}`
                  : " · no renewal date"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-fit gap-1.5"
              onClick={() => document.getElementById("plans")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              Manage subscription
              <ArrowUpRight className="size-3.5" />
            </Button>
          </div>
        </PanelCard>

        {/* Credits remaining */}
        <PanelCard label="Credits remaining">
          {credits?.unlimited ? (
            <p className="font-display text-3xl font-medium tabular-nums">
              ∞<span className="ml-1.5 text-sm font-normal text-muted-foreground">unlimited generations — no deductions</span>
            </p>
          ) : (
          <>
          <p className="font-display text-3xl font-medium tabular-nums">
            {balance.toLocaleString()}
            <span className="ml-1.5 text-sm font-normal text-muted-foreground">
              {allowance ? `of ${allowance.toLocaleString()} / cycle` : "available"}
            </span>
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(usedPct)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-brass" style={{ width: `${usedPct}%` }} />
          </div>
          <div className="mt-2 flex justify-between font-mono text-[11px] text-muted-foreground">
            <span>{usedThisCycle.toLocaleString()} used this cycle</span>
            <span>resets {resetsOn}</span>
          </div>
          <Button
            size="sm"
            className="mt-4 gap-1.5"
            onClick={() => document.getElementById("plans")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          >
            <Zap className="size-3.5" />
            Buy more credits
          </Button>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">
            Credits come with your plan — upgrade below for a bigger cycle allowance.
          </p>
          </>
          )}
        </PanelCard>
      </div>

      {/* Available plans */}
      <div id="plans" className="scroll-mt-24" />
      {changeNote && (
        <p className="mb-4 rounded-[4px] border border-teal/40 bg-teal/10 px-4 py-3 text-sm text-teal">
          {changeNote}
        </p>
      )}
      <PanelCard
        label="Available plans"
        className="mt-4"
        action={<TogglePair options={["Monthly", "Yearly"]} value={yearly ? "Yearly" : "Monthly"} onChange={(v) => setYearly(v === "Yearly")} />}
      >
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => {
            const raw = yearly ? plan.yearly_price : plan.monthly_price;
            const price = yearly && raw !== null ? Number(raw) / 12 : raw === null ? null : Number(raw);
            const isCurrent = plan.slug === currentSlug;
            return (
              <article
                key={plan.slug}
                className={cn(
                  "flex flex-col rounded-[4px] border p-5",
                  plan.is_popular && !isCurrent && "border-brass/50",
                  isCurrent && "border-teal/60",
                )}
              >
                <div className="flex items-start justify-between">
                  <p className="font-display text-lg font-medium">{plan.name}</p>
                  {isCurrent && <Badge className="border-transparent bg-teal text-white">Current</Badge>}
                  {plan.is_popular && !isCurrent && <Badge variant="secondary">Popular</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{plan.tagline}</p>
                <p className="mt-4 font-display text-2xl font-medium">
                  {price === null ? "Custom" : `$${price}`}
                  {price !== null && price > 0 && (
                    <span className="text-xs font-normal text-muted-foreground"> /mo</span>
                  )}
                {yearly && raw !== null && Number(raw) > 0 && (
                  <span className="block font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">
                    ${Number(raw).toLocaleString()} charged per year
                  </span>
                )}
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.06em] text-brass-deep dark:text-brass">
                  {plan.credits_per_cycle !== null
                    ? `${plan.credits_per_cycle.toLocaleString()} credits / mo`
                    : "Unlimited credits"}
                </p>
                <ul className="mt-4 flex-1 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px]">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-brass" strokeWidth={1.8} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  variant={isCurrent ? "outline" : "default"}
                  className="mt-5"
                  disabled={isCurrent}
                  onClick={() => setUpgradeTarget(plan)}
                >
                  {isCurrent ? "Current plan" : plan.monthly_price === null ? "Talk to us" : "Upgrade plan"}
                </Button>
              </article>
            );
          })}
        </div>
      </PanelCard>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Payment history + invoices */}
        <PanelCard label="Payment history" contentClassName="p-0">
          <div>
            {payments.length === 0 && (
              <p className="px-5 py-4 font-mono text-[11px] uppercase tracking-[0.04em] text-muted-foreground">
                No payments yet.
              </p>
            )}
            {payments.map((record, i) => (
              <div
                key={record.id}
                className={cn("flex items-center gap-3 px-5 py-3", i !== payments.length - 1 && "border-b")}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{record.description}</p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.04em] text-muted-foreground">
                    {formatDateTime(toIso(record.date))} · {record.invoice_no} · {record.gateway}
                    {record.transaction ? ` · ${record.transaction.slice(0, 18)}` : ""} ·{" "}
                    <span className={PAYMENT_STATUS_CLASS[record.status]}>{record.status}</span>
                  </p>
                </div>
                <span className="font-mono text-sm tabular-nums">${record.amount.toFixed(2)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => downloadInvoice(record)}
                  aria-label={`Download invoice ${record.invoice_no}`}
                >
                  <Download className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </PanelCard>

        {/* Credit usage summary */}
        <PanelCard label="Credit usage summary" action={<span className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground">THIS CYCLE</span>}>
          {usage.length === 0 ? (
            <p className="font-mono text-[11px] uppercase tracking-[0.04em] text-muted-foreground">
              No credit usage yet.
            </p>
          ) : (
            <ul className="space-y-3.5">
              {usage.map((item) => (
                <li key={item.tool_slug}>
                  <div className="flex justify-between text-[13px]">
                    <span>{item.tool_name}</span>
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">{item.credits} cr</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={item.tool_slug === "tattoo" ? "h-full rounded-full bg-teal" : "h-full rounded-full bg-brass"}
                      style={{ width: `${(item.credits / maxUsage) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>
      </div>

      <ConfirmDialog
        open={upgradeTarget !== null}
        onClose={() => setUpgradeTarget(null)}
        onConfirm={() => void confirmUpgrade()}
        title="Change plan"
        message={
          upgradeTarget?.monthly_price === null
            ? "Agency is quoted per team — our sales desk will reach out."
            : `Switch to the ${upgradeTarget?.name ?? ""} plan (${yearly ? "yearly" : "monthly"} billing)? Credits for the new cycle are added immediately.`
        }
        confirmLabel={upgradeTarget?.monthly_price === null ? "Request contact" : "Confirm upgrade"}
      />
    </div>
  );
}
