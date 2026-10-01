import { useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { TabNav } from "@/components/common/tab-nav";
import { GeneralTab } from "./components/general-tab";
import { GenerationTab } from "./components/generation-tab";
import { NotificationsTab } from "./components/notifications-tab";
import { StorageTab } from "./components/storage-tab";
import { SecurityTab } from "./components/security-tab";

const TABS = [
  { id: "general", label: "General" },
  { id: "generation", label: "Generation" },
  { id: "notifications", label: "Notifications" },
  { id: "storage", label: "Storage" },
  { id: "security", label: "Privacy & Security" },
];

export function SettingsPage() {
  const [tab, setTab] = useState("general");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Account" title="Settings" description="Defaults, notifications, storage, and security for your workspace." />
      <TabNav tabs={TABS} value={tab} onChange={setTab} />
      <div className="mt-5">
        {tab === "general" && <GeneralTab />}
        {tab === "generation" && <GenerationTab />}
        {tab === "notifications" && <NotificationsTab />}
        {tab === "storage" && <StorageTab />}
        {tab === "security" && <SecurityTab />}
      </div>
    </div>
  );
}
