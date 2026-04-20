import { EuroMailError } from "./errors.js";
import type {
  Account,
  AddContactParams,
  AgentMailbox,
  AnalyticsQuery,
  AnalyticsSummary,
  ApiKey,
  ApiKeyCreated,
  AuditLog,
  BillingPlan,
  BroadcastParams,
  BroadcastResponse,
  BulkAddContactsParams,
  BulkAddContactsResponse,
  CheckoutParams,
  CheckoutResponse,
  Contact,
  ContactList,
  CreateAgentMailboxParams,
  CreateApiKeyParams,
  CreateContactListParams,
  CreateInboundRouteParams,
  CreateNewsletterParams,
  CreateSignupFormParams,
  CreateSubAccountParams,
  CreateTemplateParams,
  CreateWebhookParams,
  DeadLetter,
  Domain,
  DomainAnalyticsQuery,
  DomainAnalyticsResponse,
  DomainVerificationResult,
  Email,
  EmailDetail,
  EmailValidation,
  GdprEraseResponse,
  GdprExportResponse,
  InboundEmail,
  InboundRoute,
  InsightReport,
  LeasedMessage,
  LinkClickStat,
  ListAgentMailboxesParams,
  ListContactsParams,
  ListDeadLettersParams,
  ListEmailsParams,
  ListMailboxMessagesParams,
  ListParams,
  MailboxMessage,
  Newsletter,
  NewsletterSendResponse,
  Operation,
  PaginatedResponse,
  PortalParams,
  PortalResponse,
  SendBatchParams,
  SendBatchResponse,
  SendEmailParams,
  SendEmailResponse,
  SignupForm,
  SubAccount,
  Subscription,
  Suppression,
  Template,
  TimeseriesQuery,
  TimeseriesResponse,
  TrackingDomainResponse,
  TrackingDomainVerification,
  UpdateContactListParams,
  UpdateInboundRouteParams,
  UpdateNewsletterParams,
  UpdateSignupFormParams,
  UpdateSubAccountParams,
  UpdateTemplateParams,
  UpdateWebhookParams,
  WaitForNextMessageParams,
  Webhook,
  WebhookTestResponse,
} from "./types.js";
import { SDK_VERSION } from "./version.js";

export interface EuroMailConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  /** Maximum automatic retries for network errors, 429, and 5xx responses. Default 2. */
  maxRetries?: number;
  /** Base delay (ms) for exponential backoff between retries. Default 200. */
  retryBaseDelayMs?: number;
}

export interface RequestOptions {
  /** Per-call idempotency key sent as `Idempotency-Key` header. Enables safe POST retries. */
  idempotencyKey?: string;
  /** Abort signal for cancellation. Combined with the internal timeout. */
  signal?: AbortSignal;
}

const DEFAULT_BASE_URL = "https://api.euromail.dev";
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_BASE_MS = 200;
const MAX_RETRY_DELAY_MS = 10_000;
const USER_AGENT = `euromail-sdk-js/${SDK_VERSION}`;
const RETRIABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const IDEMPOTENT_METHODS = new Set(["GET", "HEAD", "PUT", "DELETE", "OPTIONS"]);

function resolveBaseUrl(explicit?: string): string {
  if (explicit) return explicit;
  if (typeof process !== "undefined" && process.env?.EUROMAIL_API_URL) {
    return process.env.EUROMAIL_API_URL;
  }
  return DEFAULT_BASE_URL;
}

export class EuroMail {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly retryBaseDelayMs: number;

  constructor(config: EuroMailConfig = {}) {
    const resolvedApiKey =
      config.apiKey ?? (typeof process !== "undefined" ? process.env?.EUROMAIL_API_KEY : undefined);

    if (!resolvedApiKey) {
      throw new Error(
        "EuroMail API key is required. Pass it as `apiKey` in the constructor config or set the EUROMAIL_API_KEY environment variable.",
      );
    }
    this.apiKey = resolvedApiKey;
    this.baseUrl = resolveBaseUrl(config.baseUrl).replace(/\/+$/, "");
    if (
      !this.baseUrl.startsWith("https://") &&
      !this.baseUrl.startsWith("http://localhost") &&
      !this.baseUrl.startsWith("http://127.0.0.1")
    ) {
      console.warn(
        "WARNING: EuroMail base URL does not use HTTPS. API keys will be sent in cleartext.",
      );
    }
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.maxRetries = Math.max(0, config.maxRetries ?? DEFAULT_MAX_RETRIES);
    this.retryBaseDelayMs = Math.max(0, config.retryBaseDelayMs ?? DEFAULT_RETRY_BASE_MS);
  }

  // ---- Account Methods ----

  /** Get the currently authenticated account (billing plan, quota, usage). */
  async getAccount(): Promise<Account> {
    const result = await this.get<{ data: Account }>("/v1/account");
    return result.data;
  }

  /** Export the account's data as a CSV string (GDPR data access). */
  async exportAccount(): Promise<string> {
    const response = await this.requestRaw("GET", "/v1/account/export");
    return response.text();
  }

  /**
   * Permanently delete the account and all associated data. Irreversible —
   * all emails, contacts, templates, and API keys are removed.
   */
  async deleteAccount(): Promise<void> {
    await this.delete("/v1/account");
  }

  // ---- Email Methods ----

  /**
   * Send a transactional email. Pass `options.idempotencyKey` to allow the SDK
   * to safely retry on transient failures (network errors, 429, 5xx); without
   * a key, POSTs are sent once and not retried.
   */
  async sendEmail(params: SendEmailParams, options?: RequestOptions): Promise<SendEmailResponse> {
    const result = await this.post<{ data: SendEmailResponse }>("/v1/emails", params, options);
    return result.data;
  }

  /**
   * Send a batch of emails in one request. Pass `options.idempotencyKey` to
   * allow the SDK to safely retry on transient failures.
   */
  async sendBatch(params: SendBatchParams, options?: RequestOptions): Promise<SendBatchResponse> {
    return this.post<SendBatchResponse>("/v1/emails/batch", params, options);
  }

  /**
   * Retrieve a single email with full metadata: events (sent, delivered,
   * opened, clicked, bounced), rendered body, and recipient info.
   */
  async getEmail(emailId: string): Promise<EmailDetail> {
    const result = await this.get<{ data: EmailDetail }>(
      `/v1/emails/${encodeURIComponent(emailId)}`,
    );
    return result.data;
  }

  /**
   * List emails, optionally filtered by status. Returns a single page; use
   * {@link paginateItems} to iterate across all pages automatically.
   */
  async listEmails(params?: ListEmailsParams): Promise<PaginatedResponse<Email>> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.per_page) query.set("per_page", String(params.per_page));
    if (params?.status) query.set("status", params.status);
    return this.get<PaginatedResponse<Email>>(`/v1/emails?${query.toString()}`);
  }

  /**
   * Cancel a scheduled email before it is sent. No-op if the email has
   * already been dispatched.
   */
  async cancelScheduledEmail(emailId: string): Promise<SendEmailResponse> {
    const result = await this.post<{ data: SendEmailResponse }>(
      `/v1/emails/${encodeURIComponent(emailId)}/cancel`,
      {},
    );
    return result.data;
  }

  /** Per-link click statistics for an email (requires click tracking enabled). */
  async getEmailLinks(emailId: string): Promise<LinkClickStat[]> {
    const result = await this.get<{ data: LinkClickStat[] }>(
      `/v1/emails/${encodeURIComponent(emailId)}/links`,
    );
    return result.data;
  }

  /**
   * Send a broadcast (newsletter-style) to a contact list. Pass
   * `options.idempotencyKey` for safe retries.
   */
  async sendBroadcast(
    params: BroadcastParams,
    options?: RequestOptions,
  ): Promise<BroadcastResponse> {
    const result = await this.post<{ data: BroadcastResponse }>(
      "/v1/emails/broadcast",
      params,
      options,
    );
    return result.data;
  }

  // ---- Template Methods ----

  /** Create a reusable email template with optional variables. */
  async createTemplate(params: CreateTemplateParams): Promise<Template> {
    const result = await this.post<{ data: Template }>("/v1/templates", params);
    return result.data;
  }

  /** Get a template by id. */
  async getTemplate(templateId: string): Promise<Template> {
    const result = await this.get<{ data: Template }>(
      `/v1/templates/${encodeURIComponent(templateId)}`,
    );
    return result.data;
  }

  /** Update an existing template's subject, HTML, or variables. */
  async updateTemplate(templateId: string, params: UpdateTemplateParams): Promise<Template> {
    const result = await this.put<{ data: Template }>(
      `/v1/templates/${encodeURIComponent(templateId)}`,
      params,
    );
    return result.data;
  }

  /** Delete a template permanently. */
  async deleteTemplate(templateId: string): Promise<void> {
    await this.delete(`/v1/templates/${encodeURIComponent(templateId)}`);
  }

  /** List templates (paginated). Use {@link paginateItems} to auto-advance pages. */
  async listTemplates(params?: ListParams): Promise<PaginatedResponse<Template>> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.per_page) query.set("per_page", String(params.per_page));
    return this.get<PaginatedResponse<Template>>(`/v1/templates?${query.toString()}`);
  }

  // ---- Domain Methods ----

  /**
   * Register a sending domain. The response contains DNS records (SPF, DKIM,
   * DMARC) that must be added to the domain's zone before {@link verifyDomain}
   * will succeed.
   */
  async addDomain(domain: string): Promise<Domain> {
    const result = await this.post<{ data: Domain }>("/v1/domains", { domain });
    return result.data;
  }

  /** Get a domain and its current verification state. */
  async getDomain(domainId: string): Promise<Domain> {
    const result = await this.get<{ data: Domain }>(`/v1/domains/${encodeURIComponent(domainId)}`);
    return result.data;
  }

  /**
   * Check DNS and mark the domain verified if SPF/DKIM/DMARC records are
   * correctly published. Safe to call repeatedly while waiting for DNS
   * propagation.
   */
  async verifyDomain(domainId: string): Promise<DomainVerificationResult> {
    const result = await this.post<{ data: DomainVerificationResult }>(
      `/v1/domains/${encodeURIComponent(domainId)}/verify`,
      {},
    );
    return result.data;
  }

  /** Remove a sending domain. In-flight emails are not affected. */
  async deleteDomain(domainId: string): Promise<void> {
    await this.delete(`/v1/domains/${encodeURIComponent(domainId)}`);
  }

  /** List sending domains (paginated). */
  async listDomains(params?: ListParams): Promise<PaginatedResponse<Domain>> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.per_page) query.set("per_page", String(params.per_page));
    return this.get<PaginatedResponse<Domain>>(`/v1/domains?${query.toString()}`);
  }

  async setTrackingDomain(
    domainId: string,
    trackingDomain: string,
  ): Promise<TrackingDomainResponse> {
    return this.put<TrackingDomainResponse>(
      `/v1/domains/${encodeURIComponent(domainId)}/tracking-domain`,
      { tracking_domain: trackingDomain },
    );
  }

  async verifyTrackingDomain(domainId: string): Promise<TrackingDomainVerification> {
    return this.post<TrackingDomainVerification>(
      `/v1/domains/${encodeURIComponent(domainId)}/verify-tracking`,
      {},
    );
  }

  async removeTrackingDomain(domainId: string): Promise<Domain> {
    const result = await this.request<{ data: Domain }>(
      "DELETE",
      `/v1/domains/${encodeURIComponent(domainId)}/tracking-domain`,
    );
    return result.data;
  }

  // ---- Webhook Methods ----

  /**
   * Subscribe a URL to webhook events (delivered, opened, clicked, bounced,
   * complained). The response includes a signing secret used to verify
   * inbound webhook requests.
   */
  async createWebhook(params: CreateWebhookParams): Promise<Webhook> {
    const result = await this.post<{ data: Webhook }>("/v1/webhooks", params);
    return result.data;
  }

  /** Get a webhook by id. */
  async getWebhook(webhookId: string): Promise<Webhook> {
    const result = await this.get<{ data: Webhook }>(
      `/v1/webhooks/${encodeURIComponent(webhookId)}`,
    );
    return result.data;
  }

  /** Update a webhook's URL or subscribed event types. */
  async updateWebhook(webhookId: string, params: UpdateWebhookParams): Promise<Webhook> {
    const result = await this.put<{ data: Webhook }>(
      `/v1/webhooks/${encodeURIComponent(webhookId)}`,
      params,
    );
    return result.data;
  }

  /** Send a synthetic event to the webhook URL to confirm it's reachable. */
  async testWebhook(webhookId: string): Promise<WebhookTestResponse> {
    const result = await this.post<{ data: WebhookTestResponse }>(
      `/v1/webhooks/${encodeURIComponent(webhookId)}/test`,
      {},
    );
    return result.data;
  }

  /** Unsubscribe a webhook. */
  async deleteWebhook(webhookId: string): Promise<void> {
    await this.delete(`/v1/webhooks/${encodeURIComponent(webhookId)}`);
  }

  /** List all webhooks (paginated). */
  async listWebhooks(params?: ListParams): Promise<PaginatedResponse<Webhook>> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.per_page) query.set("per_page", String(params.per_page));
    return this.get<PaginatedResponse<Webhook>>(`/v1/webhooks?${query.toString()}`);
  }

  // ---- Suppression Methods ----

  /**
   * Add an address to the suppression list so future sends to it are blocked.
   * Reasons: `"hard_bounce"`, `"complaint"`, `"fbl"`, `"manual"` (default),
   * `"unsubscribe"`.
   */
  async addSuppression(email: string, reason?: string): Promise<Suppression> {
    const result = await this.post<{ data: Suppression }>("/v1/suppressions", {
      email_address: email,
      reason: reason ?? "manual",
    });
    return result.data;
  }

  /** Remove an address from the suppression list. Sends to it will resume. */
  async deleteSuppression(email: string): Promise<void> {
    await this.delete(`/v1/suppressions/${encodeURIComponent(email)}`);
  }

  /** List suppressed addresses (paginated). */
  async listSuppressions(params?: ListParams): Promise<PaginatedResponse<Suppression>> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.per_page) query.set("per_page", String(params.per_page));
    return this.get<PaginatedResponse<Suppression>>(`/v1/suppressions?${query.toString()}`);
  }

  // ---- Contact List Methods ----

  /** Create a new contact list for newsletters and broadcasts. */
  async createContactList(params: CreateContactListParams): Promise<ContactList> {
    const result = await this.post<{ data: ContactList }>("/v1/contact-lists", params);
    return result.data;
  }

  /** List all contact lists owned by the account. */
  async listContactLists(): Promise<ContactList[]> {
    const result = await this.get<{ data: ContactList[] }>("/v1/contact-lists");
    return result.data;
  }

  /** Get a contact list by id. */
  async getContactList(listId: string): Promise<ContactList> {
    const result = await this.get<{ data: ContactList }>(
      `/v1/contact-lists/${encodeURIComponent(listId)}`,
    );
    return result.data;
  }

  /** Update a contact list's name or custom fields. */
  async updateContactList(listId: string, params: UpdateContactListParams): Promise<ContactList> {
    const result = await this.put<{ data: ContactList }>(
      `/v1/contact-lists/${encodeURIComponent(listId)}`,
      params,
    );
    return result.data;
  }

  /** Delete a contact list and all its contacts. Irreversible. */
  async deleteContactList(listId: string): Promise<void> {
    await this.delete(`/v1/contact-lists/${encodeURIComponent(listId)}`);
  }

  /** Add a single contact to a list. For many contacts, prefer {@link bulkAddContacts}. */
  async addContact(listId: string, params: AddContactParams): Promise<Contact> {
    const result = await this.post<{ data: Contact }>(
      `/v1/contact-lists/${encodeURIComponent(listId)}/contacts`,
      params,
    );
    return result.data;
  }

  /**
   * Add many contacts to a list in one request. Returns per-contact status
   * (created vs. skipped/invalid) — partial success is expected.
   */
  async bulkAddContacts(
    listId: string,
    params: BulkAddContactsParams,
  ): Promise<BulkAddContactsResponse> {
    const result = await this.post<{ data: BulkAddContactsResponse }>(
      `/v1/contact-lists/${encodeURIComponent(listId)}/contacts`,
      params,
    );
    return result.data;
  }

  /** List contacts in a list (paginated), optionally filtered by status. */
  async listContacts(
    listId: string,
    params?: ListContactsParams,
  ): Promise<PaginatedResponse<Contact>> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.per_page) query.set("per_page", String(params.per_page));
    if (params?.status) query.set("status", params.status);
    return this.get<PaginatedResponse<Contact>>(
      `/v1/contact-lists/${encodeURIComponent(listId)}/contacts?${query.toString()}`,
    );
  }

  /** Remove a contact from a list by email. */
  async removeContact(listId: string, email: string): Promise<void> {
    await this.delete(
      `/v1/contact-lists/${encodeURIComponent(listId)}/contacts/${encodeURIComponent(email)}`,
    );
  }

  // ---- Dead Letter Methods ----

  async listDeadLetters(params?: ListDeadLettersParams): Promise<DeadLetter[]> {
    const query = new URLSearchParams();
    if (params?.count) query.set("count", String(params.count));
    const result = await this.get<{ data: DeadLetter[] }>(`/v1/dead-letters?${query.toString()}`);
    return result.data;
  }

  async retryDeadLetter(id: string): Promise<void> {
    await this.post(`/v1/dead-letters/${encodeURIComponent(id)}/retry`, {});
  }

  async deleteDeadLetter(id: string): Promise<void> {
    await this.delete(`/v1/dead-letters/${encodeURIComponent(id)}`);
  }

  // ---- Inbound Email Methods ----

  async listInboundEmails(params?: ListParams): Promise<PaginatedResponse<InboundEmail>> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.per_page) query.set("per_page", String(params.per_page));
    return this.get<PaginatedResponse<InboundEmail>>(`/v1/inbound?${query.toString()}`);
  }

  async getInboundEmail(id: string): Promise<InboundEmail> {
    const result = await this.get<{ data: InboundEmail }>(`/v1/inbound/${encodeURIComponent(id)}`);
    return result.data;
  }

  async deleteInboundEmail(id: string): Promise<void> {
    await this.delete(`/v1/inbound/${encodeURIComponent(id)}`);
  }

  // ---- Inbound Route Methods ----

  async createInboundRoute(params: CreateInboundRouteParams): Promise<InboundRoute> {
    const result = await this.post<{ data: InboundRoute }>("/v1/inbound-routes", params);
    return result.data;
  }

  async listInboundRoutes(params?: ListParams): Promise<PaginatedResponse<InboundRoute>> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.per_page) query.set("per_page", String(params.per_page));
    return this.get<PaginatedResponse<InboundRoute>>(`/v1/inbound-routes?${query.toString()}`);
  }

  async getInboundRoute(id: string): Promise<InboundRoute> {
    const result = await this.get<{ data: InboundRoute }>(
      `/v1/inbound-routes/${encodeURIComponent(id)}`,
    );
    return result.data;
  }

  async updateInboundRoute(id: string, params: UpdateInboundRouteParams): Promise<InboundRoute> {
    const result = await this.put<{ data: InboundRoute }>(
      `/v1/inbound-routes/${encodeURIComponent(id)}`,
      params,
    );
    return result.data;
  }

  async deleteInboundRoute(id: string): Promise<void> {
    await this.delete(`/v1/inbound-routes/${encodeURIComponent(id)}`);
  }

  // ---- Sub-Account Methods ----

  async createSubAccount(params: CreateSubAccountParams): Promise<SubAccount> {
    const result = await this.post<{ data: SubAccount }>("/v1/accounts", params);
    return result.data;
  }

  async listSubAccounts(params?: ListParams): Promise<PaginatedResponse<SubAccount>> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.per_page) query.set("per_page", String(params.per_page));
    return this.get<PaginatedResponse<SubAccount>>(`/v1/accounts?${query.toString()}`);
  }

  async getSubAccount(id: string): Promise<SubAccount> {
    const result = await this.get<{ data: SubAccount }>(`/v1/accounts/${encodeURIComponent(id)}`);
    return result.data;
  }

  async updateSubAccount(id: string, params: UpdateSubAccountParams): Promise<SubAccount> {
    const result = await this.patch<{ data: SubAccount }>(
      `/v1/accounts/${encodeURIComponent(id)}`,
      params,
    );
    return result.data;
  }

  async deleteSubAccount(id: string): Promise<void> {
    await this.delete(`/v1/accounts/${encodeURIComponent(id)}`);
  }

  async getSubAccountAnalytics(id: string, query?: AnalyticsQuery): Promise<AnalyticsSummary> {
    const params = this.buildAnalyticsQuery(query);
    return this.get<AnalyticsSummary>(
      `/v1/accounts/${encodeURIComponent(id)}/analytics?${params.toString()}`,
    );
  }

  async getAggregateAnalytics(query?: AnalyticsQuery): Promise<AnalyticsSummary> {
    const params = this.buildAnalyticsQuery(query);
    return this.get<AnalyticsSummary>(`/v1/analytics/aggregate?${params.toString()}`);
  }

  // ---- Analytics Methods ----

  async getAnalyticsOverview(query?: AnalyticsQuery): Promise<AnalyticsSummary> {
    const params = this.buildAnalyticsQuery(query);
    return this.get<AnalyticsSummary>(`/v1/analytics/overview?${params.toString()}`);
  }

  async getAnalyticsTimeseries(query?: TimeseriesQuery): Promise<TimeseriesResponse> {
    const params = this.buildAnalyticsQuery(query);
    if (query?.metrics) params.set("metrics", query.metrics);
    return this.get<TimeseriesResponse>(`/v1/analytics/timeseries?${params.toString()}`);
  }

  async getAnalyticsDomains(query?: DomainAnalyticsQuery): Promise<DomainAnalyticsResponse> {
    const params = this.buildAnalyticsQuery(query);
    if (query?.limit) params.set("limit", String(query.limit));
    return this.get<DomainAnalyticsResponse>(`/v1/analytics/domains?${params.toString()}`);
  }

  async exportAnalyticsCsv(query?: AnalyticsQuery): Promise<string> {
    const params = this.buildAnalyticsQuery(query);
    const response = await this.requestRaw("GET", `/v1/analytics/export?${params.toString()}`);
    return response.text();
  }

  // ---- Audit Log Methods ----

  async listAuditLogs(params?: ListParams): Promise<PaginatedResponse<AuditLog>> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.per_page) query.set("per_page", String(params.per_page));
    return this.get<PaginatedResponse<AuditLog>>(`/v1/audit-logs?${query.toString()}`);
  }

  // ---- API Key Methods ----

  async createApiKey(params: CreateApiKeyParams): Promise<ApiKeyCreated> {
    const result = await this.post<{ data: ApiKeyCreated }>("/v1/api-keys", params);
    return result.data;
  }

  async listApiKeys(): Promise<ApiKey[]> {
    const result = await this.get<{ data: ApiKey[] }>("/v1/api-keys");
    return result.data;
  }

  async deleteApiKey(id: string): Promise<void> {
    await this.delete(`/v1/api-keys/${encodeURIComponent(id)}`);
  }

  async createSubAccountApiKey(
    subAccountId: string,
    params: CreateApiKeyParams,
  ): Promise<ApiKeyCreated> {
    const result = await this.post<{ data: ApiKeyCreated }>(
      `/v1/accounts/${encodeURIComponent(subAccountId)}/api-keys`,
      params,
    );
    return result.data;
  }

  // ---- Newsletter Methods ----

  async createNewsletter(params: CreateNewsletterParams): Promise<Newsletter> {
    const result = await this.post<{ data: Newsletter }>("/v1/newsletters", params);
    return result.data;
  }

  async listNewsletters(params?: ListParams): Promise<Newsletter[]> {
    const query = new URLSearchParams();
    if (params?.page !== undefined || params?.per_page !== undefined) {
      const perPage = params.per_page ?? 20;
      const page = params.page ?? 1;
      query.set("limit", String(perPage));
      query.set("offset", String((page - 1) * perPage));
    }
    const qs = query.toString();
    const result = await this.get<{ data: Newsletter[] }>(`/v1/newsletters${qs ? `?${qs}` : ""}`);
    return result.data;
  }

  async getNewsletter(id: string): Promise<Newsletter> {
    const result = await this.get<{ data: Newsletter }>(
      `/v1/newsletters/${encodeURIComponent(id)}`,
    );
    return result.data;
  }

  async updateNewsletter(id: string, params: UpdateNewsletterParams): Promise<Newsletter> {
    const result = await this.put<{ data: Newsletter }>(
      `/v1/newsletters/${encodeURIComponent(id)}`,
      params,
    );
    return result.data;
  }

  async deleteNewsletter(id: string): Promise<void> {
    await this.delete(`/v1/newsletters/${encodeURIComponent(id)}`);
  }

  async sendNewsletter(id: string): Promise<NewsletterSendResponse> {
    const result = await this.post<{ data: NewsletterSendResponse }>(
      `/v1/newsletters/${encodeURIComponent(id)}/send`,
      {},
    );
    return result.data;
  }

  // ---- Signup Form Methods ----

  async createSignupForm(params: CreateSignupFormParams): Promise<SignupForm> {
    const result = await this.post<{ data: SignupForm }>("/v1/signup-forms", params);
    return result.data;
  }

  async listSignupForms(): Promise<SignupForm[]> {
    const result = await this.get<{ data: SignupForm[] }>("/v1/signup-forms");
    return result.data;
  }

  async getSignupForm(id: string): Promise<SignupForm> {
    const result = await this.get<{ data: SignupForm }>(
      `/v1/signup-forms/${encodeURIComponent(id)}`,
    );
    return result.data;
  }

  async updateSignupForm(id: string, params: UpdateSignupFormParams): Promise<SignupForm> {
    const result = await this.put<{ data: SignupForm }>(
      `/v1/signup-forms/${encodeURIComponent(id)}`,
      params,
    );
    return result.data;
  }

  async deleteSignupForm(id: string): Promise<void> {
    await this.delete(`/v1/signup-forms/${encodeURIComponent(id)}`);
  }

  async toggleSignupForm(id: string): Promise<SignupForm> {
    const result = await this.post<{ data: SignupForm }>(
      `/v1/signup-forms/${encodeURIComponent(id)}/toggle`,
      {},
    );
    return result.data;
  }

  // ---- Email Validation Methods ----

  /**
   * Check whether an address has valid syntax, a real MX record, and is not
   * on known disposable or role-based block lists. Useful for cleaning
   * contact lists before a broadcast.
   */
  async validateEmail(email: string): Promise<EmailValidation> {
    return this.post<EmailValidation>("/v1/validate", { email });
  }

  // ---- Operation Methods ----

  async listOperations(params?: ListParams): Promise<PaginatedResponse<Operation>> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.per_page) query.set("per_page", String(params.per_page));
    return this.get<PaginatedResponse<Operation>>(`/v1/operations?${query.toString()}`);
  }

  async getOperation(id: string): Promise<Operation> {
    const result = await this.get<{ data: Operation }>(`/v1/operations/${encodeURIComponent(id)}`);
    return result.data;
  }

  // ---- Billing Methods ----

  async listPlans(): Promise<BillingPlan[]> {
    const result = await this.get<{ data: BillingPlan[] }>("/v1/billing/plans");
    return result.data;
  }

  async getSubscription(): Promise<Subscription> {
    const result = await this.get<{ data: Subscription }>("/v1/billing/subscription");
    return result.data;
  }

  async createCheckout(params: CheckoutParams): Promise<CheckoutResponse> {
    const result = await this.post<{ data: CheckoutResponse }>("/v1/billing/checkout", params);
    return result.data;
  }

  async createBillingPortal(params: PortalParams): Promise<PortalResponse> {
    const result = await this.post<{ data: PortalResponse }>("/v1/billing/portal", params);
    return result.data;
  }

  // ---- Insights Methods ----

  async generateInsights(): Promise<InsightReport> {
    return this.post<InsightReport>("/v1/insights/generate", {});
  }

  // ---- GDPR Methods ----

  async gdprExport(email: string): Promise<GdprExportResponse> {
    return this.get<GdprExportResponse>(`/v1/gdpr/export?email=${encodeURIComponent(email)}`);
  }

  async gdprErase(email: string): Promise<GdprEraseResponse> {
    return this.request<GdprEraseResponse>(
      "DELETE",
      `/v1/gdpr/erase?email=${encodeURIComponent(email)}`,
    );
  }

  // ---- Agent Mailbox Methods ----

  /**
   * Create an inbound mailbox for an AI agent. Messages arrive via the
   * server's queue and are consumed with {@link waitForNextMessage} +
   * {@link ackMessage} / {@link nackMessage}.
   */
  async createMailbox(params?: CreateAgentMailboxParams): Promise<AgentMailbox> {
    const result = await this.post<{ data: AgentMailbox }>("/v1/agent-mailboxes", params ?? {});
    return result.data;
  }

  /** List all agent mailboxes. Uses limit/offset pagination. */
  async listMailboxes(params?: ListAgentMailboxesParams): Promise<AgentMailbox[]> {
    const query = new URLSearchParams();
    if (params?.limit !== undefined) query.set("limit", String(params.limit));
    if (params?.offset !== undefined) query.set("offset", String(params.offset));
    const qs = query.toString();
    const result = await this.get<{ data: AgentMailbox[] }>(
      `/v1/agent-mailboxes${qs ? `?${qs}` : ""}`,
    );
    return result.data;
  }

  async getMailbox(id: string): Promise<AgentMailbox> {
    const result = await this.get<{ data: AgentMailbox }>(
      `/v1/agent-mailboxes/${encodeURIComponent(id)}`,
    );
    return result.data;
  }

  async deleteMailbox(id: string): Promise<void> {
    await this.delete(`/v1/agent-mailboxes/${encodeURIComponent(id)}`);
  }

  async listMessages(
    mailboxId: string,
    params?: ListMailboxMessagesParams,
  ): Promise<MailboxMessage[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.limit !== undefined) query.set("limit", String(params.limit));
    if (params?.offset !== undefined) query.set("offset", String(params.offset));
    const qs = query.toString();
    const result = await this.get<{ data: MailboxMessage[] }>(
      `/v1/agent-mailboxes/${encodeURIComponent(mailboxId)}/messages${qs ? `?${qs}` : ""}`,
    );
    return result.data;
  }

  /**
   * Long-poll for the next message in a mailbox. Acquires a lease that must be
   * released via `ackMessage` (success) or `nackMessage` (retry). Returns
   * `null` when the server responds with HTTP 408 (no message arrived within
   * the timeout window).
   */
  async waitForNextMessage(
    mailboxId: string,
    params?: WaitForNextMessageParams,
  ): Promise<LeasedMessage | null> {
    const query = new URLSearchParams();
    if (params?.timeout !== undefined) query.set("timeout", String(params.timeout));
    const qs = query.toString();
    const path = `/v1/agent-mailboxes/${encodeURIComponent(mailboxId)}/messages/next${qs ? `?${qs}` : ""}`;

    // Dedicated code path: the long-poll endpoint returns HTTP 408 with no body
    // when no message arrives. We treat that as a non-error `null` result so
    // callers can simply re-invoke in a loop without catching.
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    // Give the network a little slack on top of the server-side long-poll
    // timeout so the request isn't aborted right before the server responds.
    const serverTimeoutMs = (params?.timeout ?? 30) * 1000;
    const clientTimeoutMs = Math.max(this.timeout, serverTimeoutMs + 5_000);
    const timer = setTimeout(() => controller.abort(), clientTimeoutMs);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "application/json",
          "User-Agent": USER_AGENT,
        },
        signal: controller.signal,
      });

      if (response.status === 408) {
        return null;
      }

      if (!response.ok) {
        throw await EuroMailError.fromResponse(response);
      }

      return (await response.json()) as LeasedMessage;
    } finally {
      clearTimeout(timer);
    }
  }

  async deleteMessage(mailboxId: string, messageId: string): Promise<void> {
    await this.delete(
      `/v1/agent-mailboxes/${encodeURIComponent(mailboxId)}/messages/${encodeURIComponent(messageId)}`,
    );
  }

  /**
   * Acknowledge a leased message as successfully processed. Releases the
   * lease and marks the message as handled.
   */
  async ackMessage(mailboxId: string, messageId: string, leaseToken: string): Promise<void> {
    await this.post(
      `/v1/agent-mailboxes/${encodeURIComponent(mailboxId)}/messages/${encodeURIComponent(messageId)}/ack`,
      { lease_token: leaseToken },
    );
  }

  /**
   * Negative-acknowledge a leased message. Releases the lease and returns
   * the message to the queue for another consumer to process.
   */
  async nackMessage(mailboxId: string, messageId: string, leaseToken: string): Promise<void> {
    await this.post(
      `/v1/agent-mailboxes/${encodeURIComponent(mailboxId)}/messages/${encodeURIComponent(messageId)}/nack`,
      { lease_token: leaseToken },
    );
  }

  // ---- Pagination Helpers ----

  /**
   * Iterate through a paginated list endpoint one page at a time. The fetcher
   * receives `{ page, per_page }` and must return a {@link PaginatedResponse}.
   * Iteration stops after the last page (`page >= pagination.total_pages`).
   *
   * @example
   * for await (const page of client.paginate((p) => client.listEmails({ ...p, status: "delivered" }))) {
   *   console.log(`page ${page.pagination.page} of ${page.pagination.total_pages}`);
   *   for (const email of page.data) process(email);
   * }
   */
  async *paginate<T>(
    fetcher: (params: { page: number; per_page: number }) => Promise<PaginatedResponse<T>>,
    options?: { perPage?: number; startPage?: number },
  ): AsyncGenerator<PaginatedResponse<T>, void, unknown> {
    const per_page = options?.perPage ?? 50;
    let page = options?.startPage ?? 1;
    while (true) {
      const result = await fetcher({ page, per_page });
      yield result;
      if (page >= result.pagination.total_pages || result.data.length === 0) return;
      page++;
    }
  }

  /**
   * Iterate through every item of a paginated list endpoint, auto-advancing
   * pages as you consume it.
   *
   * @example
   * for await (const email of client.paginateItems((p) => client.listEmails({ ...p, status: "bounced" }))) {
   *   console.log(email.id);
   * }
   */
  async *paginateItems<T>(
    fetcher: (params: { page: number; per_page: number }) => Promise<PaginatedResponse<T>>,
    options?: { perPage?: number; startPage?: number },
  ): AsyncGenerator<T, void, unknown> {
    for await (const page of this.paginate(fetcher, options)) {
      for (const item of page.data) yield item;
    }
  }

  // ---- HTTP Helpers ----

  private buildAnalyticsQuery(query?: AnalyticsQuery): URLSearchParams {
    const params = new URLSearchParams();
    if (query?.period) params.set("period", query.period);
    if (query?.from) params.set("from", query.from);
    if (query?.to) params.set("to", query.to);
    return params;
  }

  private async doFetch(
    method: string,
    path: string,
    body: unknown | undefined,
    options: RequestOptions & { acceptJson: boolean },
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const idempotencyKey = options.idempotencyKey;
    const canRetry = IDEMPOTENT_METHODS.has(method) || idempotencyKey !== undefined;
    const maxAttempts = canRetry ? this.maxRetries + 1 : 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const isLastAttempt = attempt + 1 >= maxAttempts;
      const { signal, cleanup } = this.buildSignal(options.signal);

      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.apiKey}`,
        "User-Agent": USER_AGENT,
      };
      if (options.acceptJson) headers.Accept = "application/json";
      if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

      const init: RequestInit = { method, headers, signal };
      if (body !== undefined) {
        headers["Content-Type"] = "application/json";
        headers.Accept = "application/json";
        init.body = JSON.stringify(body);
      }

      let response: Response;
      try {
        response = await fetch(url, init);
      } catch (err) {
        cleanup();
        if (options.signal?.aborted || isLastAttempt) throw err;
        await this.sleep(this.backoffDelay(attempt, null));
        continue;
      }
      cleanup();

      if (response.ok) return response;

      if (RETRIABLE_STATUSES.has(response.status) && !isLastAttempt) {
        const retryAfter = parseRetryAfterSeconds(response.headers.get("retry-after"));
        await this.sleep(this.backoffDelay(attempt, retryAfter));
        continue;
      }

      throw await EuroMailError.fromResponse(response);
    }

    // Unreachable: the loop either returns, throws, or continues for exactly maxAttempts iterations.
    throw new Error("euromail: retry loop exited without result");
  }

  private buildSignal(userSignal?: AbortSignal): { signal: AbortSignal; cleanup: () => void } {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    let onUserAbort: (() => void) | null = null;

    if (userSignal) {
      if (userSignal.aborted) {
        controller.abort();
      } else {
        onUserAbort = () => controller.abort();
        userSignal.addEventListener("abort", onUserAbort, { once: true });
      }
    }

    return {
      signal: controller.signal,
      cleanup: () => {
        clearTimeout(timer);
        if (userSignal && onUserAbort) userSignal.removeEventListener("abort", onUserAbort);
      },
    };
  }

  private backoffDelay(attempt: number, retryAfterSeconds: number | null): number {
    if (retryAfterSeconds !== null) {
      return Math.min(retryAfterSeconds * 1000, MAX_RETRY_DELAY_MS);
    }
    const exp = this.retryBaseDelayMs * 2 ** attempt;
    const jitter = Math.random() * this.retryBaseDelayMs;
    return Math.min(exp + jitter, MAX_RETRY_DELAY_MS);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private requestRaw(method: string, path: string, body?: unknown): Promise<Response> {
    return this.doFetch(method, path, body, { acceptJson: false });
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    const response = await this.doFetch(method, path, body, { ...options, acceptJson: true });
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  private get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("GET", path, undefined, options);
  }

  private post<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("POST", path, body, options);
  }

  private put<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("PUT", path, body, options);
  }

  private patch<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("PATCH", path, body, options);
  }

  private delete(path: string, options?: RequestOptions): Promise<void> {
    return this.request<void>("DELETE", path, undefined, options);
  }
}

function parseRetryAfterSeconds(header: string | null): number | null {
  if (!header) return null;
  const asInt = Number.parseInt(header, 10);
  if (!Number.isNaN(asInt)) return asInt;
  const asDate = Date.parse(header);
  if (Number.isNaN(asDate)) return null;
  const seconds = Math.max(0, Math.ceil((asDate - Date.now()) / 1000));
  return seconds;
}
