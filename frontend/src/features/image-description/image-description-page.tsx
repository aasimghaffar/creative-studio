import { useEffect, useRef, useState } from "react";
import { Check, Copy, ImageUp, Loader2, Sparkles, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { PanelCard } from "@/components/common/panel-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, apiRequest } from "@/lib/api-client";
import { invalidateCreditsSummary, useCreditsSummary } from "@/lib/use-credits-summary";
import { formatDateTime } from "@/features/studio-kit/lib";
import { cn } from "@/lib/utils";

interface DescribeHistoryRow {
  id: number;
  prompt: string;
  description: string;
  status: string;
  credits_used: number;
  created_at: string;
}

/** Image Description — image IN, rich text OUT. Same credits + admin config. */
export function ImageDescriptionPage() {
  const [imageB64, setImageB64] = useState<string | null>(null);
  const [mime, setMime] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [history, setHistory] = useState<DescribeHistoryRow[]>([]);
  const [cost, setCost] = useState(0);
  const [copied, setCopied] = useState(false);
  const { balance, unlimited } = useCreditsSummary();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    invalidateCreditsSummary();
    apiRequest<{ tool: { credits_per_generation: number } }>("/v1/ai/image-description/config")
      .then((d) => setCost(d.tool.credits_per_generation))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not load the tool config."));
    apiRequest<{ history: DescribeHistoryRow[] }>("/v1/ai/image-description/history")
      .then((d) => setHistory(d.history))
      .catch(() => undefined);
  }, []);

  function pickFile(file: File | null) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Only PNG, JPG, or WEBP images are supported.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      setPreview(url);
      setImageB64(url.split(",")[1] ?? null);
      setMime(file.type);
    };
    reader.readAsDataURL(file);
  }

  async function describe() {
    if (!imageB64 || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await apiRequest<{ generation_id: number; description: string; credits_used: number }>(
        "/v1/ai/image-description/generate",
        { method: "POST", body: JSON.stringify({ image: imageB64, mime, note }) },
      );
      setResult(res.description);
      invalidateCreditsSummary();
      setHistory((h) => [
        { id: res.generation_id, prompt: note || "Describe this image", description: res.description, status: "completed", credits_used: res.credits_used, created_at: new Date().toISOString() },
        ...h,
      ].slice(0, 20));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Description failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function copyText(text: string) {
    void navigator.clipboard?.writeText(text).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function remove(id: number) {
    const previous = history;
    setHistory((h) => h.filter((r) => r.id !== id));
    void apiRequest(`/v1/ai/image-description/${id}`, { method: "DELETE" }).catch(() => setHistory(previous));
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Vision → Text"
        title="Image Description"
        description={error ?? "Upload an image and get a clear, detailed description — great for alt text, catalogs, and prompts."}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <PanelCard label="Your image">
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative grid aspect-video w-full place-items-center overflow-hidden rounded-[3px] border border-dashed transition-colors hover:bg-accent"
            aria-label="Upload image"
          >
            {preview ? (
              <img src={preview} alt="Upload preview" className="absolute inset-0 size-full object-contain" />
            ) : (
              <span className="flex flex-col items-center gap-2 text-muted-foreground">
                <ImageUp className="size-6" />
                <span className="text-[13px]">Click to upload — PNG, JPG, or WEBP up to 8 MB</span>
              </span>
            )}
          </button>
          <div className="mt-3">
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional focus — e.g. 'describe the colors and mood'…"
              className="rounded-[3px] text-[13px]"
              aria-label="Focus note"
            />
          </div>
          <Button className="mt-3 w-full gap-1.5" onClick={describe} disabled={!imageB64 || busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {busy ? "Describing…" : "Describe image"}
          </Button>
          <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">
            {unlimited ? "Unlimited plan — no credits used" : `cost ~${cost} credits · ${balance.toLocaleString()} left`}
          </p>
        </PanelCard>

        <PanelCard label="Description">
          {result ? (
            <>
              <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed">{result}</p>
              <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={() => copyText(result)}>
                {copied ? <Check className="size-3.5 text-teal" /> : <Copy className="size-3.5" />}
                {copied ? "Copied" : "Copy text"}
              </Button>
            </>
          ) : (
            <p className="text-[13px] text-muted-foreground">
              {busy ? "Reading the image…" : "The description will appear here."}
            </p>
          )}
        </PanelCard>
      </div>

      <div className="mt-4">
        <PanelCard label={`Recent descriptions (${history.length})`}>
          {history.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">Nothing yet — your descriptions will be listed here.</p>
          ) : (
            <ul className="divide-y">
              {history.map((row) => (
                <li key={row.id} className="flex items-start gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className={cn("line-clamp-2 text-[13px] leading-relaxed", row.status === "failed" && "text-destructive")}>
                      {row.description || "(failed)"}
                    </p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.04em] text-muted-foreground">
                      {formatDateTime(row.created_at.replace(" ", "T"))} ·{" "}
                      {row.status === "failed" ? "credits refunded" : `${row.credits_used} credits`}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="icon" variant="ghost" aria-label="Copy" onClick={() => copyText(row.description)}>
                      <Copy className="size-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => remove(row.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>
      </div>
    </div>
  );
}
