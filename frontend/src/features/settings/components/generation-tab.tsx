import { useEffect, useState } from "react";
import { ChipGroup } from "@/features/studio-kit";
import { DEFAULT_STYLES, IMAGE_SIZES } from "@/mocks";
import { PanelCard } from "@/components/common/panel-card";
import { Switch } from "@/components/ui/switch";
import { SettingRow } from "./setting-row";
import { fetchSettings, saveGeneration } from "../services/settings-service";

export function GenerationTab() {
  const [size, setSize] = useState(IMAGE_SIZES[1] ?? "1024 px");
  const [style, setStyle] = useState(DEFAULT_STYLES[0] ?? "Minimal");
  const [autoSave, setAutoSave] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchSettings()
      .then((s) => {
        if (cancelled) return;
        setSize(s.default_image_size);
        setStyle(s.default_style);
        setAutoSave(s.auto_save_history);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  function changeSize(value: string) {
    setSize(value);
    void saveGeneration({ default_image_size: value }).catch(() => undefined);
  }

  function changeStyle(value: string) {
    setStyle(value);
    void saveGeneration({ default_style: value }).catch(() => undefined);
  }

  function changeAutoSave(value: boolean) {
    setAutoSave(value);
    void saveGeneration({ auto_save_history: value }).catch(() => setAutoSave(!value));
  }

  return (
    <PanelCard label="Generation defaults">
      <SettingRow title="Default image size" description="Applied to new generations unless overridden.">
        <ChipGroup options={IMAGE_SIZES} value={size} onChange={changeSize} />
      </SettingRow>
      <SettingRow title="Default style" description="Pre-selected style in every studio.">
        <ChipGroup options={DEFAULT_STYLES} value={style} onChange={changeStyle} />
      </SettingRow>
      <SettingRow title="Auto-save history" description="Keep every generation in Recent History automatically.">
        <Switch checked={autoSave} onCheckedChange={changeAutoSave} aria-label="Auto-save history" />
      </SettingRow>
    </PanelCard>
  );
}
