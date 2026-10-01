import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { formatDateTime } from "@/features/studio-kit";
import { useAuthStore } from "@/features/auth";
import { ApiError } from "@/lib/api-client";
import { PanelCard } from "@/components/common/panel-card";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SettingRow } from "./setting-row";
import {
  changePassword as changePasswordApi,
  deleteAccount,
  fetchSessions,
  fetchSettings,
  revokeSession,
  saveTwoFactor,
  type ApiSession,
} from "../services/settings-service";

export function SecurityTab() {
  const signOut = useAuthStore((s) => s.signOut);
  const [twoFactor, setTwoFactor] = useState(false);
  const [sessions, setSessions] = useState<ApiSession[]>([]);
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.allSettled([fetchSettings(), fetchSessions()]).then(([settings, sessionList]) => {
      if (cancelled) return;
      if (settings.status === "fulfilled") setTwoFactor(settings.value.two_factor_enabled);
      if (sessionList.status === "fulfilled") setSessions(sessionList.value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setPassword = (key: keyof typeof passwords) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setPasswords((p) => ({ ...p, [key]: e.target.value }));

  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSaved(false);

    if (passwords.new.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (passwords.new !== passwords.confirm) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      await changePasswordApi(passwords.current, passwords.new);
      setPasswords({ current: "", new: "", confirm: "" });
      setPasswordSaved(true);
      window.setTimeout(() => setPasswordSaved(false), 2500);
    } catch (error) {
      setPasswordError(error instanceof ApiError ? error.message : "Could not update the password.");
    } finally {
      setSavingPassword(false);
    }
  }

  function toggleTwoFactor(value: boolean) {
    setTwoFactor(value);
    void saveTwoFactor(value).catch(() => setTwoFactor(!value));
  }

  function signOutSession(id: number) {
    const previous = sessions;
    setSessions((list) => list.filter((s) => s.id !== id));
    void revokeSession(id).catch(() => setSessions(previous));
  }

  async function confirmDeleteAccount() {
    try {
      await deleteAccount();
    } finally {
      void signOut();
    }
  }

  const fields = [
    { id: "current", label: "Current password", value: passwords.current, onChange: setPassword("current") },
    { id: "new", label: "New password", value: passwords.new, onChange: setPassword("new") },
    { id: "confirm", label: "Confirm new password", value: passwords.confirm, onChange: setPassword("confirm") },
  ];

  return (
    <div className="space-y-4">
      <PanelCard label="Change password">
        <form onSubmit={changePassword} className="grid max-w-md gap-3.5">
          {fields.map((field) => (
            <div key={field.id} className="space-y-1.5">
              <Label htmlFor={`pw-${field.id}`}>{field.label}</Label>
              <Input
                id={`pw-${field.id}`}
                type="password"
                required
                className="rounded-[3px]"
                value={field.value}
                onChange={field.onChange}
              />
            </div>
          ))}
          {passwordError && <p className="text-xs leading-relaxed text-destructive">{passwordError}</p>}
          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" size="sm" disabled={savingPassword} className="w-fit gap-1.5">
              {savingPassword && <Loader2 className="size-3.5 animate-spin" />}
              Update password
            </Button>
            {passwordSaved && (
              <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-teal">
                <Check className="size-3.5" strokeWidth={2} />
                Updated
              </span>
            )}
          </div>
        </form>
      </PanelCard>

      <PanelCard label="Two-factor authentication">
        <SettingRow
          title="Authenticator app"
          description="Require a one-time code at sign-in."
        >
          <div className="flex items-center gap-3">
            {twoFactor && <Badge className="border-transparent bg-teal text-white">Enabled</Badge>}
            <Switch checked={twoFactor} onCheckedChange={toggleTwoFactor} aria-label="Two-factor authentication" />
          </div>
        </SettingRow>
      </PanelCard>

      <PanelCard label="Active sessions" contentClassName="p-0">
        {sessions.length === 0 && (
          <p className="px-5 py-4 font-mono text-[11px] uppercase tracking-[0.04em] text-muted-foreground">
            No active sessions found.
          </p>
        )}
        {sessions.map((session, i) => (
          <div
            key={session.id}
            className={`flex items-center gap-3 px-5 py-3.5 ${i !== sessions.length - 1 ? "border-b" : ""}`}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {session.device}
                {session.current && (
                  <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.06em] text-teal">
                    This device
                  </span>
                )}
              </p>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.04em] text-muted-foreground">
                {session.location ?? session.ip_address ?? "Unknown location"} · last active{" "}
                {formatDateTime(session.last_active.replace(" ", "T"))}
              </p>
            </div>
            {!session.current && (
              <Button variant="outline" size="sm" onClick={() => signOutSession(session.id)}>
                Sign out
              </Button>
            )}
          </div>
        ))}
      </PanelCard>

      <PanelCard label="Danger zone">
        <SettingRow title="Delete account" description="Permanently removes your workspace, files, and history.">
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            Delete account
          </Button>
        </SettingRow>
      </PanelCard>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => void confirmDeleteAccount()}
        title="Delete account"
        message="This permanently deletes your account, generations, files, and billing history. There is no undo."
        confirmLabel="Delete forever"
        destructive
      />
    </div>
  );
}
