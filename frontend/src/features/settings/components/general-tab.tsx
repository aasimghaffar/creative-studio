import { useEffect, useState } from "react";
import { useTheme } from "@/app/providers/theme-provider";
import { ChipGroup } from "@/features/studio-kit";
import { TIMEZONES } from "@/mocks";
import { PanelCard } from "@/components/common/panel-card";
import { NativeSelect } from "@/components/ui/native-select";
import { SettingRow } from "./setting-row";
import { fetchSettings, saveGeneral } from "../services/settings-service";

const THEMES = ["Light", "Dark", "System"] as const;

export function GeneralTab() {
  const { theme, setTheme } = useTheme();
  const [timezone, setTimezone] = useState(TIMEZONES[0] ?? "Europe/London");

  useEffect(() => {
    let cancelled = false;
    fetchSettings()
      .then((s) => {
        if (cancelled) return;
        setTimezone(s.timezone);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  /** Theme applies instantly (provider) and persists to the backend. */
  function changeTheme(value: string) {
    const next = value.toLowerCase() as "light" | "dark" | "system";
    setTheme(next);
    void saveGeneral({ theme: next }).catch(() => undefined);
  }


  function changeTimezone(value: string) {
    setTimezone(value);
    void saveGeneral({ timezone: value }).catch(() => undefined);
  }

  return (
    <PanelCard label="General">
      <SettingRow title="Theme" description="Paper (light) or blueprint (dark) — applies instantly.">
        <ChipGroup
          options={[...THEMES]}
          value={theme.charAt(0).toUpperCase() + theme.slice(1)}
          onChange={changeTheme}
        />
      </SettingRow>
      <SettingRow title="Time zone" description="Used for timestamps and reset times.">
        <NativeSelect value={timezone} onChange={changeTimezone} options={TIMEZONES} className="w-56" aria-label="Time zone" />
      </SettingRow>
    </PanelCard>
  );
}
