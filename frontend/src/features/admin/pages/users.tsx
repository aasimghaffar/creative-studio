import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { formatGb } from "@/lib/format-bytes";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { ChipGroup, formatDateTime } from "@/features/studio-kit";
import type { AdminUser } from "@/mocks/admin";
import { ApiError } from "@/lib/api-client";

import { PageHeader } from "@/components/common/page-header";
import { PanelCard } from "@/components/common/panel-card";
import { SearchField } from "@/components/common/search-field";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Modal } from "@/components/common/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill, UserTable } from "../components";
import {
  fetchAdminUser,
  fetchAdminUsers,
  grantUserCredits,
  sendUserPasswordReset,
  setUserSuspended,
  type AdminUserDetail,
} from "../services/admin-users-service";

const STATUS_FILTERS = ["All", "Active", "Trial", "Suspended"];
const PLAN_FILTERS = ["All plans", "Sketch", "Studio", "Agency"];

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== null) setQuery(q);
  }, [searchParams]);
  const [status, setStatus] = useState("All");
  const [plan, setPlan] = useState("All plans");
  const [listError, setListError] = useState<string | null>(null);

  // Server-side filters; search debounced to avoid a request per keystroke.
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(
      () => {
        fetchAdminUsers({
          search: query || undefined,
          status: status === "All" ? undefined : status.toLowerCase(),
          plan: plan === "All plans" ? undefined : plan.toLowerCase(),
        })
          .then((data) => {
            if (cancelled) return;
            setUsers(data.users);
            setTotal(data.total);
            setListError(null);
          })
          .catch((e) => {
            if (cancelled) return;
            setListError(
              e instanceof ApiError && e.status === 403
                ? "Your account is not an admin. Run: composer make-admin -- your@email.com"
                : e instanceof ApiError
                  ? `Could not load users (${e.status}): ${e.message}`
                  : "Could not load users. Is the backend running?",
            );
          });
      },
      query ? 300 : 0,
    );

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, status, plan]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="User management"
        title="Users"
        description={listError ?? `${total.toLocaleString()} accounts on the platform.`}
      />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <SearchField value={query} onChange={setQuery} placeholder="Search name or email…" className="w-full" />
        <ChipGroup options={STATUS_FILTERS} value={status} onChange={setStatus} />
        <ChipGroup options={PLAN_FILTERS} value={plan} onChange={setPlan} />
      </div>
      <UserTable users={users} label={`Users (${users.length})`} />
    </div>
  );
}

const USER_STATUS_TONE = { active: "teal", trial: "brass", suspended: "destructive" } as const;

export function AdminUserDetailsPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [creditsAmount, setCreditsAmount] = useState("100");

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    fetchAdminUser(userId)
      .then((data) => {
        if (!cancelled) setUser(data);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 3000);
  }

  function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    action()
      .catch((e) => setError(e instanceof ApiError ? e.message : "Action failed. Please try again."))
      .finally(() => setBusy(false));
  }

  const confirmSuspend = () =>
    run(async () => {
      if (!user) return;
      const fresh = await setUserSuspended(user.id, user.status !== "suspended");
      setUser(fresh);
      flash(fresh.status === "suspended" ? "Account suspended." : "Account reactivated.");
    });

  const confirmCredits = () =>
    run(async () => {
      if (!user) return;
      const amount = Number(creditsAmount);
      const { balance } = await grantUserCredits(user.id, amount, "Granted from admin panel");
      setUser({ ...user, creditsBalance: balance });
      setCreditsOpen(false);
      flash(`Credits updated — new balance ${balance.toLocaleString()}.`);
    });

  const resetPassword = () =>
    run(async () => {
      if (!user) return;
      await sendUserPasswordReset(user.id);
      flash("Password reset email sent.");
    });

  if (loaded && !user) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader eyebrow="User management" title="User not found" description="This account doesn't exist." />
        <Button variant="outline" size="sm" onClick={() => navigate("/admin/users")} className="gap-1.5">
          <ArrowLeft className="size-3.5" />
          Back to users
        </Button>
      </div>
    );
  }

  if (!user) return null;

  const facts: [string, React.ReactNode][] = [
    ["Email", user.email],
    ["Plan", user.plan],
    ["Status", <StatusPill key="s" tone={USER_STATUS_TONE[user.status]}>{user.status}</StatusPill>],
    ["Country", user.country],
    ["Credits balance", user.creditsBalance.toLocaleString()],
    ["Joined", formatDateTime(user.joinedAt)],
    ["Last active", formatDateTime(user.lastActive)],
  ];

  const usage: [string, string][] = [
    ["Generations", user.generations.toLocaleString()],
    ["Credits used", user.creditsUsed.toLocaleString()],
    ["Storage", formatGb(user.storageGb)],
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="User management"
        title={user.name}
        description={user.email}
        action={
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/users")} className="gap-1.5">
            <ArrowLeft className="size-3.5" />
            All users
          </Button>
        }
      />
      {(error || notice) && (
        <p className={`mb-4 text-xs leading-relaxed ${error ? "text-destructive" : "text-teal"}`}>
          {error ?? (
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3.5" strokeWidth={2} />
              {notice}
            </span>
          )}
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <PanelCard label="Account">
          <dl className="space-y-3">
            {facts.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-4 text-sm">
                <dt className="eyebrow text-[9px] text-muted-foreground">{k}</dt>
                <dd className="text-right">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 flex gap-2 border-t pt-4">
            <Button variant="outline" size="sm" disabled={busy} onClick={resetPassword}>
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Reset password
            </Button>
            <Button variant="outline" size="sm" disabled={busy} onClick={() => setCreditsOpen(true)}>
              Grant credits
            </Button>
            <Button variant="destructive" size="sm" disabled={busy} onClick={() => setSuspendOpen(true)}>
              {user.status === "suspended" ? "Unsuspend" : "Suspend"}
            </Button>
          </div>
        </PanelCard>
        <PanelCard label="Usage">
          <div className="grid grid-cols-3 gap-4">
            {usage.map(([k, v]) => (
              <div key={k}>
                <p className="font-display text-xl font-medium tabular-nums">{v}</p>
                <p className="eyebrow mt-0.5 text-[9px] text-muted-foreground">{k}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 border-t pt-4 text-[13px] leading-relaxed text-muted-foreground">
            {user.topTool ? (
              <>
                Most-used studio: <span className="text-foreground">{user.topTool}</span>. Average batch
                size {user.avgBatchSize} drafts. No policy flags on this account.
              </>
            ) : (
              "No completed generations yet — usage insights appear after the first render."
            )}
          </p>
        </PanelCard>
      </div>

      <Modal open={creditsOpen} onClose={() => setCreditsOpen(false)} title="Grant credits">
        <div className="p-5">
          <p className="mb-3 text-[13px] leading-relaxed text-muted-foreground">
            Positive numbers add credits, negative numbers remove them. The adjustment is recorded in
            the ledger with your admin account.
          </p>
          <Input
            type="number"
            value={creditsAmount}
            onChange={(e) => setCreditsAmount(e.target.value)}
            className="rounded-[3px]"
            aria-label="Credit amount"
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setCreditsOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={busy || Number(creditsAmount) === 0} onClick={confirmCredits}>
              Apply
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={suspendOpen}
        onClose={() => setSuspendOpen(false)}
        onConfirm={confirmSuspend}
        title={user.status === "suspended" ? "Reactivate account" : "Suspend account"}
        message={
          user.status === "suspended"
            ? `Reactivate ${user.name}'s account? They will be able to sign in again immediately.`
            : `Suspend ${user.name}'s account? All their sessions are revoked and sign-in is blocked until reactivated.`
        }
        confirmLabel={user.status === "suspended" ? "Reactivate" : "Suspend"}
        destructive={user.status !== "suspended"}
      />
    </div>
  );
}
