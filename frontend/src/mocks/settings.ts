export interface AppSettings {
  language: string;
  timezone: string;
  generation: {
    defaultSize: string;
    defaultStyle: string;
    autoSaveHistory: boolean;
  };
  notifications: {
    emailGeneration: boolean;
    emailBilling: boolean;
    emailProduct: boolean;
    push: boolean;
  };
  storage: {
    uploadLimitMb: number;
    allowedTypes: string[];
  };
  security: {
    twoFactorEnabled: boolean;
  };
}

export const IMAGE_SIZES = ["512 px", "768 px", "1024 px", "2048 px"];
export const DEFAULT_STYLES = ["Minimal", "Bold", "Classic", "Playful", "3D", "Sketch"];

export const mockSettings: AppSettings = {
  language: "English",
  timezone: "Europe/London",
  generation: {
    defaultSize: "1024 px",
    defaultStyle: "Minimal",
    autoSaveHistory: true,
  },
  notifications: {
    emailGeneration: true,
    emailBilling: true,
    emailProduct: false,
    push: true,
  },
  storage: {
    uploadLimitMb: 250,
    allowedTypes: ["PNG", "JPG", "SVG", "MP4", "WAV", "PDF"],
  },
  security: {
    twoFactorEnabled: false,
  },
};

export interface ActiveSession {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  current: boolean;
}

export const mockActiveSessions: ActiveSession[] = [
  { id: "s1", device: "Chrome · Windows 11", location: "Lahore, PK", lastActive: "2026-07-10T09:58:00", current: true },
  { id: "s2", device: "Safari · iPhone 15", location: "Lahore, PK", lastActive: "2026-07-09T22:14:00", current: false },
  { id: "s3", device: "Firefox · Ubuntu", location: "London, UK", lastActive: "2026-07-05T11:03:00", current: false },
];
