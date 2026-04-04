// ---- Request Types ----

export interface Attachment {
  filename: string;
  content: string;
  content_type: string;
}

export interface SendEmailParams {
  from: string;
  /** Single recipient or array of recipients. */
  to: string | string[];
  /** Required unless `template_alias` is provided. */
  subject?: string;
  cc?: string[];
  bcc?: string[];
  reply_to?: string;
  html_body?: string;
  text_body?: string;
  template_alias?: string;
  template_data?: Record<string, unknown>;
  headers?: Record<string, string>;
  tags?: string[];
  metadata?: Record<string, string>;
  idempotency_key?: string;
  attachments?: Attachment[];
}

export interface SendBatchParams {
  emails: SendEmailParams[];
}

export interface CreateTemplateParams {
  alias: string;
  name: string;
  subject: string;
  html_body?: string;
  text_body?: string;
}

export interface UpdateTemplateParams {
  name?: string;
  subject?: string;
  html_body?: string;
  text_body?: string;
}

export interface CreateWebhookParams {
  url: string;
  events: WebhookEventType[];
}

export interface UpdateWebhookParams {
  url: string;
  events: WebhookEventType[];
  is_active: boolean;
}

export interface CreateContactListParams {
  name: string;
  description?: string;
  double_opt_in?: boolean;
}

export interface UpdateContactListParams {
  name: string;
  description?: string;
  double_opt_in: boolean;
}

export interface AddContactParams {
  email: string;
  metadata?: Record<string, string>;
}

export interface BulkAddContactsParams {
  contacts: { email: string; metadata?: Record<string, string> }[];
}

export interface ListContactsParams extends ListParams {
  status?: string;
}

export interface AnalyticsQuery {
  period?: "7d" | "30d" | "90d";
  from?: string;
  to?: string;
}

export interface TimeseriesQuery extends AnalyticsQuery {
  metrics?: string;
}

export interface DomainAnalyticsQuery extends AnalyticsQuery {
  limit?: number;
}

export interface ListParams {
  page?: number;
  per_page?: number;
}

export interface ListEmailsParams extends ListParams {
  status?: EmailStatus;
}

// ---- Response Types ----

export interface SendEmailResponse {
  id: string;
  message_id: string;
  status: EmailStatus;
  to: string;
  sandbox: boolean;
  scheduled_at: string | null;
  created_at: string;
}

export interface BatchError {
  index: number;
  error: string;
}

export interface SendBatchResponse {
  data: SendEmailResponse[];
  errors: BatchError[];
}

export type EmailStatus =
  | "queued"
  | "processing"
  | "sent"
  | "delivered"
  | "bounced"
  | "failed"
  | "rejected";

export interface Email {
  id: string;
  account_id: string;
  domain_id: string | null;
  message_id: string;
  from_address: string;
  to_address: string;
  cc: string[] | null;
  bcc: string[] | null;
  reply_to: string | null;
  subject: string;
  html_body: string | null;
  text_body: string | null;
  template_id: string | null;
  template_data: Record<string, unknown> | null;
  headers: Record<string, string>;
  tags: string[];
  metadata: Record<string, string>;
  status: EmailStatus;
  attempts: number;
  max_attempts: number;
  error_message: string | null;
  smtp_response: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
}

export type EmailEventType =
  | "queued"
  | "processing"
  | "sent"
  | "delivered"
  | "bounced"
  | "deferred"
  | "opened"
  | "clicked"
  | "complained"
  | "unsubscribed";

export interface EmailDetail {
  email: Email;
  events: EmailEvent[];
}

export interface EmailEvent {
  id: string;
  email_id: string;
  account_id: string;
  event_type: EmailEventType;
  bounce_type: string | null;
  bounce_category: string | null;
  remote_mta: string | null;
  diagnostic_code: string | null;
  user_agent: string | null;
  ip_address: string | null;
  link_url: string | null;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
}

export interface Template {
  id: string;
  account_id: string;
  alias: string;
  name: string;
  subject: string;
  html_body: string | null;
  text_body: string | null;
  created_at: string;
  updated_at: string;
}

export interface Domain {
  id: string;
  account_id: string;
  domain: string;
  dkim_selector: string;
  dkim_public_key: string;
  spf_verified: boolean;
  dkim_verified: boolean;
  dmarc_verified: boolean;
  return_path_verified: boolean;
  mx_verified: boolean;
  inbound_enabled: boolean;
  mx_verified_at: string | null;
  dns_records: Record<string, DnsRecord>;
  verified_at: string | null;
  tracking_domain: string | null;
  tracking_domain_verified: boolean;
  tracking_domain_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DnsRecord {
  type: string;
  host: string;
  value: string;
  priority?: number;
}

export interface VerificationCheck {
  verified: boolean;
  detail: string;
}

export interface DomainVerificationResult {
  domain: Domain;
  checks: Record<string, VerificationCheck>;
}

/** @deprecated Use DomainVerificationResult instead */
export interface DomainVerification {
  domain: Domain;
  checks: Record<string, VerificationCheck>;
}

export type WebhookEventType =
  | "sent"
  | "delivered"
  | "bounced"
  | "opened"
  | "clicked"
  | "complained"
  | "email.inbound";

export interface Webhook {
  id: string;
  account_id: string;
  url: string;
  events: WebhookEventType[];
  is_active: boolean;
  /** Only present on POST /v1/webhooks (create). */
  secret?: string;
  /** Present on GET/list, absent on create. */
  failure_count?: number;
  last_success_at?: string | null;
  last_failure_at?: string | null;
  last_failure_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export type SuppressionReason =
  | "hard_bounce"
  | "complaint"
  | "manual"
  | "unsubscribe";

export interface Suppression {
  id: string;
  account_id: string;
  email_address: string;
  reason: SuppressionReason;
  source_email_id: string | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface Account {
  id: string;
  name: string;
  email: string;
  plan: string;
  monthly_quota: number;
  emails_sent_this_month: number;
  quota_reset_at: string;
  created_at: string;
}

// ---- Sub-Account Types ----

export interface SubAccount {
  id: string;
  name: string;
  email: string;
  plan: string;
  monthly_quota: number;
  emails_sent_this_month: number;
  parent_account_id: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateSubAccountParams {
  name: string;
  email: string;
  password: string;
  monthly_quota: number;
}

export interface UpdateSubAccountParams {
  name?: string;
  monthly_quota?: number;
  is_active?: boolean;
}

export interface ApiErrorResponse {
  status: number;
  code: string;
  message: string;
}

// ---- API Key Types ----

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

export interface ApiKeyCreated extends ApiKey {
  /** Full API key, only returned at creation. Store it securely. */
  key: string;
}

export interface CreateApiKeyParams {
  name: string;
  scopes?: string[];
}

// ---- Newsletter Types ----

export interface Newsletter {
  id: string;
  account_id: string;
  list_id: string | null;
  subject: string;
  from_address: string;
  html_body: string | null;
  text_body: string | null;
  template_id: string | null;
  template_data: Record<string, unknown> | null;
  reply_to: string | null;
  status: string;
  operation_id: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateNewsletterParams {
  list_id: string;
  subject: string;
  from_address: string;
  html_body?: string;
  text_body?: string;
  template_id?: string;
  template_data?: Record<string, unknown>;
  reply_to?: string;
}

export interface UpdateNewsletterParams {
  list_id?: string;
  subject?: string;
  from_address?: string;
  html_body?: string;
  text_body?: string;
  template_id?: string;
  template_data?: Record<string, unknown>;
  reply_to?: string;
}

export interface NewsletterSendResponse {
  operation_id: string;
  total_recipients: number;
  message: string;
}

// ---- Email Broadcast Types ----

export interface BroadcastParams {
  contact_list_id: string;
  from_address: string;
  subject?: string;
  html_body?: string;
  text_body?: string;
  template_alias?: string;
  template_data?: Record<string, unknown>;
  reply_to?: string;
  headers?: Record<string, string>;
  tags?: string[];
  send_at?: string;
}

export interface BroadcastResponse {
  operation_id: string;
  total_recipients: number;
  message: string;
}

// ---- Email Validation Types ----

export type Deliverable = "yes" | "no" | "unknown";

export interface EmailValidation {
  email: string;
  valid: boolean;
  deliverable: Deliverable;
  is_disposable: boolean;
  is_role: boolean;
  is_free: boolean;
  mx_found: boolean;
  reason: string | null;
}

// ---- Operation Types ----

export type OperationType = "broadcast" | "newsletter_send" | "bulk_import";
export type OperationStatus = "pending" | "processing" | "completed" | "failed";

export interface Operation {
  id: string;
  account_id: string;
  operation_type: OperationType;
  status: OperationStatus;
  total_items: number;
  completed_items: number;
  failed_items: number;
  error_summary: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  expires_at: string;
}

// ---- Billing Types ----

export interface BillingPlan {
  plan: string;
  monthly_quota: number;
  max_domains: number;
  max_templates: number;
  max_webhooks: number;
  max_contact_lists: number;
  max_sub_accounts: number;
  tracking_enabled: boolean;
  price_cents: number;
  stripe_price_id: string | null;
}

export interface Subscription {
  plan: string;
  subscription_status: string;
  stripe_subscription_id: string | null;
  billing_email: string;
  trial_ends_at: string | null;
  monthly_quota: number;
  emails_sent_this_month: number;
  limits: {
    max_domains: number;
    max_templates: number;
    max_webhooks: number;
    tracking_enabled: boolean;
    price_cents: number;
  };
}

export interface CheckoutParams {
  plan: string;
  success_url: string;
  cancel_url: string;
}

export interface CheckoutResponse {
  checkout_url: string;
}

export interface PortalParams {
  return_url: string;
}

export interface PortalResponse {
  portal_url: string;
}

// ---- GDPR Types ----

export interface GdprExport {
  email_address: string;
  emails: Record<string, unknown>[];
  events: Record<string, unknown>[];
  suppressions: Record<string, unknown>[];
  unsubscribe_events: Record<string, unknown>[];
  inbound_emails: Record<string, unknown>[];
}

export interface GdprExportResponse {
  data: GdprExport;
  exported_at: string;
}

export interface GdprEraseResponse {
  data: {
    email_address: string;
    rows_deleted: number;
    message: string;
  };
  operation_id: string;
}

// ---- Tracking Domain Types ----

export interface TrackingDomainResponse {
  data: Domain;
  cname_target: string;
}

export interface TrackingDomainVerification {
  data: Domain;
  tracking_check: {
    verified: boolean;
    detail: string;
  };
}

// ---- Contact List Types ----

export interface ContactList {
  id: string;
  account_id: string;
  name: string;
  description: string | null;
  double_opt_in: boolean;
  contact_count: number;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  list_id: string;
  email: string;
  metadata: Record<string, string> | null;
  status: string;
  created_at: string;
}

export interface BulkAddContactsResponse {
  inserted: number;
  total_requested: number;
}

// ---- Analytics Types ----

export interface AnalyticsPeriod {
  from: string;
  to: string;
  period: string;
}

export interface AnalyticsSummary {
  data: {
    sent: number;
    delivered: number;
    bounced: number;
    opens: number;
    clicks: number;
    complaints: number;
    delivery_rate: number;
    open_rate: number;
    click_rate: number;
  };
  period: AnalyticsPeriod;
}

export interface TimeseriesPoint {
  date: string;
  sent?: number;
  delivered?: number;
  bounced?: number;
  opens?: number;
  clicks?: number;
}

export interface TimeseriesResponse {
  data: TimeseriesPoint[];
  period: AnalyticsPeriod;
}

export interface DomainAnalytics {
  domain: string;
  sent: number;
  delivered: number;
  bounced: number;
  open_rate: number;
  click_rate: number;
}

export interface DomainAnalyticsResponse {
  data: DomainAnalytics[];
  period: AnalyticsPeriod;
}

// ---- Webhook Types ----

export interface WebhookTestResponse {
  message: string;
  payload: Record<string, unknown>;
}

// ---- Dead Letter Types ----

export interface DeadLetter {
  id: string;
  email_id: string;
  account_id: string;
  from_address: string;
  to_address: string;
  subject: string;
  error_message: string;
  original_status: string;
  attempts: number;
  created_at: string;
}

export interface ListDeadLettersParams {
  count?: number;
}

// ---- Inbound Email Types ----

export interface InboundEmail {
  id: string;
  account_id: string;
  domain_id: string;
  from_address: string;
  to_addresses: string[];
  subject: string;
  text_body: string | null;
  html_body: string | null;
  raw_size: number;
  created_at: string;
}

// ---- Inbound Route Types ----

export interface InboundRoute {
  id: string;
  account_id: string;
  domain_id: string;
  pattern: string;
  match_type: string;
  priority: number;
  webhook_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateInboundRouteParams {
  domain_id: string;
  pattern: string;
  match_type: "exact" | "prefix" | "catch_all";
  priority?: number;
  webhook_url?: string;
}

export interface UpdateInboundRouteParams {
  pattern?: string;
  match_type?: "exact" | "prefix" | "catch_all";
  priority?: number;
  webhook_url?: string | null;
  is_active?: boolean;
}

// ---- Signup Form Types ----

export interface SignupForm {
  id: string;
  account_id: string;
  list_id: string;
  slug: string;
  title: string;
  description: string | null;
  success_message: string | null;
  redirect_url: string | null;
  custom_fields: CustomField[];
  theme: Record<string, unknown>;
  is_active: boolean;
  form_url: string;
  embed_code: string;
  created_at: string;
  updated_at: string;
}

export interface CustomField {
  name: string;
  label: string;
  type: string;
  required: boolean;
}

export interface CreateSignupFormParams {
  list_id: string;
  title: string;
  description?: string;
  success_message?: string;
  redirect_url?: string;
  custom_fields?: CustomField[];
  theme?: Record<string, unknown>;
}

export interface UpdateSignupFormParams {
  title: string;
  description?: string;
  success_message?: string;
  redirect_url?: string;
  custom_fields?: CustomField[];
  theme?: Record<string, unknown>;
}

// ---- Audit Log Types ----

export interface AuditLog {
  id: string;
  account_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}
