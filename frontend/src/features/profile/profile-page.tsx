import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Loader2 } from "lucide-react";
import { COUNTRIES, LANGUAGES, TIMEZONES } from "@/mocks";
import { useAuthStore, useAuthUser } from "@/features/auth";
import { ImageUpload } from "@/features/studio-kit";
import { ApiError } from "@/lib/api-client";
import { PageHeader } from "@/components/common/page-header";
import { PanelCard } from "@/components/common/panel-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { deleteProfilePhoto, fetchProfile, updateProfile, uploadProfilePhoto } from "./services/profile-service";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  company: z.string(),
  country: z.string(),
  timezone: z.string(),
  language: z.string(),
});

type ProfileValues = z.infer<typeof profileSchema>;

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ProfilePage() {
  const user = useAuthUser();
  const updateUser = useAuthStore((s) => s.updateUser);
  const [photo, setPhoto] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      company: "",
      country: COUNTRIES[0] ?? "",
      timezone: TIMEZONES[0] ?? "",
      language: LANGUAGES[0] ?? "",
    },
  });

  // Real data in, mock out: hydrate the form from GET /profile.
  useEffect(() => {
    let cancelled = false;

    fetchProfile()
      .then((profile) => {
        if (cancelled) return;
        form.reset({
          name: profile.name,
          email: profile.email,
          company: profile.company ?? "",
          country: profile.country ?? COUNTRIES[0] ?? "",
          timezone: profile.timezone,
          language: profile.language,
        });
        setAvatarUrl(profile.avatar_url);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof ApiError ? `Could not load your profile (${e.status}): ${e.message}` : "Could not load your profile. Is the backend running?");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Selecting a file uploads it immediately.
  useEffect(() => {
    if (!photo) return;
    let cancelled = false;
    setError(null);

    uploadProfilePhoto(photo)
      .then((url) => {
        if (cancelled) return;
        setAvatarUrl(url);
        // Refresh the header bubble immediately.
        useAuthStore.getState().updateUser({ avatarUrl: url });
        setPhoto(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setPhoto(null);
        setError(e instanceof ApiError ? e.message : "Could not upload the photo.");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo]);

  function removePhoto() {
    setError(null);
    const previous = avatarUrl;
    setAvatarUrl(null);
    useAuthStore.getState().updateUser({ avatarUrl: undefined });
    void deleteProfilePhoto().catch(() => {
      setAvatarUrl(previous);
      setError("Could not remove the photo. Please try again.");
    });
  }

  async function onSubmit(values: ProfileValues) {
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const fresh = await updateProfile(values);
      updateUser({ name: fresh.name, email: fresh.email });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  const selectField = (name: "country" | "timezone" | "language", label: string, options: string[]) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <NativeSelect value={field.value} onChange={field.onChange} options={options} aria-label={label} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Account" title="Profile" description="How you appear across the studio and on shared work." />

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* Profile photo card */}
        <PanelCard label="Profile photo">
          <div className="flex flex-col items-center gap-4">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="size-20 rounded-full object-cover" />
            ) : (
              <span className="grid size-20 place-items-center rounded-full bg-teal text-xl font-semibold text-white">
                {initials(form.watch("name") || "A")}
              </span>
            )}
            <div className="w-full">
              <ImageUpload label="Upload new photo" file={photo} onChange={setPhoto} hint="PNG / JPG · max 2 MB" />
              {avatarUrl && (
                <button
                  type="button"
                  onClick={removePhoto}
                  className="mt-2 w-full font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground underline underline-offset-2 hover:text-destructive"
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>
        </PanelCard>

        {/* Details form */}
        <PanelCard label="Details">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input className="rounded-[3px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" className="rounded-[3px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input className="rounded-[3px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-3">
                {selectField("country", "Country", COUNTRIES)}
                {selectField("timezone", "Time zone", TIMEZONES)}
                {selectField("language", "Language", LANGUAGES)}
              </div>
              {error && <p className="text-xs leading-relaxed text-destructive">{error}</p>}
              <div className="flex items-center gap-3 pt-1">
                <Button type="submit" size="sm" disabled={saving} className="gap-1.5">
                  {saving && <Loader2 className="size-3.5 animate-spin" />}
                  {saving ? "Saving…" : "Save changes"}
                </Button>
                {saved && (
                  <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-teal">
                    <Check className="size-3.5" strokeWidth={2} />
                    Saved
                  </span>
                )}
              </div>
            </form>
          </Form>
        </PanelCard>
      </div>
    </div>
  );
}
