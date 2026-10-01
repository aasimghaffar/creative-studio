import { useEffect, useMemo, useState } from "react";
import { formatMb } from "@/lib/format-bytes";
import { FolderOpen } from "lucide-react";
import { ChipGroup, EmptyState, formatDateTime } from "@/features/studio-kit";
import type { FileItem, StorageUsage } from "@/mocks";
import { downloadFile } from "@/lib/api-client";
import { PageHeader } from "@/components/common/page-header";
import { PanelCard } from "@/components/common/panel-card";
import { SearchField } from "@/components/common/search-field";
import { StorageProgress } from "@/components/common/storage-progress";
import { ViewToggle, type ViewMode } from "@/components/common/view-toggle";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Modal } from "@/components/common/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileCard, FILE_TYPE_ICONS } from "./components/file-card";
import { deleteFile, fetchFiles, renameFile, requestDownload } from "./services/file-service";

const TYPE_FILTERS = ["All", "Images", "Video", "Audio", "Documents"];
const TYPE_MAP: Record<string, FileItem["type"] | null> = {
  All: null,
  Images: "image",
  Video: "video",
  Audio: "audio",
  Documents: "document",
};

/** Downloads via the API (counts it) with a direct-URL fallback. */
function downloadRealFile(file: FileItem) {
  requestDownload(Number(file.id))
    .then(({ url, filename }) => downloadFile(url, filename))
    .catch(() => {
      if (file.url) void downloadFile(file.url, `${file.name}.${file.ext}`).catch(() => undefined);
    });
}

export function FilesPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [storage, setStorage] = useState<StorageUsage>({ usedGb: 0, totalGb: 10, breakdown: [] });
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [view, setView] = useState<ViewMode>("grid");
  const [preview, setPreview] = useState<FileItem | null>(null);
  const [renaming, setRenaming] = useState<FileItem | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [pendingDelete, setPendingDelete] = useState<FileItem | null>(null);

  // Type filter is a server query; search filters the fetched window.
  useEffect(() => {
    let cancelled = false;
    const type = TYPE_MAP[typeFilter] ?? undefined;

    fetchFiles({ type: type ?? undefined })
      .then((data) => {
        if (cancelled) return;
        setFiles(data.files);
        setStorage(data.storage);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [typeFilter]);

  const filtered = useMemo(
    () =>
      files.filter(
        (f) => !query || `${f.name}.${f.ext}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [files, query],
  );

  function commitRename() {
    if (!renaming) return;
    const next = renameValue.trim();
    if (next && next !== renaming.name) {
      const previous = files;
      setFiles((list) => list.map((f) => (f.id === renaming.id ? { ...f, name: next } : f)));
      void renameFile(Number(renaming.id), next).catch(() => setFiles(previous));
    }
    setRenaming(null);
  }

  function removeFile(file: FileItem) {
    const previous = files;
    const previousStorage = storage;
    setFiles((list) => list.filter((f) => f.id !== file.id));
    // Storage drops instantly — no refresh needed. The next server fetch
    // (any visit) re-syncs against the database calculation.
    const deltaGb = file.sizeMb / 1024;
    setStorage((current) => ({
      ...current,
      usedGb: Math.max(0, current.usedGb - deltaGb),
      breakdown: current.breakdown.map((item) =>
        item.label === "Images" && file.type === "image"
          ? { ...item, sizeGb: Math.max(0, item.sizeGb - deltaGb) }
          : item,
      ),
    }));
    void deleteFile(Number(file.id)).catch(() => {
      setFiles(previous);
      setStorage(previousStorage);
    });
  }

  const PreviewIcon = preview ? FILE_TYPE_ICONS[preview.type] : null;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Library"
        title="My Files"
        description="Everything you've generated, uploaded, or exported — in one drawer."
      />

      <PanelCard label="Storage usage" className="mb-5">
        <StorageProgress storage={storage} />
      </PanelCard>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <SearchField value={query} onChange={setQuery} placeholder="Search files…" className="w-56" />
        <ChipGroup options={TYPE_FILTERS} value={typeFilter} onChange={setTypeFilter} />
        <div className="ml-auto">
          <ViewToggle value={view} onChange={setView} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          hint={
            files.length === 0
              ? "Your drawer is empty. Files you generate or upload will land here."
              : "No files match this search or filter."
          }
        />
      ) : (
        <div className={view === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
          {filtered.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              view={view}
              onPreview={() => setPreview(file)}
              onDownload={() => downloadRealFile(file)}
              onRename={() => {
                setRenaming(file);
                setRenameValue(file.name);
              }}
              onDelete={() => setPendingDelete(file)}
            />
          ))}
        </div>
      )}

      {/* Preview */}
      <Modal open={preview !== null} onClose={() => setPreview(null)} title="File preview" className="max-w-lg">
        {preview && PreviewIcon && (
          <div className="p-5">
            <div
              className="relative grid aspect-video place-items-center overflow-hidden rounded-[3px] border border-bp-line"
              style={{
                background:
                  preview.url && preview.type === "image"
                    ? undefined
                    : `linear-gradient(135deg, ${preview.colors[0]}, ${preview.colors[1]})`,
              }}
            >
              {!(preview.url && preview.type === "image") && (
                <div className="bg-grid absolute inset-0 opacity-30" aria-hidden="true" />
              )}
              {preview.url && preview.type === "image" ? (
                <img src={preview.url} alt={preview.name} className="absolute inset-0 size-full object-contain" />
              ) : (
                <PreviewIcon className="size-10 text-paper-dark/90" strokeWidth={1.4} />
              )}
            </div>
            <p className="mt-4 text-sm font-medium">
              {preview.name}
              <span className="text-muted-foreground">.{preview.ext}</span>
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.04em] text-muted-foreground">
              {preview.type} · {formatMb(preview.sizeMb)} · {formatDateTime(preview.createdAt)}
            </p>
            <div className="mt-5 flex justify-end">
              <Button size="sm" onClick={() => downloadRealFile(preview)}>
                Download
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Rename */}
      <Modal open={renaming !== null} onClose={() => setRenaming(null)} title="Rename file">
        <div className="p-5">
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && commitRename()}
            className="rounded-[3px]"
            aria-label="New file name"
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setRenaming(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={commitRename}>
              Rename
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && removeFile(pendingDelete)}
        title="Delete file"
        message={`Delete "${pendingDelete?.name ?? ""}.${pendingDelete?.ext ?? ""}"? This can't be undone.`}
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
