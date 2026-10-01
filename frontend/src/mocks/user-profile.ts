export interface UserProfile {
  name: string;
  email: string;
  company: string;
  country: string;
  timezone: string;
  language: string;
}

export const mockUserProfile: UserProfile = {
  name: "Demo User",
  email: "demo@prism.studio",
  company: "CubixSol",
  country: "United Kingdom",
  timezone: "Europe/London",
  language: "English",
};

export const COUNTRIES = ["United Kingdom", "United States", "Pakistan", "Germany", "France", "UAE", "Australia", "Canada", "Japan"];
export const TIMEZONES = ["Europe/London", "America/New_York", "America/Los_Angeles", "Asia/Karachi", "Asia/Dubai", "Europe/Berlin", "Asia/Tokyo", "Australia/Sydney"];
export const LANGUAGES = ["English", "Urdu", "German", "French", "Spanish", "Japanese"];
