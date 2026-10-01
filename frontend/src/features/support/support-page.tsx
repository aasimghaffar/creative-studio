import { useEffect, useState } from "react";
import { ApiError, apiRequest } from "@/lib/api-client";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Check, Loader2, Plus, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChipGroup, Field } from "@/features/studio-kit";
import { PageHeader } from "@/components/common/page-header";
import { Modal } from "@/components/common/modal";
import { PanelCard } from "@/components/common/panel-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { helpCenterLinks, supportTopics } from "./data";
import { fetchPublicFaqs, type FaqItem } from "./services/content-service";

export function SupportPage() {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchPublicFaqs()
      .then((data) => {
        if (!cancelled) setFaqs(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [topic, setTopic] = useState(supportTopics[0] ?? "General question");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [guide, setGuide] = useState<(typeof helpCenterLinks)[number] | null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const TOPIC_MAP: Record<string, string> = {
    "General question": "general",
    "Report a bug": "bug",
    "Feature request": "feature",
    "Billing issue": "billing",
  };

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError(null);

    try {
      await apiRequest("/v1/support/tickets", {
        method: "POST",
        body: JSON.stringify({
          subject,
          message,
          topic: TOPIC_MAP[topic] ?? "general",
        }),
      });
      setSubject("");
      setMessage("");
      setSent(true);
      window.setTimeout(() => setSent(false), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send your message. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Support"
        title="Help & Support"
        description="Docs first, humans close behind — a person answers within a day."
      />

      {/* Help center — each card opens its guide */}
      <div className="grid gap-4 sm:grid-cols-3">
        {helpCenterLinks.map((link) => (
          <button
            key={link.title}
            type="button"
            onClick={() => setGuide(link)}
            className="group rounded-[4px] border bg-card p-5 text-left transition-colors hover:bg-accent/40"
          >
            <span className="grid size-9 place-items-center rounded-full border text-foreground">
              <link.icon className="size-4" strokeWidth={1.6} />
            </span>
            <p className="mt-3 flex items-center gap-1.5 text-sm font-medium">
              {link.title}
              <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{link.description}</p>
          </button>
        ))}
      </div>

      {/* Guide reader */}
      <Modal open={guide !== null} onClose={() => setGuide(null)} title={guide?.title ?? ""} className="max-w-lg">
        {guide && (
          <div className="p-5">
            <p className="text-[13px] text-muted-foreground">{guide.description}</p>
            <ul className="mt-4 space-y-3">
              {guide.guide.map((line) => (
                <li key={line} className="flex gap-2.5 text-sm leading-relaxed">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brass" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* FAQs */}
        <PanelCard label="FAQs" contentClassName="p-0">
          <div className="divide-y">
            {faqs.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={faq.id}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left"
                  >
                    <span className={cn("text-sm", isOpen ? "font-medium" : "text-foreground/85")}>
                      {faq.question}
                    </span>
                    <motion.span animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.2 }}>
                      <Plus className={cn("size-4", isOpen ? "text-brass" : "text-muted-foreground")} strokeWidth={1.6} />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.21, 0.68, 0.32, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-4 text-[13px] leading-relaxed text-muted-foreground">{faq.answer}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </PanelCard>

        {/* Contact / bug / feature form */}
        <PanelCard label="Contact support">
          <form onSubmit={submit} className="flex h-full flex-col gap-4">
            <Field label="Topic">
              <ChipGroup options={supportTopics} value={topic} onChange={setTopic} />
            </Field>
            <Field label="Subject">
              <Input
                required
                placeholder="Short summary…"
                className="rounded-[3px]"
                aria-label="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </Field>
            <Field label="Message">
              <textarea
                required
                placeholder={
                  topic === "Report a bug"
                    ? "What happened, what you expected, and steps to reproduce…"
                    : topic === "Feature request"
                      ? "What would you build with it? The more specific, the better…"
                      : "How can we help?"
                }
                className="min-h-28 w-full resize-y rounded-[3px] border bg-background px-3 py-2.5 text-[13.5px] placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </Field>
            {error && <p className="text-xs leading-relaxed text-destructive">{error}</p>}
            <div className="mt-auto flex items-center gap-3">
              <Button type="submit" size="sm" disabled={sending} className="gap-1.5">
                {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                {sending ? "Sending…" : "Send message"}
              </Button>
              {sent && (
                <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-teal">
                  <Check className="size-3.5" strokeWidth={2} />
                  Sent — we'll reply by email
                </span>
              )}
            </div>
          </form>
        </PanelCard>
      </div>
    </div>
  );
}
