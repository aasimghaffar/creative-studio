import { useEffect, useState } from "react";
import { PanelCard } from "@/components/common/panel-card";
import { Switch } from "@/components/ui/switch";
import { SettingRow } from "./setting-row";
import { fetchSettings, saveNotifications, type ApiSettings } from "../services/settings-service";

type NotificationKey = "email_generation" | "email_billing" | "email_product" | "push_enabled";

const DEFAULTS: Pick<ApiSettings, NotificationKey> = {
  email_generation: true,
  email_billing: true,
  email_product: false,
  push_enabled: true,
};

export function NotificationsTab() {
  const [prefs, setPrefs] = useState(DEFAULTS);

  useEffect(() => {
    let cancelled = false;
    fetchSettings()
      .then((s) => {
        if (cancelled) return;
        setPrefs({
          email_generation: s.email_generation,
          email_billing: s.email_billing,
          email_product: s.email_product,
          push_enabled: s.push_enabled,
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  /** Optimistic toggle with rollback if the API rejects it. */
  const patch = (key: NotificationKey) => (value: boolean) => {
    setPrefs((p) => ({ ...p, [key]: value }));
    void saveNotifications({ [key]: value }).catch(() =>
      setPrefs((p) => ({ ...p, [key]: !value })),
    );
  };

  return (
    <div className="space-y-4">
      <PanelCard label="Email notifications">
        <SettingRow title="Generation updates" description="When batches complete or fail.">
          <Switch checked={prefs.email_generation} onCheckedChange={patch("email_generation")} aria-label="Email generation updates" />
        </SettingRow>
        <SettingRow title="Billing & credits" description="Receipts, renewals, and low-credit warnings.">
          <Switch checked={prefs.email_billing} onCheckedChange={patch("email_billing")} aria-label="Email billing updates" />
        </SettingRow>
        <SettingRow title="Product news" description="New studios and feature announcements.">
          <Switch checked={prefs.email_product} onCheckedChange={patch("email_product")} aria-label="Email product news" />
        </SettingRow>
      </PanelCard>
      <PanelCard label="Push notifications">
        <SettingRow title="Browser push" description="Real-time alerts while the app is open.">
          <Switch checked={prefs.push_enabled} onCheckedChange={patch("push_enabled")} aria-label="Push notifications" />
        </SettingRow>
      </PanelCard>
    </div>
  );
}
