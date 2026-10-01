import { useEffect, useState } from "react";
import { Check, Loader2, Pencil, Send, Trash2 } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { ChipGroup, Field, formatDateTime, Stepper } from "@/features/studio-kit";
import { PageHeader } from "@/components/common/page-header";
import { PanelCard } from "@/components/common/panel-card";
import { Modal } from "@/components/common/modal";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AdminTable, StatusPill } from "../components";
import {
  createAnnouncement,
  createFaq,
  createHelpArticle,
  deleteAnnouncement,
  deleteFaq,
  deleteHelpArticle,
  fetchAdminFaqs,
  fetchAnnouncements,
  fetchHelpArticles,
  publishAnnouncement,
  toAnnouncementDraft,
  toArticleDraft,
  toFaqDraft,
  updateAnnouncement,
  updateFaq,
  updateHelpArticle,
  type AnnouncementDraft,
  type ApiAnnouncement,
  type ApiFaq,
  type ApiHelpArticle,
  type ArticleDraft,
  type FaqDraft,
} from "../services/admin-content-service";

/** Shared tiny helpers for the three content pages. */
function useFlash() {
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);
  const flash = (text: string, ok = true) => {
    setNotice({ text, ok });
    window.setTimeout(() => setNotice(null), 3000);
  };
  return { notice, flash };
}

function Notice({ notice }: { notice: { text: string; ok: boolean } | null }) {
  if (!notice) return null;
  return (
    <p className={`mb-3 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.06em] ${notice.ok ? "text-teal" : "text-destructive"}`}>
      {notice.ok && <Check className="size-3.5" strokeWidth={2} />}
      {notice.text}
    </p>
  );
}

function RowIcon({ onClick, label, destructive, children }: { onClick: () => void; label: string; destructive?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`grid size-7 place-items-center rounded-[3px] border text-muted-foreground hover:bg-accent ${destructive ? "hover:text-destructive" : "hover:text-foreground"}`}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

/* ================= Announcements ================= */

const ANNOUNCEMENT_TONE: Record<ApiAnnouncement["status"], "teal" | "brass" | "muted"> = {
  published: "teal",
  scheduled: "brass",
  draft: "muted",
};

const AUDIENCE_LABEL: Record<ApiAnnouncement["audience"], string> = {
  all: "All users",
  sketch: "Sketch",
  studio: "Studio",
  agency: "Agency",
};

function AnnouncementModal({ open, item, onClose, onSaved }: {
  open: boolean;
  item: ApiAnnouncement | null;
  onClose: () => void;
  onSaved: (fresh: ApiAnnouncement, created: boolean) => void;
}) {
  const [draft, setDraft] = useState<AnnouncementDraft>(toAnnouncementDraft(item));
  const [loadedFor, setLoadedFor] = useState<number | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = item?.id ?? "new";
  if (open && loadedFor !== key) {
    setDraft(toAnnouncementDraft(item));
    setLoadedFor(key);
    setError(null);
  }
  if (!open && loadedFor !== null) setLoadedFor(null);

  const patch = (p: Partial<AnnouncementDraft>) => setDraft((d) => ({ ...d, ...p }));
  const published = item?.status === "published";

  function submit() {
    setSaving(true);
    setError(null);
    (item ? updateAnnouncement(item.id, draft) : createAnnouncement(draft))
      .then((fresh) => {
        onSaved(fresh, item === null);
        onClose();
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not save the announcement."))
      .finally(() => setSaving(false));
  }

  return (
    <Modal open={open} onClose={onClose} title={item ? "Edit announcement" : "New announcement"} className="max-w-lg">
      <div className="p-5">
        <Field label="Title">
          <Input value={draft.title} onChange={(e) => patch({ title: e.target.value })} className="rounded-[3px]" aria-label="Announcement title" />
        </Field>
        <Field label="Message">
          <textarea
            value={draft.body}
            onChange={(e) => patch({ body: e.target.value })}
            className="min-h-28 w-full resize-y rounded-[3px] border bg-background px-3 py-2.5 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Announcement body"
          />
        </Field>
        <Field label="Audience">
          <ChipGroup
            options={Object.values(AUDIENCE_LABEL)}
            value={AUDIENCE_LABEL[draft.audience]}
            onChange={(v) => patch({ audience: (Object.entries(AUDIENCE_LABEL).find(([, l]) => l === v)?.[0] ?? "all") as ApiAnnouncement["audience"] })}
          />
        </Field>
        {!published && (
          <>
            <Field label="Status">
              <ChipGroup
                options={["Draft", "Scheduled", "Published"]}
                value={(draft.status[0] ?? "").toUpperCase() + draft.status.slice(1)}
                onChange={(v) => patch({ status: v.toLowerCase() as AnnouncementDraft["status"] })}
              />
            </Field>
            {draft.status === "scheduled" && (
              <Field label="Publish at">
                <Input type="datetime-local" value={draft.publish_at} onChange={(e) => patch({ publish_at: e.target.value })} className="rounded-[3px] font-mono text-xs" aria-label="Publish date" />
              </Field>
            )}
            {draft.status === "published" && (
              <p className="mb-3 text-[12.5px] leading-relaxed text-muted-foreground">
                Saving as published pushes this announcement to the audience's inboxes immediately.
              </p>
            )}
          </>
        )}
        {error && <p className="mb-2 text-xs leading-relaxed text-destructive">{error}</p>}
        <div className="mt-2 flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            {saving ? "Saving…" : item ? "Save" : "Create"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function AdminAnnouncementsPage() {
  const [items, setItems] = useState<ApiAnnouncement[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ApiAnnouncement | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ApiAnnouncement | null>(null);
  const [pendingPublish, setPendingPublish] = useState<ApiAnnouncement | null>(null);
  const { notice, flash } = useFlash();
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAnnouncements()
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((e) => {
        if (!cancelled) setPageError(e instanceof ApiError ? `Could not load announcements: ${e.message}` : "Could not load announcements. Is the backend running?");
      });
    return () => { cancelled = true; };
  }, []);

  function onSaved(fresh: ApiAnnouncement, created: boolean) {
    setItems((list) => (created ? [fresh, ...list] : list.map((a) => (a.id === fresh.id ? fresh : a))));
    flash(
      created && fresh.status === "published"
        ? `Published — ${(fresh.notified ?? 0).toLocaleString()} users notified.`
        : created ? "Announcement created." : "Announcement saved.",
    );
  }

  function confirmPublish() {
    const item = pendingPublish;
    if (!item) return;
    publishAnnouncement(item.id)
      .then((fresh) => {
        setItems((list) => list.map((a) => (a.id === fresh.id ? fresh : a)));
        flash(`Published — ${(fresh.notified ?? 0).toLocaleString()} users notified.`);
      })
      .catch((e) => flash(e instanceof ApiError ? e.message : "Could not publish.", false));
  }

  function confirmDelete() {
    const item = pendingDelete;
    if (!item) return;
    deleteAnnouncement(item.id)
      .then(() => {
        setItems((list) => list.filter((a) => a.id !== item.id));
        flash("Announcement deleted.");
      })
      .catch((e) => flash(e instanceof ApiError ? e.message : "Could not delete.", false));
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Content"
        title="Announcements"
        description={pageError ?? "Product news pushed to user inboxes."}
        action={<Button size="sm" onClick={() => { setEditing(null); setEditorOpen(true); }}>New announcement</Button>}
      />
      <Notice notice={notice} />
      <AdminTable
        label={`Announcements (${items.length})`}
        columns={[
          { key: "title", header: "Title", render: (a) => <span className="font-medium">{a.title}</span> },
          { key: "aud", header: "Audience", render: (a) => <span className="text-muted-foreground">{AUDIENCE_LABEL[a.audience]}</span> },
          { key: "date", header: "Publish date", render: (a) => (
            <span className="font-mono text-[10px] uppercase text-muted-foreground">
              {a.published_at ? formatDateTime(a.published_at.replace(" ", "T")) : a.publish_at ? formatDateTime(a.publish_at.replace(" ", "T")) : "—"}
            </span>
          ) },
          { key: "status", header: "Status", render: (a) => <StatusPill tone={ANNOUNCEMENT_TONE[a.status]}>{a.status}</StatusPill> },
          { key: "actions", header: "", className: "w-28", render: (a) => (
            <div className="flex items-center gap-1.5">
              {a.status !== "published" && (
                <RowIcon label={`Publish ${a.title}`} onClick={() => setPendingPublish(a)}>
                  <Send className="size-3.5" strokeWidth={1.6} />
                </RowIcon>
              )}
              <RowIcon label={`Edit ${a.title}`} onClick={() => { setEditing(a); setEditorOpen(true); }}>
                <Pencil className="size-3.5" strokeWidth={1.6} />
              </RowIcon>
              <RowIcon label={`Delete ${a.title}`} destructive onClick={() => setPendingDelete(a)}>
                <Trash2 className="size-3.5" strokeWidth={1.6} />
              </RowIcon>
            </div>
          ) },
        ]}
        rows={items}
      />

      <AnnouncementModal open={editorOpen} item={editing} onClose={() => setEditorOpen(false)} onSaved={onSaved} />
      <ConfirmDialog
        open={pendingPublish !== null}
        onClose={() => setPendingPublish(null)}
        onConfirm={confirmPublish}
        title="Publish announcement"
        message={`Publish "${pendingPublish?.title ?? ""}" to ${AUDIENCE_LABEL[pendingPublish?.audience ?? "all"]}? Every matching user gets an inbox notification immediately.`}
        confirmLabel="Publish"
      />
      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Delete announcement"
        message={`Delete "${pendingDelete?.title ?? ""}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}

/* ================= Help Center ================= */

const ARTICLE_CATEGORIES = ["Getting started", "Billing", "Studios", "Files", "Account", "General"];

function ArticleModal({ open, item, onClose, onSaved }: {
  open: boolean;
  item: ApiHelpArticle | null;
  onClose: () => void;
  onSaved: (fresh: ApiHelpArticle, created: boolean) => void;
}) {
  const [draft, setDraft] = useState<ArticleDraft>(toArticleDraft(item));
  const [loadedFor, setLoadedFor] = useState<number | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = item?.id ?? "new";
  if (open && loadedFor !== key) {
    setDraft(toArticleDraft(item));
    setLoadedFor(key);
    setError(null);
  }
  if (!open && loadedFor !== null) setLoadedFor(null);

  const patch = (p: Partial<ArticleDraft>) => setDraft((d) => ({ ...d, ...p }));

  function submit() {
    setSaving(true);
    setError(null);
    (item ? updateHelpArticle(item.id, draft) : createHelpArticle(draft))
      .then((fresh) => {
        onSaved(fresh, item === null);
        onClose();
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not save the article."))
      .finally(() => setSaving(false));
  }

  return (
    <Modal open={open} onClose={onClose} title={item ? "Edit article" : "New article"} className="max-w-lg">
      <div className="max-h-[70svh] overflow-y-auto p-5">
        <Field label="Title">
          <Input value={draft.title} onChange={(e) => patch({ title: e.target.value })} className="rounded-[3px]" aria-label="Article title" />
        </Field>
        <Field label="Category">
          <ChipGroup options={ARTICLE_CATEGORIES} value={draft.category} onChange={(v) => patch({ category: v })} />
        </Field>
        <Field label="Body">
          <textarea
            value={draft.body}
            onChange={(e) => patch({ body: e.target.value })}
            className="min-h-44 w-full resize-y rounded-[3px] border bg-background px-3 py-2.5 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Article body"
          />
        </Field>
        <Field label="Published">
          <div className="flex items-center gap-3">
            <Switch checked={draft.status === "published"} onCheckedChange={(v) => patch({ status: v ? "published" : "draft" })} aria-label="Published" />
            <span className="text-sm text-muted-foreground">{draft.status === "published" ? "Visible in the help center" : "Draft — admins only"}</span>
          </div>
        </Field>
        {error && <p className="mb-2 text-xs leading-relaxed text-destructive">{error}</p>}
        <div className="mt-2 flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            {saving ? "Saving…" : item ? "Save" : "Create"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function AdminHelpCenterPage() {
  const [items, setItems] = useState<ApiHelpArticle[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ApiHelpArticle | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ApiHelpArticle | null>(null);
  const { notice, flash } = useFlash();
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchHelpArticles()
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((e) => {
        if (!cancelled) setPageError(e instanceof ApiError ? `Could not load articles: ${e.message}` : "Could not load articles. Is the backend running?");
      });
    return () => { cancelled = true; };
  }, []);

  function onSaved(fresh: ApiHelpArticle, created: boolean) {
    setItems((list) => (created ? [fresh, ...list] : list.map((a) => (a.id === fresh.id ? fresh : a))));
    flash(created ? "Article created." : "Article saved.");
  }

  function confirmDelete() {
    const item = pendingDelete;
    if (!item) return;
    deleteHelpArticle(item.id)
      .then(() => {
        setItems((list) => list.filter((a) => a.id !== item.id));
        flash("Article deleted.");
      })
      .catch((e) => flash(e instanceof ApiError ? e.message : "Could not delete.", false));
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Content"
        title="Help Center"
        description={pageError ?? "Docs users see under Help & Support."}
        action={<Button size="sm" onClick={() => { setEditing(null); setEditorOpen(true); }}>New article</Button>}
      />
      <Notice notice={notice} />
      <AdminTable
        label={`Articles (${items.length})`}
        columns={[
          { key: "title", header: "Article", render: (a) => <span className="font-medium">{a.title}</span> },
          { key: "cat", header: "Category", render: (a) => <span className="text-muted-foreground">{a.category}</span> },
          { key: "views", header: "Views", className: "text-right", render: (a) => <span className="block text-right font-mono text-xs tabular-nums">{a.views.toLocaleString()}</span> },
          { key: "upd", header: "Updated", render: (a) => <span className="font-mono text-[10px] uppercase text-muted-foreground">{formatDateTime(a.updated_at.replace(" ", "T"))}</span> },
          { key: "status", header: "Status", render: (a) => <StatusPill tone={a.status === "published" ? "teal" : "muted"}>{a.status}</StatusPill> },
          { key: "actions", header: "", className: "w-20", render: (a) => (
            <div className="flex items-center gap-1.5">
              <RowIcon label={`Edit ${a.title}`} onClick={() => { setEditing(a); setEditorOpen(true); }}>
                <Pencil className="size-3.5" strokeWidth={1.6} />
              </RowIcon>
              <RowIcon label={`Delete ${a.title}`} destructive onClick={() => setPendingDelete(a)}>
                <Trash2 className="size-3.5" strokeWidth={1.6} />
              </RowIcon>
            </div>
          ) },
        ]}
        rows={items}
      />

      <ArticleModal open={editorOpen} item={editing} onClose={() => setEditorOpen(false)} onSaved={onSaved} />
      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Delete article"
        message={`Delete "${pendingDelete?.title ?? ""}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}

/* ================= FAQs ================= */

function FaqModal({ open, item, onClose, onSaved }: {
  open: boolean;
  item: ApiFaq | null;
  onClose: () => void;
  onSaved: (fresh: ApiFaq, created: boolean) => void;
}) {
  const [draft, setDraft] = useState<FaqDraft>(toFaqDraft(item));
  const [loadedFor, setLoadedFor] = useState<number | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = item?.id ?? "new";
  if (open && loadedFor !== key) {
    setDraft(toFaqDraft(item));
    setLoadedFor(key);
    setError(null);
  }
  if (!open && loadedFor !== null) setLoadedFor(null);

  const patch = (p: Partial<FaqDraft>) => setDraft((d) => ({ ...d, ...p }));

  function submit() {
    setSaving(true);
    setError(null);
    (item ? updateFaq(item.id, draft) : createFaq(draft))
      .then((fresh) => {
        onSaved(fresh, item === null);
        onClose();
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not save the FAQ."))
      .finally(() => setSaving(false));
  }

  return (
    <Modal open={open} onClose={onClose} title={item ? "Edit FAQ" : "Add FAQ"} className="max-w-lg">
      <div className="p-5">
        <Field label="Question">
          <Input value={draft.question} onChange={(e) => patch({ question: e.target.value })} className="rounded-[3px]" aria-label="Question" />
        </Field>
        <Field label="Answer">
          <textarea
            value={draft.answer}
            onChange={(e) => patch({ answer: e.target.value })}
            className="min-h-28 w-full resize-y rounded-[3px] border bg-background px-3 py-2.5 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Answer"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Display order">
            <Stepper value={draft.sort_order} min={0} max={99} onChange={(v) => patch({ sort_order: v })} />
          </Field>
          <Field label="Live">
            <Switch checked={draft.is_active} onCheckedChange={(v) => patch({ is_active: v })} aria-label="FAQ live" />
          </Field>
        </div>
        {error && <p className="mb-2 text-xs leading-relaxed text-destructive">{error}</p>}
        <div className="mt-2 flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            {saving ? "Saving…" : item ? "Save" : "Add FAQ"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function AdminFaqsPage() {
  const [items, setItems] = useState<ApiFaq[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ApiFaq | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ApiFaq | null>(null);
  const { notice, flash } = useFlash();
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAdminFaqs()
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((e) => {
        if (!cancelled) setPageError(e instanceof ApiError ? `Could not load FAQs: ${e.message}` : "Could not load FAQs. Is the backend running?");
      });
    return () => { cancelled = true; };
  }, []);

  function onSaved(fresh: ApiFaq, created: boolean) {
    setItems((list) => {
      const next = created ? [...list, fresh] : list.map((f) => (f.id === fresh.id ? fresh : f));
      return [...next].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    });
    flash(created ? "FAQ added." : "FAQ saved.");
  }

  function confirmDelete() {
    const item = pendingDelete;
    if (!item) return;
    deleteFaq(item.id)
      .then(() => {
        setItems((list) => list.filter((f) => f.id !== item.id));
        flash("FAQ deleted.");
      })
      .catch((e) => flash(e instanceof ApiError ? e.message : "Could not delete.", false));
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Content"
        title="FAQs"
        description={pageError ?? "The questions answered on the landing page and support page."}
        action={<Button size="sm" onClick={() => { setEditing(null); setEditorOpen(true); }}>Add FAQ</Button>}
      />
      <Notice notice={notice} />
      <PanelCard label={`FAQs (${items.length})`} contentClassName="p-0">
        {items.map((faq, i) => (
          <div key={faq.id} className={`px-5 py-4 ${i !== items.length - 1 ? "border-b" : ""}`}>
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm font-medium">{faq.question}</p>
              <div className="flex items-center gap-2">
                <StatusPill tone={faq.is_active ? "teal" : "muted"}>{faq.is_active ? "live" : "hidden"}</StatusPill>
                <RowIcon label={`Edit FAQ ${faq.id}`} onClick={() => { setEditing(faq); setEditorOpen(true); }}>
                  <Pencil className="size-3.5" strokeWidth={1.6} />
                </RowIcon>
                <RowIcon label={`Delete FAQ ${faq.id}`} destructive onClick={() => setPendingDelete(faq)}>
                  <Trash2 className="size-3.5" strokeWidth={1.6} />
                </RowIcon>
              </div>
            </div>
            <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">{faq.answer}</p>
          </div>
        ))}
      </PanelCard>

      <FaqModal open={editorOpen} item={editing} onClose={() => setEditorOpen(false)} onSaved={onSaved} />
      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Delete FAQ"
        message={`Delete "${pendingDelete?.question ?? ""}"? It disappears from the landing and support pages.`}
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
