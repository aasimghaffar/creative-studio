import { useEffect, useState } from "react";
import { Check, Loader2, Pencil } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChipGroup, Field, Stepper } from "@/features/studio-kit";
import {
  fetchAdminProviders,
  fetchAdminTools,
  saveAdminProvider,
  testAdminProvider,
  toggleAdminTool,
  updateAdminTool,
  type AdminToolConfig,
  type ApiProviderState,
  type ProviderPatch,
} from "../services/admin-ai-service";
import { PageHeader } from "@/components/common/page-header";
import { PanelCard } from "@/components/common/panel-card";
import { Modal } from "@/components/common/modal";
import { AdminTable, StatusPill, type AdminColumn } from "../components";

/* ---------------- AI Tools (per-tool configuration) ---------------- */

function ToolSettingsModal({
  tool,
  onClose,
  onSave,
}: {
  tool: AdminToolConfig | null;
  onClose: () => void;
  onSave: (tool: AdminToolConfig) => Promise<void>;
}) {
  const [draft, setDraft] = useState<AdminToolConfig | null>(tool);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (tool && (!draft || draft.id !== tool.id)) {
    setDraft(tool);
    setError(null);
  }
  const patch = (p: Partial<AdminToolConfig>) => setDraft((d) => (d ? { ...d, ...p } : d));

  /** Spec bounds: credits 0–100, prompt 100–5000, timeout 10–300. */
  function validate(d: AdminToolConfig): string | null {
    if (d.creditsPerGeneration < 0 || d.creditsPerGeneration > 100) return "Credits must be between 0 and 100.";
    if (d.promptLimit < 100 || d.promptLimit > 5000) return "Prompt limit must be between 100 and 5000 characters.";
    if (d.timeoutSec < 10 || d.timeoutSec > 300) return "Timeout must be between 10 and 300 seconds.";
    if (d.uploadSupport && d.allowedTypes.length === 0) return "Pick at least one allowed file type.";
    return null;
  }

  function submit() {
    if (!draft) return;
    const problem = validate(draft);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    onSave(draft)
      .then(onClose)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not save. Please try again."))
      .finally(() => setSaving(false));
  }

  return (
    <Modal open={tool !== null} onClose={onClose} title={tool ? `${tool.name} — settings` : ""} className="max-w-lg">
      {draft && (
        <div className="max-h-[70svh] overflow-y-auto p-5">
          <Field label="Enable / Disable">
            <div className="flex items-center gap-3">
              <Switch checked={draft.enabled} onCheckedChange={(v) => patch({ enabled: v })} aria-label="Tool enabled" />
              <span className="text-sm text-muted-foreground">{draft.enabled ? "Tool is live for users" : "Hidden from users"}</span>
            </div>
          </Field>
          <Field label="Credits per generation">
            <Stepper value={draft.creditsPerGeneration} onChange={(v) => patch({ creditsPerGeneration: v })} min={0} max={100} />
          </Field>
          <Field label="Prompt limit (characters)">
            <Input
              type="number"
              value={draft.promptLimit}
              onChange={(e) => patch({ promptLimit: Number(e.target.value) })}
              className="w-32 rounded-[3px] font-mono text-xs"
            />
          </Field>
          <Field label="Upload support">
            <div className="flex items-center gap-3">
              <Switch checked={draft.uploadSupport} onCheckedChange={(v) => patch({ uploadSupport: v })} aria-label="Upload support" />
              <span className="text-sm text-muted-foreground">Allow reference-image uploads</span>
            </div>
          </Field>
          {draft.uploadSupport && (
            <>
              <Field label="Maximum upload size">
                <ChipGroup
                  options={["10 MB", "20 MB", "50 MB"]}
                  value={`${draft.maxUploadMb} MB`}
                  onChange={(v) => patch({ maxUploadMb: Number(v.replace(" MB", "")) })}
                />
              </Field>
              <Field label="Allowed file types">
                <ChipGroup
                  options={["JPG", "PNG", "WEBP", "PDF"]}
                  value={draft.allowedTypes[0] ?? "JPG"}
                  onChange={(v) =>
                    patch({
                      allowedTypes: draft.allowedTypes.includes(v)
                        ? draft.allowedTypes.filter((t) => t !== v)
                        : [...draft.allowedTypes, v],
                    })
                  }
                />
                <p className="mt-1.5 truncate whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.04em] text-muted-foreground">
                  Active: {draft.allowedTypes.join(", ") || "none"}
                </p>
              </Field>
            </>
          )}
          <Field label="Timeout (seconds)">
            <Input
              type="number"
              value={draft.timeoutSec}
              onChange={(e) => patch({ timeoutSec: Number(e.target.value) })}
              className="w-32 rounded-[3px] font-mono text-xs"
            />
          </Field>
          {error && <p className="mb-2 text-xs leading-relaxed text-destructive">{error}</p>}
          <div className="mt-2 flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button size="sm" onClick={submit} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              {saving ? "Saving…" : "Save settings"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function AiToolsPage() {
  const [tools, setTools] = useState<AdminToolConfig[]>([]);
  const [editing, setEditing] = useState<AdminToolConfig | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAdminTools()
      .then((data) => {
        if (!cancelled) setTools(data);
      })
      .catch((e) => {
        if (!cancelled)
          setPageError(e instanceof ApiError ? `Could not load tools: ${e.message}` : "Could not load tools. Is the backend running?");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2500);
  }

  /** Modal save: PUT, then swap the fresh row into the table immediately. */
  async function save(next: AdminToolConfig) {
    const fresh = await updateAdminTool(next);
    setTools((list) => list.map((t) => (t.id === fresh.id ? fresh : t)));
    flash(`${fresh.name} settings saved.`);
  }

  /** Table switch: optimistic, rolled back if the API rejects it. */
  function toggle(id: string) {
    const tool = tools.find((t) => t.id === id);
    if (!tool) return;
    const enabled = !tool.enabled;
    setTools((list) => list.map((t) => (t.id === id ? { ...t, enabled } : t)));
    toggleAdminTool(tool.dbId, enabled)
      .then((fresh) => {
        setTools((list) => list.map((t) => (t.id === fresh.id ? fresh : t)));
        flash(`${fresh.name} ${enabled ? "enabled" : "disabled"}.`);
      })
      .catch(() => {
        setTools((list) => list.map((t) => (t.id === id ? { ...t, enabled: !enabled } : t)));
        flash(`Could not update ${tool.name}.`);
      });
  }

  const columns: AdminColumn<AdminToolConfig>[] = [
    { key: "name", header: "Tool", render: (t) => <span className="font-medium">{t.name}</span> },
    { key: "credits", header: "Credits/gen", className: "text-right", render: (t) => <span className="block text-right font-mono text-xs tabular-nums">{t.creditsPerGeneration}</span> },
    { key: "prompt", header: "Prompt limit", className: "text-right hidden md:table-cell", render: (t) => <span className="hidden text-right font-mono text-xs tabular-nums md:block">{t.promptLimit || "—"}</span> },
    { key: "upload", header: "Uploads", render: (t) => (t.uploadSupport ? <StatusPill tone="teal">{t.maxUploadMb} MB</StatusPill> : <StatusPill tone="muted">off</StatusPill>) },
    { key: "model", header: "Provider", render: () => <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">Auto · by priority</span> },
    { key: "timeout", header: "Timeout", className: "text-right hidden lg:table-cell", render: (t) => <span className="hidden text-right font-mono text-xs tabular-nums lg:block">{t.timeoutSec}s</span> },
    { key: "enabled", header: "Enabled", className: "w-14", render: (t) => <Switch checked={t.enabled} onCheckedChange={() => toggle(t.id)} aria-label={`Toggle ${t.name}`} /> },
    { key: "edit", header: "", className: "w-10", render: (t) => (
      <button type="button" onClick={() => setEditing(t)} className="grid size-7 place-items-center rounded-[3px] border text-muted-foreground hover:bg-accent hover:text-foreground" aria-label={`Edit ${t.name}`}>
        <Pencil className="size-3.5" strokeWidth={1.6} />
      </button>
    ) },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="AI management"
        title="AI Tools"
        description={pageError ?? "Per-tool configuration: pricing, prompts, uploads, model, and timeout."}
      />
      {notice && (
        <p className="mb-3 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-teal">
          <Check className="size-3.5" strokeWidth={2} />
          {notice}
        </p>
      )}
      <AdminTable label={`Tools (${tools.length})`} columns={columns} rows={tools} />
      <ToolSettingsModal tool={editing} onClose={() => setEditing(null)} onSave={save} />
    </div>
  );
}

/* ---------------- AI Providers ---------------- */

export function AiProvidersPage() {
  const [providers, setProviders] = useState<ApiProviderState[]>([]);
  const [keyDrafts, setKeyDrafts] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [testing, setTesting] = useState<number | null>(null);
  const [message, setMessage] = useState<{ id: number; text: string; ok: boolean } | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAdminProviders()
      .then((data) => {
        if (!cancelled) setProviders(data);
      })
      .catch((e) => {
        if (!cancelled)
          setPageError(e instanceof ApiError ? `Could not load providers: ${e.message}` : "Could not load providers. Is the backend running?");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function flash(id: number, text: string, ok: boolean) {
    setMessage({ id, text, ok });
    window.setTimeout(() => setMessage((m) => (m?.id === id ? null : m)), 3500);
  }

  /** Save key/enabled/priority/model/timeout for one provider. */
  function save(provider: ApiProviderState, patch: ProviderPatch, note = "Saved.") {
    setBusy(provider.id);
    saveAdminProvider(provider.id, patch)
      .then((fresh) => {
        setProviders(fresh);
        if (patch.api_key !== undefined) {
          setKeyDrafts((d) => ({ ...d, [provider.id]: "" }));
          // Trust, but verify: the refreshed row must confirm the key.
          const freshRow = fresh.find((p) => p.id === provider.id);
          if ((patch.api_key ?? "").trim() !== "" && !freshRow?.has_key) {
            flash(provider.id, "The key did NOT persist — paste and save again.", false);
            return;
          }
          flash(provider.id, `API key saved (${freshRow?.masked_key ?? "hidden"}).`, true);
          return;
        }
        flash(provider.id, note, true);
      })
      .catch((e) => flash(provider.id, e instanceof ApiError ? e.message : "Could not save.", false))
      .finally(() => setBusy(null));
  }

  /** Live connectivity test — status comes from the real provider. */
  function testConnection(provider: ApiProviderState) {
    setTesting(provider.id);
    testAdminProvider(provider.id)
      .then((result) => {
        setProviders((list) => list.map((p) => (p.id === result.provider.id ? result.provider : p)));
        flash(provider.id, result.message, result.ok);
      })
      .catch((e) => flash(provider.id, e instanceof ApiError ? e.message : "Test failed.", false))
      .finally(() => setTesting(null));
  }

  const STATUS_BADGE: Record<ApiProviderState["status"], React.ReactNode> = {
    connected: <Badge className="border-transparent bg-teal text-white">Connected</Badge>,
    failed: <Badge variant="destructive">Failed</Badge>,
    untested: <Badge variant="secondary">Untested</Badge>,
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="AI management"
        title="AI Provider Settings"
        description={pageError ?? "Priority 1 generates first; if it fails, the backend falls back automatically. Users never see which provider ran."}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {providers.map((provider) => (
          <PanelCard
            key={provider.id}
            label={`${provider.name} — Priority ${provider.priority}`}
            action={STATUS_BADGE[provider.status]}
          >
            <div className="space-y-3.5">
              {provider.slug === "flux" && (
                <p className="-mt-1 font-mono text-[10px] uppercase tracking-[0.04em] text-muted-foreground">
                  Served via Together AI — paste your Together API key. Model
                  defaults to FLUX.1-schnell.
                </p>
              )}
              {provider.slug === "pollinations" && (
                <p className="-mt-1 font-mono text-[10px] uppercase leading-relaxed tracking-[0.04em] text-muted-foreground">
                  Pollinations now requires a registered token for API use —
                  create one FREE at auth.pollinations.ai and paste it below.
                  Model is optional (defaults to flux).
                </p>
              )}
              <Field label={provider.slug === "pollinations" ? "API Token" : "API Key"}>
                <Input
                  type="password"
                  value={keyDrafts[provider.id] ?? ""}
                  onChange={(e) => setKeyDrafts((d) => ({ ...d, [provider.id]: e.target.value }))}
                  placeholder={provider.has_key ? `Saved: ${provider.masked_key}` : "Paste API key…"}
                  className="rounded-[3px] font-mono text-xs"
                  aria-label={`${provider.name} API Key`}
                  autoComplete="new-password"
                  name={`ai-${provider.slug}-key`}
                />
                {(keyDrafts[provider.id] ?? "") !== "" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    disabled={busy === provider.id}
                    onClick={() => save(provider, { api_key: keyDrafts[provider.id] }, "API key saved.")}
                  >
                    Save key
                  </Button>
                )}
              </Field>
              <Field label="Enabled">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={provider.enabled}
                    onCheckedChange={(v) => save(provider, { enabled: v }, v ? "Provider enabled." : "Provider disabled.")}
                    aria-label={`${provider.name} enabled`}
                  />
                  <span className="text-sm text-muted-foreground">
                    {provider.enabled ? "Used by the generation engine" : "Skipped by the generation engine"}
                  </span>
                </div>
              </Field>
              <Field label="Priority">
                <ChipGroup
                  options={["Priority 1", "Priority 2", "Priority 3"]}
                  value={`Priority ${provider.priority}`}
                  onChange={(v) => {
                    const next = Number(v.replace("Priority ", "")) as 1 | 2 | 3;
                    if (next !== provider.priority) {
                      save(provider, { priority: next }, next === 1 ? "Now the primary provider." : "Saved.");
                    }
                  }}
                />
                <p className="mt-1.5 truncate whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.04em] text-muted-foreground">
                  {provider.priority === 1 ? "Generates first" : "Automatic fallback"}
                </p>
              </Field>
              <Field label="Model">
                <Input
                  type="text"
                  defaultValue={provider.model}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== provider.model) save(provider, { model: v }, "Model saved.");
                  }}
                  className="rounded-[3px] font-mono text-xs"
                  aria-label={`${provider.name} model`}
                />
              </Field>
              <div className="flex items-center gap-3 border-t pt-3.5">
                <Button
                  size="sm"
                  disabled={testing === provider.id || busy === provider.id}
                  onClick={() => testConnection(provider)}
                  className="gap-1.5"
                >
                  {testing === provider.id && <Loader2 className="size-3.5 animate-spin" />}
                  {testing === provider.id ? "Testing…" : "Test Connection"}
                </Button>
                {message?.id === provider.id && (
                  <span className={`flex items-center gap-1.5 font-mono text-[11px] tracking-[0.02em] ${message.ok ? "text-teal" : "text-destructive"}`}>
                    {message.ok && <Check className="size-3.5" strokeWidth={2} />}
                    {message.text}
                  </span>
                )}
              </div>
              {provider.last_tested_at && (
                <p className="whitespace-normal break-words font-mono text-[10px] uppercase leading-relaxed tracking-[0.04em] text-muted-foreground">
                  Last tested: {provider.last_tested_at}
                  {provider.status === "failed" && provider.last_error ? ` — ${provider.last_error}` : ""}
                </p>
              )}
            </div>
          </PanelCard>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Categories & Templates (unchanged behaviour) ---------------- */
