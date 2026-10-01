import { apiRequest } from "@/lib/api-client";

/** Admin → System Settings API (Email / Payment / Security / Notifications / General). */

/* ---------------- Email ---------------- */

export interface SmtpConfig {
  host: string;
  port: number;
  encryption: string;
  username: string;
  password_set: boolean;
  from_name: string;
  from_email: string;
}

export interface ApiEmailTemplate {
  id: number;
  slug: string;
  name: string;
  subject: string;
  body: string;
  is_enabled: boolean;
  updated_at: string;
}

export function fetchEmailSettings(): Promise<{ smtp: SmtpConfig; templates: ApiEmailTemplate[] }> {
  return apiRequest<{ smtp: SmtpConfig; templates: ApiEmailTemplate[] }>("/v1/admin/email");
}

export function saveSmtp(payload: {
  host: string;
  port: number;
  encryption: string;
  username: string;
  password: string;
  from_name: string;
  from_email: string;
}): Promise<unknown> {
  return apiRequest("/v1/admin/email/smtp", { method: "PUT", body: JSON.stringify(payload) });
}

export function sendTestEmail(to?: string): Promise<unknown> {
  return apiRequest("/v1/admin/email/test", { method: "POST", body: JSON.stringify({ to: to ?? "" }) });
}

export function saveEmailTemplate(
  id: number,
  payload: { subject: string; body: string; is_enabled: boolean },
): Promise<ApiEmailTemplate> {
  return apiRequest<ApiEmailTemplate>(`/v1/admin/email/templates/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/* ---------------- Payment ---------------- */

export interface ApiPaymentGateway {
  id: number;
  slug: "stripe" | "paypal";
  name: string;
  enabled: boolean;
  environment: "sandbox" | "production";
  fields_set: Record<string, boolean>;
}

export interface PaymentSettings {
  gateways: ApiPaymentGateway[];
  currency: string;
  currencies: string[];
  invoice_prefix: string;
  invoice_auto: boolean;
}

export function fetchPaymentSettings(): Promise<PaymentSettings> {
  return apiRequest<PaymentSettings>("/v1/admin/payment-settings");
}

export function savePaymentGateway(
  id: number,
  payload: { credentials?: Record<string, string>; enable?: boolean; enabled?: boolean; environment?: string },
): Promise<ApiPaymentGateway[]> {
  return apiRequest<{ gateways: ApiPaymentGateway[] }>(`/v1/admin/payment-gateways/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }).then((d) => d.gateways);
}

export function savePaymentSettings(payload: {
  currency: string;
  invoice_prefix: string;
  invoice_auto: boolean;
}): Promise<unknown> {
  return apiRequest("/v1/admin/payment-settings", { method: "PUT", body: JSON.stringify(payload) });
}

/* ---------------- Security ---------------- */

export interface SecuritySettings {
  require_email_verification: boolean;
  google_login: boolean;
  two_factor: boolean;
  recaptcha_enabled: boolean;
  recaptcha_site: string;
  recaptcha_secret_set: boolean;
}

export interface ApiSecurityEvent {
  id: number;
  event: string;
  actor: string;
  ip: string;
  tone: "default" | "teal" | "brass" | "destructive";
  created_at: string;
}

export function fetchSecurity(): Promise<{ settings: SecuritySettings; events: ApiSecurityEvent[] }> {
  return apiRequest<{ settings: SecuritySettings; events: ApiSecurityEvent[] }>("/v1/admin/security");
}

export function saveSecurity(payload: {
  require_email_verification: boolean;
  google_login: boolean;
  two_factor: boolean;
  recaptcha_enabled: boolean;
  recaptcha_site: string;
  recaptcha_secret: string;
}): Promise<unknown> {
  return apiRequest("/v1/admin/security", { method: "PUT", body: JSON.stringify(payload) });
}

/* ---------------- Notifications ---------------- */

export interface ApiNotificationEvent {
  id: string;
  label: string;
  admin: boolean;
  user: boolean;
}

export function fetchNotificationSettings(): Promise<ApiNotificationEvent[]> {
  return apiRequest<{ events: ApiNotificationEvent[] }>("/v1/admin/notification-settings").then((d) => d.events);
}

export function saveNotificationSettings(events: ApiNotificationEvent[]): Promise<unknown> {
  return apiRequest("/v1/admin/notification-settings", {
    method: "PUT",
    body: JSON.stringify({ events }),
  });
}

/* ---------------- General ---------------- */

export interface GeneralSettings {
  site_name: string;
  contact_email: string;
  time_zone: string;
  currency: string;
  maintenance_mode: boolean;
  timezones: string[];
}

export function fetchGeneralSettings(): Promise<GeneralSettings> {
  return apiRequest<GeneralSettings>("/v1/admin/general");
}

export function saveGeneralSettings(payload: {
  site_name: string;
  contact_email: string;
  time_zone: string;
  maintenance_mode: boolean;
}): Promise<GeneralSettings> {
  return apiRequest<GeneralSettings>("/v1/admin/general", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function testPaymentGateway(id: number): Promise<{ ok: boolean; message: string }> {
  return apiRequest(`/v1/admin/payment-gateways/${id}/test`, { method: "POST" });
}
