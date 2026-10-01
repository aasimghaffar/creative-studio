export interface CreditUsageByTool {
  toolId: string;
  label: string;
  credits: number;
}

/** Where this cycle's credits went, per studio. */
export const mockCreditUsage: CreditUsageByTool[] = [
  { toolId: "logo", label: "Logo Generator", credits: 424 },
  { toolId: "avatar", label: "Avatar Generator", credits: 128 },
  { toolId: "tattoo", label: "Tattoo Generator", credits: 282 },
  { toolId: "image", label: "Image Generator", credits: 26 },
];
