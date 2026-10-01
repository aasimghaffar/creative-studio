import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Check, CreditCard, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { PanelCard } from "@/components/common/panel-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api-client";
import { invalidateCreditsSummary } from "@/lib/use-credits-summary";
import {
  confirmCheckout,
  fetchCheckoutContext,
  startCheckout,
  upgradePlan,
  type CheckoutContext,
} from "./services/billing-service";

const GATEWAY_LABELS: Record<string, string> = {
  stripe: "Cards via Stripe",
  paypal: "PayPal",
};

/**
 * Professional checkout: plan summary, price breakdown (tax-ready),
 * enabled gateways only, and the return leg (?payment&gw&outcome=…)
 * that confirms with the backend — which verifies with the gateway.
 */
export function CheckoutPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const planSlug = params.get("plan") ?? "";
  const cycle = params.get("cycle") ?? "monthly";
  const returningPayment = params.get("payment");

  const [context, setContext] = useState<CheckoutContext | null>(null);
  const [gateway, setGateway] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(returningPayment !== null);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null);

  // ---- Return leg: verify with the backend (which verifies with the gateway).
  useEffect(() => {
    if (!returningPayment) return;
    const payload: Record<string, string> = { payment_id: returningPayment };
    params.forEach((value, key) => {
      payload[key] = value;
    });
    confirmCheckout(payload)
      .then((res) => {
        setConfirmStatus(res.status);
        setConfirmMessage(res.message);
        if (res.status === "paid") {
          invalidateCreditsSummary();
          window.setTimeout(() => navigate("/app/billing", { replace: true }), 2200);
        }
      })
      .catch((e) => {
        setConfirmStatus("failed");
        setConfirmMessage(e instanceof ApiError ? e.message : "Could not verify the payment. Contact support if you were charged.");
      })
      .finally(() => setConfirming(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returningPayment]);

  // ---- Start leg: load the context for the picked plan.
  useEffect(() => {
    if (returningPayment || planSlug === "") return;
    fetchCheckoutContext(planSlug, cycle)
      .then((ctx) => {
        setContext(ctx);
        setGateway(ctx.gateways[0]?.slug ?? "");
      })
      .catch((e) => {
        // FREE plans never charge: the backend answers 409 for them, and
        // we switch directly — the paid path is untouched.
        if (e instanceof ApiError && e.status === 409) {
          upgradePlan(planSlug, cycle as "monthly" | "yearly")
            .then(() => {
              invalidateCreditsSummary();
              navigate("/app/billing", { replace: true });
            })
            .catch((err) =>
              setError(err instanceof ApiError ? err.message : "Could not switch the plan. Please try again from Billing."),
            );
          return;
        }
        setError(e instanceof ApiError ? e.message : "Could not load the checkout. Is the backend running?");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planSlug, cycle, returningPayment]);

  const money = useMemo(
    () => (v: number) => `${v.toFixed(2)} ${context?.currency ?? ""}`,
    [context?.currency],
  );

  async function pay() {
    if (!gateway || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await startCheckout(planSlug, cycle, gateway);
      window.location.href = res.redirect_url; // hosted gateway checkout
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not start the checkout. Please try again.");
      setBusy(false);
    }
  }

  /* ---------- Return-leg screen ---------- */
  if (returningPayment) {
    return (
      <div className="mx-auto max-w-lg">
        <PageHeader eyebrow="Billing" title="Payment result" description="Verifying your payment with the provider…" />
        <PanelCard label="Status">
          {confirming ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Confirming with the payment provider…
            </p>
          ) : (
            <>
              <p className={cn("flex items-center gap-2 text-sm", confirmStatus === "paid" ? "text-teal" : confirmStatus === "pending" ? "text-brass" : "text-destructive")}>
                {confirmStatus === "paid" && <Check className="size-4" />}
                {confirmMessage}
              </p>
              <div className="mt-4 flex gap-2">
                <Button size="sm" onClick={() => navigate("/app/billing")}>Back to Billing</Button>
                {confirmStatus !== "paid" && (
                  <Button size="sm" variant="outline" onClick={() => navigate("/app/billing")}>Try again from Billing</Button>
                )}
              </div>
            </>
          )}
        </PanelCard>
      </div>
    );
  }

  /* ---------- Start-leg screen ---------- */
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader eyebrow="Billing" title="Checkout" description={error ?? "Review your order and pay securely on the provider's page."} />
      {context && (
        <PanelCard label="Order summary">
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span>Plan</span>
              <span className="font-medium">{context.plan.name}</span>
            </div>
            <div className="flex justify-between">
              <span>Billing cycle</span>
              <span className="font-mono text-xs uppercase">{context.cycle}</span>
            </div>
            {context.plan.credits_per_cycle !== null && (
              <div className="flex justify-between">
                <span>Credits per cycle</span>
                <span className="font-mono tabular-nums">{context.plan.credits_per_cycle === 0 ? "Unlimited" : context.plan.credits_per_cycle.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2.5">
              <span>Price</span>
              <span className="text-right font-mono tabular-nums">
                {context.cycle === "yearly" ? `${money(context.price)}/year` : `${money(context.price)}/mo`}
                <span className="block text-[10px] font-normal text-muted-foreground">
                  {context.cycle === "yearly" ? `equivalent to ${money(context.price / 12)}/mo` : "billed monthly"}
                </span>
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Tax</span>
              <span className="font-mono tabular-nums">{money(context.tax)}</span>
            </div>
            <div className="flex justify-between border-t pt-2.5 font-medium">
              <span>Total</span>
              <span className="font-mono tabular-nums">{money(context.total)}</span>
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Payment method</p>
            {context.gateways.length === 0 && (
              <p className="text-sm text-destructive">No payment gateways are enabled. Please contact support.</p>
            )}
            <div className="space-y-2">
              {context.gateways.map((g) => (
                <button
                  key={g.slug}
                  type="button"
                  onClick={() => setGateway(g.slug)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[3px] border px-3 py-2.5 text-left text-sm transition-colors",
                    gateway === g.slug ? "border-brass bg-brass/10" : "hover:bg-accent",
                  )}
                  aria-pressed={gateway === g.slug}
                >
                  <CreditCard className="size-4 text-muted-foreground" />
                  <span className="flex-1">{GATEWAY_LABELS[g.slug] ?? g.name}</span>
                  {g.environment === "sandbox" && (
                    <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-brass">Sandbox</span>
                  )}
                  {gateway === g.slug && <Check className="size-4 text-brass" />}
                </button>
              ))}
            </div>
          </div>

          <Button className="mt-5 w-full gap-1.5" onClick={pay} disabled={busy || !gateway}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            {busy ? "Redirecting…" : `Pay ${money(context.total)}`}
          </Button>
          <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
            You will complete payment securely on the provider's page.
          </p>
        </PanelCard>
      )}
    </div>
  );
}
