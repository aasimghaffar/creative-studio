import { useEffect, useState } from "react";
import type { StorageUsage } from "@/mocks";
import { PanelCard } from "@/components/common/panel-card";
import { StorageProgress } from "@/components/common/storage-progress";
import { Badge } from "@/components/ui/badge";
import { SettingRow } from "./setting-row";
import { fetchStorage, type ApiStorage } from "../services/settings-service";

const EMPTY: StorageUsage = {
  usedGb: 0,
  totalGb: 10,
  breakdown: [
    { label: "Images", sizeGb: 0, colorClass: "bg-brass" },
    { label: "Video", sizeGb: 0, colorClass: "bg-teal" },
    { label: "Audio", sizeGb: 0, colorClass: "bg-mist" },
    { label: "Documents", sizeGb: 0, colorClass: "bg-brass-deep" },
  ],
};

function toUsage(api: ApiStorage): StorageUsage {
  return {
    usedGb: api.used_gb,
    totalGb: api.limit_gb,
    breakdown: [
      { label: "Images", sizeGb: api.breakdown.images, colorClass: "bg-brass" },
      { label: "Video", sizeGb: api.breakdown.videos, colorClass: "bg-teal" },
      { label: "Audio", sizeGb: api.breakdown.audio, colorClass: "bg-mist" },
      { label: "Documents", sizeGb: api.breakdown.documents, colorClass: "bg-brass-deep" },
    ],
  };
}

export function StorageTab() {
  const [usage, setUsage] = useState<StorageUsage>(EMPTY);
  const [uploadLimitMb, setUploadLimitMb] = useState(250);
  const [allowedTypes, setAllowedTypes] = useState<string[]>(["PNG", "JPG", "SVG", "MP4", "WAV", "PDF"]);

  useEffect(() => {
    let cancelled = false;
    fetchStorage()
      .then((api) => {
        if (cancelled) return;
        setUsage(toUsage(api));
        setUploadLimitMb(api.rules.upload_limit_mb);
        setAllowedTypes(api.rules.allowed_types);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      <PanelCard label="Storage usage">
        <StorageProgress storage={usage} />
      </PanelCard>
      <PanelCard label="Upload rules">
        <SettingRow title="Upload limit" description="Maximum size per file on your plan.">
          <span className="font-mono text-sm tabular-nums">{uploadLimitMb} MB</span>
        </SettingRow>
        <SettingRow title="Allowed file types" description="Formats accepted across the studios.">
          <div className="flex flex-wrap justify-end gap-1.5">
            {allowedTypes.map((type) => (
              <Badge key={type} variant="secondary" className="font-mono text-[10px]">
                {type}
              </Badge>
            ))}
          </div>
        </SettingRow>
      </PanelCard>
    </div>
  );
}
