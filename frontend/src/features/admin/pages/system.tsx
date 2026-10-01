import { useEffect, useState } from "react";
import { formatBytes } from "@/lib/format-bytes";
import { Check, Download, Eye, FileText, Loader2, Send, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChipGroup, EmptyState, Field, formatDateTime } from "@/features/studio-kit";
import { ApiError } from "@/lib/api-client";
import { invalidatePlatformConfig } from "@/config/use-platform-config";
import {
  fetchEmailSettings,
  fetchGeneralSettings,
  fetchNotificationSettings,
  fetchPaymentSettings,
  fetchSecurity,
  saveEmailTemplate,
  saveGeneralSettings,
  saveNotificationSettings,
  savePaymentGateway,
  testPaymentGateway,
  savePaymentSettings,
  saveSmtp,
  sendTestEmail,
  type ApiEmailTemplate,
  type ApiNotificationEvent,
  type ApiPaymentGateway,
  type ApiSecurityEvent,
  type GeneralSettings,
} from "../services/admin-settings-service";
import {
  deleteAdminFile,
  downloadAdminFileById,
  fetchAdminFiles,
  fetchStorageProviders,
  saveStorageProvider,
  saveStorageRules,
  testStorageProvider,
  type ApiAdminFile,
  type ApiStorageProvider,
  type StorageRules,
  type StorageStats,
} from "../services/admin-system-service";
import { PageHeader } from "@/components/common/page-header";
import { PanelCard } from "@/components/common/panel-card";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Modal } from "@/components/common/modal";
import { SearchField } from "@/components/common/search-field";
import { SettingRow } from "@/features/settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { AdminTable, StatusPill,  } from "../components";

/* ================= File Manager ================= */

const FILE_TOOL_FILTERS: [string, string][] = [
  ["All tools", ""], ["Logo", "logo"], ["Avatar", "avatar"], ["Tattoo", "tattoo"],
];
const FILE_TYPE_FILTERS: [string, string][] = [
  ["All types", ""], ["JPG", "jpg"], ["PNG", "png"], ["WEBP", "webp"], ["SVG", "svg"], ["PDF", "pdf"],
];

const GB = 1024 ** 3;

function UsageBars({ label, rows }: { label: string; rows: { label: string; bytes: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.bytes));
  return (
    <PanelCard label={label}>
      {rows.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">No files yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.label}>
              <div className="flex justify-between text-[13px]">
                <span className="truncate">{row.label}</span>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">{formatBytes(row.bytes)}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-brass" style={{ width: `${(row.bytes / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </PanelCard>
  );
}

export function AdminFileManagerPage() {
  const [files, setFiles] = useState<ApiAdminFile[]>([]);
  const [stats, setStats] = useState<StorageStats>({ total_bytes: 0, by_tool: [], by_user: [] });
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [tool, setTool] = useState("All tools");
  const [type, setType] = useState("All types");
  const [detail, setDetail] = useState<ApiAdminFile | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ApiAdminFile | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const toolParam = FILE_TOOL_FILTERS.find(([l]) => l === tool)?.[1] ?? "";
  const typeParam = FILE_TYPE_FILTERS.find(([l]) => l === type)?.[1] ?? "";

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(
      () => {
        fetchAdminFiles({ search: query || undefined, tool: toolParam || undefined, type: typeParam || undefined, page: 1 })
          .then((data) => {
            if (cancelled) return;
            setFiles(data.files);
            setStats(data.stats);
            setTotal(data.total);
            setHasMore(data.hasMore);
            setPage(1);
            setPageError(null);
          })
          .catch((e) => {
            if (!cancelled)
              setPageError(e instanceof ApiError ? `Could not load files: ${e.message}` : "Could not load files. Is the backend running?");
          });
      },
      query ? 300 : 0,
    );
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, toolParam, typeParam]);

  function flash(text: string) {
    setNotice(text);
    window.setTimeout(() => setNotice(null), 2500);
  }

  function loadMore() {
    setLoadingMore(true);
    fetchAdminFiles({ search: query || undefined, tool: toolParam || undefined, type: typeParam || undefined, page: page + 1 })
      .then((data) => {
        setFiles((list) => [...list, ...data.files]);
        setHasMore(data.hasMore);
        setPage((n) => n + 1);
      })
      .catch(() => undefined)
      .finally(() => setLoadingMore(false));
  }

  function confirmDelete() {
    const file = pendingDelete;
    if (!file) return;
    deleteAdminFile(file.id)
      .then(() => {
        setFiles((list) => list.filter((f) => f.id !== file.id));
        setTotal((t) => t - 1);
        setStats((st) => ({ ...st, total_bytes: Math.max(0, st.total_bytes - file.size_bytes) }));
        flash(`${file.name}.${file.ext} deleted from storage and database.`);
      })
      .catch((e) => flash(e instanceof ApiError ? e.message : "Could not delete the file."));
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="System"
        title="File Manager"
        description={pageError ?? "Every uploaded and generated file on the platform — one source of truth."}
      />
      {notice && (
        <p className="mb-3 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-teal">
          <Check className="size-3.5" strokeWidth={2} />
          {notice}
        </p>
      )}

      {/* Storage usage — live aggregates from the files table */}
      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <PanelCard label="Storage usage">
          <p className="font-display text-2xl font-medium tabular-nums">
            {formatBytes(stats.total_bytes)}
            <span className="ml-1.5 text-sm font-normal text-muted-foreground">across {total.toLocaleString()} files</span>
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-brass" style={{ width: `${Math.min(100, (stats.total_bytes / (100 * GB)) * 100)}%` }} />
          </div>
          <p className="mt-2 font-mono text-[11px] text-muted-foreground">Computed live from the files table</p>
        </PanelCard>
        <UsageBars label="Storage by AI tool" rows={stats.by_tool} />
        <UsageBars label="Storage by user (top 5)" rows={stats.by_user} />
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <SearchField value={query} onChange={setQuery} placeholder="Search file, user, tool…" className="w-full" />
        <ChipGroup options={FILE_TOOL_FILTERS.map(([l]) => l)} value={tool} onChange={setTool} />
        <ChipGroup options={FILE_TYPE_FILTERS.map(([l]) => l)} value={type} onChange={setType} />
      </div>

      {files.length === 0 ? (
        <EmptyState icon={FileText} hint="No files match these filters." />
      ) : (
        <AdminTable
          label={`Files (${total.toLocaleString()})`}
          columns={[
            { key: "file", header: "File", render: (f) => (
              <div className="flex items-center gap-3">
                <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-[3px] border border-bp-line bg-bp-panel-2" aria-hidden="true">
                  {f.type === "image" ? (
                    <img src={f.url} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
                  ) : (
                    <FileText className="size-4 text-paper-dark/90" strokeWidth={1.5} />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{f.name}<span className="text-muted-foreground">.{f.ext}</span></p>
                  <p className="font-mono text-[10px] uppercase text-muted-foreground">{formatBytes(f.size_bytes)} · {f.download_count} downloads</p>
                </div>
              </div>
            ) },
            { key: "by", header: "Uploaded by", render: (f) => (
              <div className="min-w-0">
                <p className="truncate text-muted-foreground">{f.user}</p>
                {f.user_email && <p className="truncate text-xs text-muted-foreground/70">{f.user_email}</p>}
              </div>
            ) },
            { key: "tool", header: "AI tool", render: (f) => <StatusPill tone="muted">{f.tool}</StatusPill> },
            { key: "date", header: "Created", render: (f) => <span className="font-mono text-[10px] uppercase text-muted-foreground">{formatDateTime(f.created_at.replace(" ", "T"))}</span> },
            { key: "actions", header: "", className: "w-28", render: (f) => (
              <div className="flex items-center justify-end gap-1.5">
                <button type="button" onClick={() => setDetail(f)} className="grid size-7 place-items-center rounded-[3px] border text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Preview"><Eye className="size-3.5" strokeWidth={1.6} /></button>
                <button type="button" onClick={() => void downloadAdminFileById(f.id)} className="grid size-7 place-items-center rounded-[3px] border text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Download"><Download className="size-3.5" strokeWidth={1.6} /></button>
                <button type="button" onClick={() => setPendingDelete(f)} className="grid size-7 place-items-center rounded-[3px] border text-muted-foreground hover:bg-accent hover:text-destructive" aria-label="Delete"><Trash2 className="size-3.5" strokeWidth={1.6} /></button>
              </div>
            ) },
          ]}
          rows={files}
        />
      )}

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" size="sm" disabled={loadingMore} onClick={loadMore} className="gap-1.5">
            {loadingMore && <Loader2 className="size-3.5 animate-spin" />}
            {loadingMore ? "Loading…" : `Load more (${files.length} of ${total})`}
          </Button>
        </div>
      )}

      {/* Preview */}
      <Modal open={detail !== null} onClose={() => setDetail(null)} title="File information" className="max-w-md">
        {detail && (
          <div className="p-5">
            <div className="relative grid aspect-video place-items-center overflow-hidden rounded-[3px] border border-bp-line bg-bp-panel-2">
              {detail.type === "image" ? (
                <img src={detail.url} alt={detail.name} className="absolute inset-0 size-full object-contain" />
              ) : (
                <FileText className="size-8 text-paper-dark/90" strokeWidth={1.4} />
              )}
            </div>
            <dl className="mt-4 space-y-2">
              {([
                ["File name", `${detail.name}.${detail.ext}`],
                ["File size", formatBytes(detail.size_bytes)],
                ["Format", detail.ext.toUpperCase()],
                ["AI tool used", detail.tool],
                ["User", `${detail.user}${detail.user_email ? ` <${detail.user_email}>` : ""}`],
                ["Created", formatDateTime(detail.created_at.replace(" ", "T"))],
                ["Last modified", formatDateTime(detail.updated_at.replace(" ", "T"))],
                ["Generation ID", detail.generation_id !== null ? `#${detail.generation_id}` : "—"],
                ["Download count", String(detail.download_count)],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 text-sm">
                  <dt className="eyebrow text-[9px] text-muted-foreground">{k}</dt>
                  <dd className="truncate font-mono text-xs">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Delete file"
        message={`Delete "${pendingDelete?.name ?? ""}.${pendingDelete?.ext ?? ""}"? The physical file and the database record are removed together — it disappears from the user's dashboard too.`}
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}

/* ================= Storage Provider Settings ================= */

const PROVIDER_FIELDS: Record<string, { key: string; label: string; secret?: boolean; textarea?: boolean }[]> = {
  local: [],
};

export function AdminStorageProviderPage() {
  const [providers, setProviders] = useState<ApiStorageProvider[]>([]);
  const [rules, setRules] = useState<StorageRules>({
    max_upload_size_mb: 50,
    allowed_file_types: ["JPG", "PNG", "WEBP"],
    max_storage_per_user_gb: 0,
    max_files_per_user: 0,
  });
  const [drafts, setDrafts] = useState<Record<number, Record<string, string>>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [testing, setTesting] = useState<number | null>(null);
  const [message, setMessage] = useState<{ id: number; text: string; ok: boolean } | null>(null);
  const [rulesSaving, setRulesSaving] = useState(false);
  const [rulesNotice, setRulesNotice] = useState<{ text: string; ok: boolean } | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchStorageProviders()
      .then((data) => {
        if (cancelled) return;
        setProviders(data.providers);
        setRules(data.rules);
      })
      .catch((e) => {
        if (!cancelled)
          setPageError(e instanceof ApiError ? `Could not load storage settings: ${e.message}` : "Could not load storage settings. Is the backend running?");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function flash(id: number, text: string, ok: boolean) {
    setMessage({ id, text, ok });
    window.setTimeout(() => setMessage((m) => (m?.id === id ? null : m)), 4000);
  }

  function save(provider: ApiStorageProvider, enable: boolean) {
    setBusy(provider.id);
    const credentials = drafts[provider.id] ?? {};
    saveStorageProvider(provider.id, {
      credentials: Object.keys(credentials).length > 0 ? credentials : undefined,
      enable,
    })
      .then((fresh) => {
        setProviders(fresh);
        setDrafts((d) => ({ ...d, [provider.id]: {} }));
        flash(provider.id, enable ? "Provider enabled — new uploads go here." : "Credentials saved.", true);
      })
      .catch((e) => flash(provider.id, e instanceof ApiError ? e.message : "Could not save.", false))
      .finally(() => setBusy(null));
  }

  function testConnection(provider: ApiStorageProvider) {
    setTesting(provider.id);
    testStorageProvider(provider.id)
      .then((result) => {
        setProviders((list) => list.map((p) => (p.id === result.provider.id ? result.provider : p)));
        flash(provider.id, result.message, result.ok);
      })
      .catch((e) => flash(provider.id, e instanceof ApiError ? e.message : "Test failed.", false))
      .finally(() => setTesting(null));
  }

  function saveRules() {
    setRulesSaving(true);
    saveStorageRules(rules)
      .then((fresh) => {
        setRules(fresh);
        setRulesNotice({ text: "Upload rules saved.", ok: true });
      })
      .catch((e) => setRulesNotice({ text: e instanceof ApiError ? e.message : "Could not save the rules.", ok: false }))
      .finally(() => {
        setRulesSaving(false);
        window.setTimeout(() => setRulesNotice(null), 3500);
      });
  }

  const STATUS_BADGE: Record<ApiStorageProvider["status"], React.ReactNode> = {
    connected: <Badge className="border-transparent bg-teal text-white">Connected</Badge>,
    failed: <Badge variant="destructive">Failed</Badge>,
    untested: <Badge variant="secondary">Untested</Badge>,
  };

  const toggleType = (t: string) =>
    setRules((r) => ({
      ...r,
      allowed_file_types: r.allowed_file_types.includes(t)
        ? r.allowed_file_types.filter((x) => x !== t)
        : [...r.allowed_file_types, t],
    }));

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="System"
        title="Storage Provider"
        description={pageError ?? "Where files are physically stored. One provider is active; switching affects only future uploads."}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {providers.map((provider) => (
          <PanelCard
            key={provider.id}
            label={provider.name}
            className={cn(provider.enabled && "border-brass/60")}
            action={provider.enabled ? <Badge className="border-transparent bg-teal text-white">Active</Badge> : STATUS_BADGE[provider.status]}
          >
            {provider.slug === "local" ? (
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Files live on this server under public/storage. No credentials needed.
              </p>
            ) : (
              <div className="space-y-3">
                {(PROVIDER_FIELDS[provider.slug] ?? []).map((field) =>
                  field.textarea ? (
                    <Field key={field.key} label={field.label}>
                      <textarea
                        value={drafts[provider.id]?.[field.key] ?? ""}
                        onChange={(e) => setDrafts((d) => ({ ...d, [provider.id]: { ...d[provider.id], [field.key]: e.target.value } }))}
                        placeholder={provider.fields_set[field.key] ? "•••••• saved — paste to replace" : "Paste JSON…"}
                        className="min-h-20 w-full resize-y rounded-[3px] border bg-background px-3 py-2 font-mono text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`${provider.name} ${field.label}`}
                      />
                    </Field>
                  ) : (
                    <Field key={field.key} label={field.label}>
                      <Input
                        type={field.secret ? "password" : "text"}
                        value={drafts[provider.id]?.[field.key] ?? ""}
                        onChange={(e) => setDrafts((d) => ({ ...d, [provider.id]: { ...d[provider.id], [field.key]: e.target.value } }))}
                        placeholder={provider.fields_set[field.key] ? "•••••• saved — type to replace" : undefined}
                        className="rounded-[3px] font-mono text-xs"
                        aria-label={`${provider.name} ${field.label}`}
                      />
                    </Field>
                  ),
                )}
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {provider.slug !== "local" && (
                <Button size="sm" variant="outline" disabled={busy === provider.id} onClick={() => save(provider, false)}>
                  Save
                </Button>
              )}
              <Button size="sm" variant="outline" disabled={testing === provider.id} onClick={() => testConnection(provider)} className="gap-1.5">
                {testing === provider.id && <Loader2 className="size-3.5 animate-spin" />}
                {testing === provider.id ? "Testing…" : "Test"}
              </Button>
              <Button size="sm" variant={provider.enabled ? "outline" : "default"} disabled={provider.enabled || busy === provider.id} onClick={() => save(provider, true)}>
                {provider.enabled ? "In use" : "Enable"}
              </Button>
            </div>
            {message?.id === provider.id && (
              <p className={cn("mt-2.5 font-mono text-[11px] leading-relaxed", message.ok ? "text-teal" : "text-destructive")}>{message.text}</p>
            )}
          </PanelCard>
        ))}
      </div>

      <div className="mt-4">
        <PanelCard label="Upload rules">
          <SettingRow title="Maximum upload size" description="The largest file a user may upload to the platform.">
            <ChipGroup
              options={["10 MB", "20 MB", "50 MB", "100 MB"]}
              value={`${rules.max_upload_size_mb} MB`}
              onChange={(v) => setRules((r) => ({ ...r, max_upload_size_mb: Number(v.replace(" MB", "")) }))}
            />
          </SettingRow>
          <SettingRow title="Allowed file types" description="Uploads outside this list are rejected by the backend.">
            <div className="flex flex-wrap gap-1.5">
              {["JPG", "PNG", "WEBP", "SVG", "PDF"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleType(t)}
                  className={cn(
                    "rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.04em]",
                    rules.allowed_file_types.includes(t)
                      ? "border-brass/60 bg-brass/15 text-foreground"
                      : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </SettingRow>
          <SettingRow title="Maximum storage per user" description="0 = the subscription plan limit governs.">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={rules.max_storage_per_user_gb}
                onChange={(e) => setRules((r) => ({ ...r, max_storage_per_user_gb: Number(e.target.value) }))}
                className="w-24 rounded-[3px] text-right font-mono text-xs"
                aria-label="Max storage per user"
              />
              <span className="font-mono text-[10px] uppercase text-muted-foreground">GB</span>
            </div>
          </SettingRow>
          <SettingRow title="Maximum files per user" description="0 = unlimited.">
            <Input
              type="number"
              value={rules.max_files_per_user}
              onChange={(e) => setRules((r) => ({ ...r, max_files_per_user: Number(e.target.value) }))}
              className="w-28 rounded-[3px] text-right font-mono text-xs"
              aria-label="Max files per user"
            />
          </SettingRow>
          <div className="mt-4 flex items-center gap-3 border-t pt-4">
            <Button size="sm" onClick={saveRules} disabled={rulesSaving} className="gap-1.5">
              {rulesSaving && <Loader2 className="size-3.5 animate-spin" />}
              {rulesSaving ? "Saving…" : "Save rules"}
            </Button>
            {rulesNotice && (
              <span className={cn("flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.06em]", rulesNotice.ok ? "text-teal" : "text-destructive")}>
                {rulesNotice.ok && <Check className="size-3.5" strokeWidth={2} />}
                {rulesNotice.text}
              </span>
            )}
          </div>
        </PanelCard>
      </div>
    </div>
  );
}

/* ================= Email Settings ================= */

function useSystemFlash() {
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);
  const flash = (text: string, ok = true) => {
    setNotice({ text, ok });
    window.setTimeout(() => setNotice(null), 3500);
  };
  return { notice, flash };
}

function SystemFlashLine({ notice }: { notice: { text: string; ok: boolean } | null }) {
  if (!notice) return null;
  return (
    <span className={cn("flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.06em]", notice.ok ? "text-teal" : "text-destructive")}>
      {notice.ok && <Check className="size-3.5" strokeWidth={2} />}
      {notice.text}
    </span>
  );
}

function TemplateEditorModal({ open, template, onClose, onSaved }: {
  open: boolean;
  template: ApiEmailTemplate | null;
  onClose: () => void;
  onSaved: (fresh: ApiEmailTemplate) => void;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loadedFor, setLoadedFor] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (open && template && loadedFor !== template.id) {
    setSubject(template.subject);
    setBody(template.body);
    setLoadedFor(template.id);
    setError(null);
  }
  if (!open && loadedFor !== null) setLoadedFor(null);

  function submit() {
    if (!template) return;
    setSaving(true);
    setError(null);
    saveEmailTemplate(template.id, { subject, body, is_enabled: template.is_enabled })
      .then((fresh) => {
        onSaved(fresh);
        onClose();
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not save the template."))
      .finally(() => setSaving(false));
  }

  return (
    <Modal open={open} onClose={onClose} title={template ? `${template.name} — edit template` : "Edit template"} className="max-w-lg">
      <div className="p-5">
        <Field label="Subject">
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="rounded-[3px]" aria-label="Template subject" />
        </Field>
        <Field label="Body">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-52 w-full resize-y rounded-[3px] border bg-background px-3 py-2.5 font-mono text-[12px] leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Template body"
          />
        </Field>
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">
          Placeholders: {"{{name}} {{credits}} {{plan}} {{invoice}} {{amount}} {{tool}} {{link}} {{site_name}}"}
        </p>
        {error && <p className="mb-2 text-xs leading-relaxed text-destructive">{error}</p>}
        <div className="mt-2 flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            {saving ? "Saving…" : "Save template"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function AdminEmailPage() {
  const [smtp, setSmtp] = useState({ host: "", port: "587", encryption: "TLS", username: "", password: "", from_name: "", from_email: "" });
  const [passwordSet, setPasswordSet] = useState(false);
  const [templates, setTemplates] = useState<ApiEmailTemplate[]>([]);
  const [editing, setEditing] = useState<ApiEmailTemplate | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testResult, setTestResult] = useState<{ text: string; ok: boolean } | null>(null);
  const { notice, flash } = useSystemFlash();
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchEmailSettings()
      .then((data) => {
        if (cancelled) return;
        setSmtp({
          host: data.smtp.host,
          port: String(data.smtp.port),
          encryption: data.smtp.encryption,
          username: data.smtp.username,
          password: "",
          from_name: data.smtp.from_name,
          from_email: data.smtp.from_email,
        });
        setPasswordSet(data.smtp.password_set);
        setTemplates(data.templates);
      })
      .catch((e) => {
        if (!cancelled) setPageError(e instanceof ApiError ? `Could not load email settings: ${e.message}` : "Could not load email settings. Is the backend running?");
      });
    return () => { cancelled = true; };
  }, []);

  const patch = (p: Partial<typeof smtp>) => setSmtp((c) => ({ ...c, ...p }));

  function save() {
    setSmtpSaving(true);
    saveSmtp({ ...smtp, port: Number(smtp.port) })
      .then(() => {
        flash("SMTP verified against the live server and saved.");
        if (smtp.password) setPasswordSet(true);
        patch({ password: "" });
      })
      .catch((e) => flash(e instanceof ApiError ? e.message : "Could not save SMTP settings.", false))
      .finally(() => setSmtpSaving(false));
  }

  function sendTest() {
    setTestSending(true);
    setTestResult(null);
    sendTestEmail(testTo.trim() || undefined)
      .then(() => setTestResult({ text: `Delivered to ${testTo.trim() || "your admin address"} — check the inbox.`, ok: true }))
      .catch((e) => setTestResult({ text: e instanceof ApiError ? e.message : "Test email failed. Is the backend running?", ok: false }))
      .finally(() => setTestSending(false));
  }

  function toggleTemplate(template: ApiEmailTemplate) {
    const enabled = !template.is_enabled;
    setTemplates((l) => l.map((t) => (t.id === template.id ? { ...t, is_enabled: enabled } : t)));
    saveEmailTemplate(template.id, { subject: template.subject, body: template.body, is_enabled: enabled })
      .then((fresh) => setTemplates((l) => l.map((t) => (t.id === fresh.id ? fresh : t))))
      .catch(() => {
        setTemplates((l) => l.map((t) => (t.id === template.id ? { ...t, is_enabled: !enabled } : t)));
        flash(`Could not update ${template.name}.`, false);
      });
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="System" title="Email Settings" description={pageError ?? "SMTP, sender identity, templates, and system emails."} />
      {notice && <p className="mb-3"><SystemFlashLine notice={notice} /></p>}
      <div className="grid gap-4 lg:grid-cols-2">
        <PanelCard label="SMTP configuration">
          <div className="space-y-3.5">
            <Field label="Host"><Input value={smtp.host} onChange={(e) => patch({ host: e.target.value })} className="rounded-[3px] font-mono text-xs" aria-label="SMTP host" /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Port"><Input value={smtp.port} onChange={(e) => patch({ port: e.target.value })} className="rounded-[3px] font-mono text-xs" aria-label="SMTP port" /></Field>
              <Field label="Encryption"><NativeSelect value={smtp.encryption} onChange={(v) => patch({ encryption: v })} options={["TLS", "SSL", "None"]} aria-label="Encryption" /></Field>
            </div>
            <Field label="Username"><Input value={smtp.username} onChange={(e) => patch({ username: e.target.value })} className="rounded-[3px] font-mono text-xs" aria-label="SMTP username" /></Field>
            <Field label="Password">
              <Input type="password" value={smtp.password} onChange={(e) => patch({ password: e.target.value })} placeholder={passwordSet ? "•••••••••••• saved — type to replace" : ""} className="rounded-[3px] font-mono text-xs" aria-label="SMTP password" />
            </Field>
            <Button size="sm" onClick={save} disabled={smtpSaving} className="gap-1.5">
              {smtpSaving && <Loader2 className="size-3.5 animate-spin" />}
              {smtpSaving ? "Validating…" : "Validate & save"}
            </Button>
          </div>
        </PanelCard>
        <PanelCard label="Sender information">
          <div className="space-y-3.5">
            <Field label="From name"><Input value={smtp.from_name} onChange={(e) => patch({ from_name: e.target.value })} placeholder="Defaults to the website name" className="rounded-[3px]" aria-label="From name" /></Field>
            <Field label="From address"><Input value={smtp.from_email} onChange={(e) => patch({ from_email: e.target.value })} className="rounded-[3px] font-mono text-xs" aria-label="From address" /></Field>
            <p className="font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">
              Save SMTP first — the From address is required for sending.
            </p>
          </div>
        </PanelCard>
      </div>
      <div className="mt-4">
        <PanelCard label="Test email">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-64 flex-1">
              <Field label="Recipient (optional)">
                <Input
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  placeholder="Defaults to your admin address"
                  className="rounded-[3px] font-mono text-xs"
                  aria-label="Test recipient"
                />
              </Field>
            </div>
            <Button size="sm" onClick={sendTest} disabled={testSending} className="mb-3.5 gap-1.5">
              {testSending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              {testSending ? "Sending…" : "Send test email"}
            </Button>
          </div>
          {testResult && (
            <p className={cn("mt-1 flex items-center gap-1.5 font-mono text-[11px] leading-relaxed", testResult.ok ? "text-teal" : "text-destructive")}>
              {testResult.ok && <Check className="size-3.5" strokeWidth={2} />}
              {testResult.text}
            </p>
          )}
        </PanelCard>
      </div>
      <div className="mt-4">
        <AdminTable
          label={`Email templates (${templates.length})`}
          columns={[
            { key: "name", header: "Template", render: (t) => <span className="font-medium">{t.name}</span> },
            { key: "subj", header: "Subject", className: "max-w-sm", render: (t) => <span className="block truncate text-muted-foreground">{t.subject}</span> },
            { key: "upd", header: "Updated", className: "w-36 whitespace-nowrap", render: (t) => <span className="font-mono text-[10px] uppercase text-muted-foreground">{formatDateTime(t.updated_at.replace(" ", "T"))}</span> },
            { key: "edit", header: "", className: "w-16", render: (t) => <Button variant="outline" size="sm" onClick={() => { setEditing(t); setEditorOpen(true); }}>Edit</Button> },
            { key: "on", header: "Enabled", className: "w-14", render: (t) => <Switch checked={t.is_enabled} onCheckedChange={() => toggleTemplate(t)} aria-label={`Toggle ${t.name}`} /> },
          ]}
          rows={templates}
        />
      </div>
      <TemplateEditorModal
        open={editorOpen}
        template={editing}
        onClose={() => setEditorOpen(false)}
        onSaved={(fresh) => { setTemplates((l) => l.map((t) => (t.id === fresh.id ? fresh : t))); flash(`${fresh.name} saved.`); }}
      />
    </div>
  );
}

/* ================= Payment Settings ================= */

const GATEWAY_FIELDS: Record<string, { key: string; label: string; secret?: boolean }[]> = {
  stripe: [
    { key: "publishable_key", label: "Publishable Key" },
    { key: "secret_key", label: "Secret Key", secret: true },
    { key: "webhook_secret", label: "Webhook Secret", secret: true },
  ],
  paypal: [
    { key: "client_id", label: "Client ID" },
    { key: "client_secret", label: "Client Secret", secret: true },
    { key: "webhook_id", label: "Webhook ID", secret: true },
  ],
};

export function AdminPaymentSettingsPage() {
  const [gateways, setGateways] = useState<ApiPaymentGateway[]>([]);
  const [currency, setCurrency] = useState("USD");
  const [currencies, setCurrencies] = useState<string[]>(["USD"]);
  const [prefix, setPrefix] = useState("INV");
  const [autoInvoice, setAutoInvoice] = useState(true);
  const [drafts, setDrafts] = useState<Record<number, Record<string, string>>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const { notice, flash } = useSystemFlash();
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPaymentSettings()
      .then((data) => {
        if (cancelled) return;
        setGateways(data.gateways);
        setCurrency(data.currency);
        setCurrencies(data.currencies);
        setPrefix(data.invoice_prefix);
        setAutoInvoice(data.invoice_auto);
      })
      .catch((e) => {
        if (!cancelled) setPageError(e instanceof ApiError ? `Could not load payment settings: ${e.message}` : "Could not load payment settings. Is the backend running?");
      });
    return () => { cancelled = true; };
  }, []);

  function saveGateway(gateway: ApiPaymentGateway, patch: { enabled?: boolean; environment?: string } = {}) {
    setBusy(gateway.id);
    const credentials = drafts[gateway.id] ?? {};
    const typedFields = Object.keys(credentials).filter((k) => (credentials[k] ?? "").trim() !== "");
    savePaymentGateway(gateway.id, {
      credentials: Object.keys(credentials).length > 0 ? credentials : undefined,
      ...patch,
    })
      .then((fresh) => {
        setGateways(fresh);
        setDrafts((d) => ({ ...d, [gateway.id]: {} }));
        // Self-diagnosing save: verify every typed field actually persisted.
        const freshGateway = fresh.find((g) => g.id === gateway.id);
        const missing = typedFields.filter((k) => !freshGateway?.fields_set?.[k]);
        if (missing.length > 0) {
          flash(`${gateway.name}: ${missing.join(", ")} did NOT persist — please paste and save again.`, false);
          return;
        }
        flash(
          patch.enabled === true
            ? `${gateway.name} enabled — it now appears on the checkout page.`
            : patch.enabled === false
              ? `${gateway.name} disabled.`
              : typedFields.length > 0
                ? `${gateway.name} saved: ${typedFields.map((k) => k.replaceAll("_", " ")).join(", ")}.`
                : `${gateway.name} settings saved.`,
        );
      })
      .catch((e) => flash(e instanceof ApiError ? e.message : "Could not save the gateway.", false))
      .finally(() => setBusy(null));
  }

  const [testResults, setTestResults] = useState<Record<number, { ok: boolean; message: string }>>({});

  function runTest(gateway: ApiPaymentGateway) {
    setBusy(gateway.id);
    setTestResults((r) => {
      const next = { ...r };
      delete next[gateway.id];
      return next;
    });
    testPaymentGateway(gateway.id)
      .then((result) => setTestResults((r) => ({ ...r, [gateway.id]: result })))
      .catch((e) => setTestResults((r) => ({ ...r, [gateway.id]: { ok: false, message: e instanceof ApiError ? e.message : "Test failed. Is the backend running?" } })))
      .finally(() => setBusy(null));
  }

  function saveSettings() {
    setSettingsSaving(true);
    savePaymentSettings({ currency, invoice_prefix: prefix, invoice_auto: autoInvoice })
      .then(() => flash(`Saved — future invoices use ${prefix.toUpperCase()} and ${currency}.`))
      .catch((e) => flash(e instanceof ApiError ? e.message : "Could not save the settings.", false))
      .finally(() => setSettingsSaving(false));
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow="System" title="Payment Settings" description={pageError ?? "Gateways, credentials, currency, and invoicing."} />
      {notice && <p className="mb-3"><SystemFlashLine notice={notice} /></p>}
      <div className="grid gap-4 lg:grid-cols-3">
        {gateways.map((gateway) => (
          <PanelCard
            key={gateway.id}
            label={gateway.name}
            className={cn(gateway.enabled && "border-brass/60")}
            action={
              <Switch
                checked={gateway.enabled}
                disabled={busy === gateway.id}
                onCheckedChange={(v) => saveGateway(gateway, { enabled: v })}
                aria-label={`Toggle ${gateway.name}`}
              />
            }
          >
            <div className="space-y-3">
              {(GATEWAY_FIELDS[gateway.slug] ?? []).map((field) => (
                <Field key={field.key} label={field.label}>
                  <Input
                    type={field.secret ? "password" : "text"}
                    value={drafts[gateway.id]?.[field.key] ?? ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [gateway.id]: { ...d[gateway.id], [field.key]: e.target.value } }))}
                    placeholder={gateway.fields_set?.[field.key] ? "•••••• saved — type to replace" : "Not set"}
                    className="rounded-[3px] font-mono text-xs"
                    aria-label={`${gateway.name} ${field.label}`}
                    autoComplete={field.secret ? "new-password" : "off"}
                    name={`${gateway.slug}-${field.key}`}
                  />
                  {gateway.fields_set?.[field.key] && !(drafts[gateway.id]?.[field.key] ?? "") && (
                    <p className="mt-1 flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.06em] text-teal">
                      <Check className="size-3" strokeWidth={2.5} /> Saved — hidden for security
                    </p>
                  )}
                </Field>
              ))}
              <Field label="Environment">
                <NativeSelect
                  value={gateway.environment}
                  onChange={(v) => saveGateway(gateway, { environment: v })}
                  options={["sandbox", "production"]}
                  aria-label={`${gateway.name} environment`}
                />
              </Field>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={busy === gateway.id} onClick={() => saveGateway(gateway)}>
                  Save credentials
                </Button>
                <Button size="sm" variant="outline" disabled={busy === gateway.id} onClick={() => runTest(gateway)}>
                  Test
                </Button>
              </div>
              {testResults[gateway.id] !== undefined && (
                <p className={cn("font-mono text-[10px] uppercase leading-relaxed tracking-[0.04em]", testResults[gateway.id]?.ok ? "text-teal" : "text-destructive")}>
                  {testResults[gateway.id]?.message}
                </p>
              )}
            </div>
          </PanelCard>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <PanelCard label="Currency">
          <SettingRow title="Display currency" description="Platform default — new payments and invoices use it.">
            <NativeSelect value={currency} onChange={setCurrency} options={currencies} className="w-40" aria-label="Currency" />
          </SettingRow>
        </PanelCard>
        <PanelCard label="Invoices">
          <SettingRow title="Auto-generate invoices" description="Created after each successful payment.">
            <Switch checked={autoInvoice} onCheckedChange={setAutoInvoice} aria-label="Auto invoices" />
          </SettingRow>
          <SettingRow title="Invoice prefix" description="Applied to every new invoice number.">
            <Input value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} className="w-32 rounded-[3px] font-mono text-xs" aria-label="Invoice prefix" />
          </SettingRow>
        </PanelCard>
      </div>
      <div className="mt-4">
        <Button size="sm" onClick={saveSettings} disabled={settingsSaving} className="gap-1.5">
          {settingsSaving && <Loader2 className="size-3.5 animate-spin" />}
          {settingsSaving ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </div>
  );
}

/* ================= Security Settings ================= */

const EVENT_TONE_CLASS: Record<string, string> = {
  destructive: "text-destructive",
  brass: "text-brass",
  teal: "text-teal",
  default: "",
};

export function AdminSecurityPage() {
  const [events, setEvents] = useState<ApiSecurityEvent[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSecurity()
      .then((data) => {
        if (!cancelled) setEvents(data.events);
      })
      .catch((e: unknown) => {
        if (!cancelled) setPageError(e instanceof ApiError ? `Could not load login activity: ${e.message}` : "Could not load login activity. Is the backend running?");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="System"
        title="Security"
        description={pageError ?? "Login and account activity across the platform."}
      />
      <AdminTable
        label={`Activity logs (${events.length})`}
        columns={[
          { key: "event", header: "Event", render: (l) => <span className={cn(EVENT_TONE_CLASS[l.tone])}>{l.event}</span> },
          { key: "actor", header: "Actor", render: (l) => <span className="text-muted-foreground">{l.actor}</span> },
          { key: "ip", header: "IP", className: "hidden md:table-cell", render: (l) => <span className="hidden font-mono text-xs text-muted-foreground md:block">{l.ip || "—"}</span> },
          { key: "at", header: "When", render: (l) => <span className="font-mono text-[10px] uppercase text-muted-foreground">{formatDateTime(l.created_at.replace(" ", "T"))}</span> },
        ]}
        rows={events}
      />
    </div>
  );
}

/* ================= Notification Settings ================= */

export function AdminNotificationSettingsPage() {
  const [events, setEvents] = useState<ApiNotificationEvent[]>([]);
  const [saving, setSaving] = useState(false);
  const { notice, flash } = useSystemFlash();
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchNotificationSettings()
      .then((data) => {
        if (!cancelled) setEvents(data);
      })
      .catch((e) => {
        if (!cancelled) setPageError(e instanceof ApiError ? `Could not load notification settings: ${e.message}` : "Could not load notification settings. Is the backend running?");
      });
    return () => { cancelled = true; };
  }, []);

  const patch = (id: string, key: "admin" | "user") =>
    setEvents((l) => l.map((e) => (e.id === id ? { ...e, [key]: !e[key] } : e)));

  function save() {
    setSaving(true);
    saveNotificationSettings(events)
      .then(() => flash("Notification preferences saved — they take effect immediately."))
      .catch((e) => flash(e instanceof ApiError ? e.message : "Could not save.", false))
      .finally(() => setSaving(false));
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="System" title="Notifications" description={pageError ?? "Which events notify admins and users."} />
      {notice && <p className="mb-3"><SystemFlashLine notice={notice} /></p>}
      <PanelCard label="Events" contentClassName="p-0">
        <div className="flex items-center gap-6 border-b px-5 py-2.5">
          <span className="eyebrow flex-1 text-[9px] text-muted-foreground">Event</span>
          <span className="eyebrow w-12 text-center text-[9px] text-muted-foreground">Admin</span>
          <span className="eyebrow w-12 text-center text-[9px] text-muted-foreground">User</span>
        </div>
        {events.map((event, i) => (
          <div key={event.id} className={cn("flex items-center gap-6 px-5 py-3.5", i !== events.length - 1 && "border-b")}>
            <span className="flex-1 text-sm">{event.label}</span>
            <span className="grid w-12 place-items-center"><Switch checked={event.admin} onCheckedChange={() => patch(event.id, "admin")} aria-label={`Admin: ${event.label}`} /></span>
            <span className="grid w-12 place-items-center"><Switch checked={event.user} onCheckedChange={() => patch(event.id, "user")} aria-label={`User: ${event.label}`} /></span>
          </div>
        ))}
      </PanelCard>
      <div className="mt-4">
        <Button size="sm" onClick={save} disabled={saving} className="gap-1.5">
          {saving && <Loader2 className="size-3.5 animate-spin" />}
          {saving ? "Saving…" : "Save preferences"}
        </Button>
      </div>
    </div>
  );
}

/* ================= General Settings ================= */

export function AdminGeneralPage() {
  const [config, setConfig] = useState<GeneralSettings>({
    site_name: "",
    contact_email: "",
    time_zone: "UTC",
    currency: "USD",
    maintenance_mode: false,
    timezones: ["UTC"],
  });
  const [saving, setSaving] = useState(false);
  const { notice, flash } = useSystemFlash();
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchGeneralSettings()
      .then((data) => {
        if (!cancelled) setConfig(data);
      })
      .catch((e) => {
        if (!cancelled) setPageError(e instanceof ApiError ? `Could not load general settings: ${e.message}` : "Could not load general settings. Is the backend running?");
      });
    return () => { cancelled = true; };
  }, []);

  const patch = (p: Partial<GeneralSettings>) => setConfig((c) => ({ ...c, ...p }));

  function save() {
    setSaving(true);
    saveGeneralSettings({
      site_name: config.site_name,
      contact_email: config.contact_email,
      time_zone: config.time_zone,
      maintenance_mode: config.maintenance_mode,
    })
      .then((fresh) => {
        setConfig(fresh);
        invalidatePlatformConfig();
        flash(fresh.maintenance_mode ? "Saved — maintenance mode is ON. Non-admin users are blocked." : "General settings saved.");
      })
      .catch((e) => flash(e instanceof ApiError ? e.message : "Could not save.", false))
      .finally(() => setSaving(false));
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="System" title="General Settings" description={pageError ?? "Platform-wide identity and defaults."} />
      {notice && <p className="mb-3"><SystemFlashLine notice={notice} /></p>}
      <PanelCard label="Platform">
        <div className="space-y-1">
          <SettingRow title="Website name" description="Shown in the header, emails, and page titles.">
            <Input value={config.site_name} onChange={(e) => patch({ site_name: e.target.value })} className="w-56 rounded-[3px]" aria-label="Website name" />
          </SettingRow>
          <SettingRow title="Contact email" description="Public support address.">
            <Input value={config.contact_email} onChange={(e) => patch({ contact_email: e.target.value })} className="w-64 rounded-[3px] font-mono text-xs" aria-label="Contact email" />
          </SettingRow>
          <SettingRow title="Time zone" description="Platform default for reports and resets.">
            <NativeSelect value={config.time_zone} onChange={(v) => patch({ time_zone: v })} options={config.timezones} className="w-52" aria-label="Time zone" />
          </SettingRow>
          <SettingRow title="Currency" description="Managed under Payment Settings.">
            <span className="font-mono text-xs text-muted-foreground">{config.currency}</span>
          </SettingRow>
          <SettingRow title="Maintenance mode" description="Blocks all non-admin users while you keep full access.">
            <Switch checked={config.maintenance_mode} onCheckedChange={(v) => patch({ maintenance_mode: v })} aria-label="Maintenance mode" />
          </SettingRow>
        </div>
        <div className="mt-4 flex items-center gap-3 border-t pt-4">
          <Button size="sm" onClick={save} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </PanelCard>
    </div>
  );
}
