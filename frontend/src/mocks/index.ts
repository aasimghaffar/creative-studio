/** Central mock-data layer. Replace with API calls when the backend lands. */
export { GENERATION_STATUSES, STATUS_META } from "./generation-status";
export { mockUserCredits, CREDITS_PER_DRAFT } from "./user-credits";
export { mockPromptTemplates } from "./prompt-templates";
export { mockToolHistory } from "./tool-history";
export { mockGeneratedImages } from "./generated-images";
export { mockFiles, type FileItem, type FileType } from "./files";
export { mockFavoriteImages, mockFavoritePrompts, type FavoritePrompt } from "./favorites";
export { mockNotifications, CATEGORY_META, type NotificationItem, type NotificationCategory } from "./notifications";
export { mockPlans, type SubscriptionPlan } from "./subscription-plans";
export { mockPaymentHistory, type PaymentRecord, type PaymentStatus } from "./payment-history";
export { mockCreditUsage, type CreditUsageByTool } from "./billing";
export { mockUserProfile, COUNTRIES, TIMEZONES, LANGUAGES, type UserProfile } from "./user-profile";
export { mockSettings, mockActiveSessions, IMAGE_SIZES, DEFAULT_STYLES, type AppSettings, type ActiveSession } from "./settings";
export { mockStorageUsage, type StorageUsage } from "./storage-usage";
