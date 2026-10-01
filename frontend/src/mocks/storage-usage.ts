export interface StorageBreakdownEntry {
  label: string;
  sizeGb: number;
  colorClass: string;
}

export interface StorageUsage {
  usedGb: number;
  totalGb: number;
  breakdown: StorageBreakdownEntry[];
}

export const mockStorageUsage: StorageUsage = {
  usedGb: 34.2,
  totalGb: 100,
  breakdown: [
    { label: "Images", sizeGb: 18.4, colorClass: "bg-brass" },
    { label: "Video", sizeGb: 12.1, colorClass: "bg-teal" },
    { label: "Audio", sizeGb: 2.4, colorClass: "bg-mist" },
    { label: "Documents", sizeGb: 1.3, colorClass: "bg-brass-deep" },
  ],
};
