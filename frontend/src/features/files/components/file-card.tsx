import { Download, Eye, FileText, Film, Music, Pencil, Trash2 } from "lucide-react";
import { formatMb } from "@/lib/format-bytes";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/features/studio-kit";
import type { FileItem, FileType } from "@/mocks";
import type { ViewMode } from "@/components/common/view-toggle";

export const FILE_TYPE_ICONS: Record<FileType, LucideIcon> = {
  image: Eye,
  video: Film,
  audio: Music,
  document: FileText,
};

function IconAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="grid size-7 place-items-center rounded-[3px] border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  );
}

function Thumb({ file, large }: { file: FileItem; large?: boolean }) {
  const Icon = FILE_TYPE_ICONS[file.type];
  return (
    <div
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-[3px] border border-bp-line",
        large ? "aspect-[4/3] w-full" : "size-12",
      )}
      style={{ background: `linear-gradient(135deg, ${file.colors[0]}, ${file.colors[1]})` }}
      aria-hidden="true"
    >
      <div className="bg-grid absolute inset-0 opacity-30" />
      {file.url && file.type === "image" ? (
        <img src={file.url} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
      ) : (
        <Icon className={cn("text-paper-dark/90", large ? "size-8" : "size-5")} strokeWidth={1.5} />
      )}
      <span className="absolute bottom-1.5 right-1.5 rounded-[2px] bg-blueprint/70 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.06em] text-mist">
        {file.ext}
      </span>
    </div>
  );
}

/** One file in grid or list form: thumb, name, meta, actions. */
export function FileCard({
  file,
  view,
  onPreview,
  onDownload,
  onRename,
  onDelete,
}: {
  file: FileItem;
  view: ViewMode;
  onPreview: () => void;
  onDownload: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const actions = (
    <div className="flex items-center gap-1.5">
      <IconAction label="Preview" onClick={onPreview}>
        <Eye className="size-3.5" strokeWidth={1.6} />
      </IconAction>
      <IconAction label="Download" onClick={onDownload}>
        <Download className="size-3.5" strokeWidth={1.6} />
      </IconAction>
      <IconAction label="Rename" onClick={onRename}>
        <Pencil className="size-3.5" strokeWidth={1.6} />
      </IconAction>
      <IconAction label="Delete" onClick={onDelete}>
        <Trash2 className="size-3.5" strokeWidth={1.6} />
      </IconAction>
    </div>
  );

  const meta = (
    <p className="font-mono text-[10px] uppercase tracking-[0.04em] text-muted-foreground">
      {file.type} · {formatMb(file.sizeMb)} · {formatDateTime(file.createdAt)}
    </p>
  );

  if (view === "grid") {
    return (
      <article className="rounded-[4px] border bg-card p-3">
        <button type="button" onClick={onPreview} className="block w-full" aria-label={`Preview ${file.name}`}>
          <Thumb file={file} large />
        </button>
        <p className="mt-2.5 truncate text-sm font-medium">
          {file.name}
          <span className="text-muted-foreground">.{file.ext}</span>
        </p>
        <div className="mt-1">{meta}</div>
        <div className="mt-3 flex justify-start border-t pt-2.5">{actions}</div>
      </article>
    );
  }

  return (
    <article className="flex items-center gap-3.5 rounded-[4px] border bg-card p-3 transition-colors hover:bg-accent/40">
      <button type="button" onClick={onPreview} aria-label={`Preview ${file.name}`}>
        <Thumb file={file} />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {file.name}
          <span className="text-muted-foreground">.{file.ext}</span>
        </p>
        <div className="mt-0.5">{meta}</div>
      </div>
      <div className="shrink-0">{actions}</div>
    </article>
  );
}
