import { EuroMailError } from "./errors.js";
import { SDK_VERSION } from "./version.js";
import type {
  Account,
  SendEmailParams,
  SendEmailResponse,
  SendBatchParams,
  SendBatchResponse,
  BroadcastParams,
  BroadcastResponse,
  Email,
  EmailDetail,
  ListEmailsParams,
  Template,
  CreateTemplateParams,
  UpdateTemplateParams,
  Domain,
  DomainVerificationResult,
  TrackingDomainResponse,
  TrackingDomainVerification,
  Webhook,
  CreateWebhookParams,
  UpdateWebhookParams,
  WebhookTestResponse,
  Suppression,
  ListParams,
  PaginatedResponse,
  ContactList,
  CreateContactListParams,
  UpdateContactListParams,
  Contact,
  AddContactParams,
  BulkAddContactsParams,
  BulkAddContactsResponse,
  ListContactsParams,
  AnalyticsQuery,
  AnalyticsSummary,
  TimeseriesQuery,
  TimeseriesResponse,
  DomainAnalyticsQuery,
  DomainAnalyticsResponse,
  AuditLog,
  DeadLetter,
  ListDeadLettersParams,
  InboundEmail,
  InboundRoute,
  CreateInboundRouteParams,
  UpdateInboundRouteParams,
  SubAccount,
  CreateSubAccountParams,
  UpdateSubAccountParams,
  ApiKey,
  ApiKeyCreated,
  CreateApiKeyParams,
  Newsletter,
  CreateNewsletterParams,
  UpdateNewsletterParams,
  NewsletterSendResponse,
  SignupForm,
  CreateSignupFormParams,
  UpdateSignupFormParams,
  EmailValidation,
  Operation,
  BillingPlan,
  Subscription,
  CheckoutParams,
  CheckoutResponse,
  PortalParams,
  PortalResponse,
  GdprExportResponse,
  GdprEraseResponse,
  LinkClickStat,
  InsightReport,
  AgentMailbox,
  CreateAgentMailboxParams,
  ListAgentMailboxesParams,
  MailboxMessage,
  ListMailboxMessagesParams,
  WaitForNextMessageParams,
  LeasedMessage,
} from "./types.js";

export interface EuroMailConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
}

const DEFAULT_BASE_URL = "https://api.euromail.dev";
const DEFAULT_TIMEOUT = 30_000;
const USER_AGENT = `euromail-sdk-js/${SDK_VERSION}`;

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

  constructor(config: EuroMailConfig = {}) {
    const resolvedApiKey =
      config.apiKey ??
      (typeof process !== "undefined" ? process.env?.EUROMAIL_API_KEY : undefined);

    if (!resolvedApiKey) {
      throw new Error(
        "EuroMail API key is required. Pass it as `apiKey` in the constructor config or set the EUROMAIL_API_KEY environment variable."
      );
    }
    this.apiKey = resolvedApiKey;
    this.baseUrl = resolveBaseUrl(config.baseUrl).replace(/\/+$/, "");
    if (!this.baseUrl.startsWith("https://") && !this.baseUrl.startsWith("http://localhost") && !this.baseUrl.startsWith("http://127.0.0.1")) {
      console.warn("WARNING: EuroMail base URL does not use HTTPS. API keys will be sent in cleartext.");
    }
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
  }

  // ---- Account Methods ----

  async getAccount(): Promise<Account> {
    const result = await this.get<{ data: Account }>("/v1/account");
    return result.data;
  }

  async exportAccount(): Promise<string> {
    const response = await this.requestRaw("GET", "/v1/account/export");
    return response.text();
  }

  async deleteAccount(): Promise<void> {
    await this.delete("/v1/account");
  }

  // ---- Email Methods ----

  async sendEmail(params: SendEmailParams): Promise<SendEmailResponse> {
    const result = await this.post<{ data: SendEmailResponse }>("/v1/emails", params);
    return result.data;
  }

  async sendBatch(params: SendBatchParams): Promise<SendBatchResponse> {
    return this.post<SendBatchResponse>("/v1/emails/batch", params);
  }

  async getEmail(emailId: string): Promise<EmailDetail> {
    const result = await this.get<{ data: EmailDetail }>(`/v1/emails/${encodeURIComponent(emailId)}`);
    return result.data;
  }

  async listEmails(params?: ListEmailsParams): Promise<PaginatedResponse<Email>> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.per_page) query.set("per_page", String(params.per_page));
    if (params?.status) query.set("status", params.status);
    return this.get<PaginatedResponse<Email>>(`/v1/emails?${query.toString()}`);
  }

  async cancelScheduledEmail(emailId: string): Promise<SendEmailResponse> {
    const result = await this.post<{ data: SendEmailResponse }>(
      `/v1/emails/${encodeURIComponent(emailId)}/cancel`,
      {}
    );
    return result.data;
  }

  async getEmailLinks(emailId: string): Promise<LinkClickStat[]> {
    const result = await this.get<{ data: LinkClickStat[] }>(
      `/v1/emails/${encodeURIComponent(emailId)}/links`
    );
    return result.data;
  }

  async sendBroadcast(params: BroadcastParams): Promise<BroadcastResponse> {
    const result = await this.post<{ data: BroadcastResponse }>("/v1/emails/broadcast", params);
    return result.data;
  }

  // ---- Template Methods ----

  async createTemplate(params: CreateTemplateParams): Promise<Template> {
    const result = await this.post<{ data: Template }>("/v1/templates", params);
    return result.data;
  }

  async getTemplate(templateId: string): Promise<Template> {
    const result = await this.get<{ data: Template }>(`/v1/templates/${encodeURIComponent(templateId)}`);
    return result.data;
  }

  async updateTemplate(templateId: string, params: UpdateTemplateParams): Promise<Template> {
    const result = await this.put<{ data: Template }>(`/v1/templates/${encodeURIComponent(templateId)}`, params);
    return result.data;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await this.delete(`/v1/templates/${encodeURIComponent(templateId)}`);
  }

  async listTemplates(params?: ListParams): Promise<PaginatedResponse<Template>> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.per_page) query.set("per_page", String(params.per_page));
    return this.get<PaginatedResponse<Template>>(`/v1/templates?${query.toString()}`);
  }

  // ---- Domain Methods ----

  async addDomain(domain: string): Promise<Domain> {
    const result = await this.post<{ data: Domain }>("/v1/domains", { domain });
    return result.data;
  }

  async getDomain(domainId: string): Promise<Domain> {
    const result = await this.get<{ data: Domain }>(`/v1/domains/${encodeURIComponent(domainId)}`);
    return result.data;
  }

  async verifyDomain(domainId: string): Promise<DomainVerificationResult> {
    const result = await this.post<{ data: DomainVerificationResult }>(
      `/v1/domains/${encodeURIComponent(domainId)}/verify`,
      {}
    );
    return result.data;
  }

  async deleteDomain(domainId: string): Promise<void> {
    await this.delete(`/v1/domains/${encodeURIComponent(domainId)}`);
  }

  async listDomains(params?: ListParams): Promise<PaginatedResponse<Domain>> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.per_page) query.set("per_page", String(params.per_page));
    return this.get<PaginatedResponse<Domain>>(`/v1/domains?${query.toString()}`);
  }

  async setTrackingDomain(domainId: string, trackingDomain: string): Promise<TrackingDomainResponse> {
    return this.put<TrackingDomainResponse>(
      `/v1/domains/${encodeURIComponent(domainId)}/tracking-domain`,
      { tracking_domain: trackingDomain }
    );
  }

  async verifyTrackingDomain(domainId: string): Promise<TrackingDomainVerification> {
    return this.post<TrackingDomainVerification>(
      `/v1/domains/${encodeURIComponent(domainId)}/verify-tracking`,
      {}
    );
  }

  async removeTrackingDomain(domainId: string): Promise<Domain> {
    const result = await this.request<{ data: Domain }>(
      "DELETE",
      `/v1/domains/${encodeURIComponent(domainId)}/tracking-domain`
    );
    return result.data;
  }

  // ---- Webhook Methods ----

  async createWebhook(params: CreateWebhookParams): Promise<Webhook> {
    const result = await this.post<{ data: Webhook }>("/v1/webhooks", params);
    return result.data;
  }

  async getWebhook(webhookId: string): Promise<Webhook> {
    const result = await this.get<{ data: Webhook }>(`/v1/webhooks/${encodeURIComponent(webhookId)}`);
    return result.data;
  }

  async updateWebhook(webhookId: string, params: UpdateWebhookParams): Promise<Webhook> {
    const result = await this.put<{ data: Webhook }>(`/v1/webhooks/${encodeURIComponent(webhookId)}`, params);
    return result.data;
  }

  async testWebhook(webhookId: string): Promise<WebhookTestResponse> {
    const result = await this.post<{ data: WebhookTestResponse }>(
      `/v1/webhooks/${encodeURIComponent(webhookId)}/test`,
      {}
    );
    return result.data;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.delete(`/v1/webhooks/${encodeURIComponent(webhookId)}`);
  }

  async listWebhooks(params?: ListParams): Promise<PaginatedResponse<Webhook>> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.per_page) query.set("per_page", String(params.per_page));
    return this.get<PaginatedResponse<Webhook>>(`/v1/webhooks?${query.toString()}`);
  }

  // ---- Suppression Methods ----

  async addSuppression(email: string, reason?: string): Promise<Suppression> {
    const result = await this.post<{ data: Suppression }>("/v1/suppressions", {
      email_address: email,
      reason: reason ?? "manual",
    });
    return result.data;
  }

  async deleteSuppression(email: string): Promise<void> {
    await this.delete(`/v1/suppressions/${encodeURIComponent(email)}`);
  }

  async listSuppressions(params?: ListParams): Promise<PaginatedResponse<Suppression>> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.per_page) query.set("per_page", String(params.per_page));
    return this.get<PaginatedResponse<Suppression>>(`/v1/suppressions?${query.toString()}`);
  }

  // ---- Contact List Methods ----

  async createContactList(params: CreateContactListParams): Promise<ContactList> {
    const result = await this.post<{ data: ContactList }>("/v1/contact-lists", params);
    return result.data;
  }

  async listContactLists(): Promise<ContactList[]> {
    const result = await this.get<{ data: ContactList[] }>("/v1/contact-lists");
    return result.data;
  }

  async getContactList(listId: string): Promise<ContactList> {
    const result = await this.get<{ data: ContactList }>(`/v1/contact-lists/${encodeURIComponent(listId)}`);
    return result.data;
  }

  async updateContactList(listId: string, params: UpdateContactListParams): Promise<ContactList> {
    const result = await this.put<{ data: ContactList }>(`/v1/contact-lists/${encodeURIComponent(listId)}`, params);
    return result.data;
  }

  async deleteContactList(listId: string): Promise<void> {
    await this.delete(`/v1/contact-lists/${encodeURIComponent(listId)}`);
  }

  async addContact(listId: string, params: AddContactParams): Promise<Contact> {
    const result = await this.post<{ data: Contact }>(
      `/v1/contact-lists/${encodeURIComponent(listId)}/contacts`,
      params
    );
    return result.data;
  }

  async bulkAddContacts(listId: string, params: BulkAddContactsParams): Promise<BulkAddContactsResponse> {
    const result = await this.post<{ data: BulkAddContactsResponse }>(
      `/v1/contact-lists/${encodeURIComponent(listId)}/contacts`,
      params
    );
    return result.data;
  }

  async listContacts(listId: string, params?: ListContactsParams): Promise<PaginatedResponse<Contact>> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.per_page) query.set("per_page", String(params.per_page));
    if (params?.status) query.set("status", params.status);
    return this.get<PaginatedResponse<Contact>>(
      `/v1/contact-lists/${encodeURIComponent(listId)}/contacts?${query.toString()}`
    );
  }

  async removeContact(listId: string, email: string): Promise<void> {
    await this.delete(
      `/v1/contact-lists/${encodeURIComponent(listId)}/contacts/${encodeURIComponent(email)}`
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
    const result = await this.get<{ data: InboundRoute }>(`/v1/inbound-routes/${encodeURIComponent(id)}`);
    return result.data;
  }

  async updateInboundRoute(id: string, params: UpdateInboundRouteParams): Promise<InboundRoute> {
    const result = await this.put<{ data: InboundRoute }>(`/v1/inbound-routes/${encodeURIComponent(id)}`, params);
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
    const result = await this.patch<{ data: SubAccount }>(`/v1/accounts/${encodeURIComponent(id)}`, params);
    return result.data;
  }

  async deleteSubAccount(id: string): Promise<void> {
    await this.delete(`/v1/accounts/${encodeURIComponent(id)}`);
  }

  async getSubAccountAnalytics(id: string, query?: AnalyticsQuery): Promise<AnalyticsSummary> {
    const params = this.buildAnalyticsQuery(query);
    return this.get<AnalyticsSummary>(`/v1/accounts/${encodeURIComponent(id)}/analytics?${params.toString()}`);
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

  async createSubAccountApiKey(subAccountId: string, params: CreateApiKeyParams): Promise<ApiKeyCreated> {
    const result = await this.post<{ data: ApiKeyCreated }>(
      `/v1/accounts/${encodeURIComponent(subAccountId)}/api-keys`,
      params
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
    const result = await this.get<{ data: Newsletter[] }>(
      `/v1/newsletters${qs ? `?${qs}` : ""}`,
    );
    return result.data;
  }

  async getNewsletter(id: string): Promise<Newsletter> {
    const result = await this.get<{ data: Newsletter }>(`/v1/newsletters/${encodeURIComponent(id)}`);
    return result.data;
  }

  async updateNewsletter(id: string, params: UpdateNewsletterParams): Promise<Newsletter> {
    const result = await this.put<{ data: Newsletter }>(`/v1/newsletters/${encodeURIComponent(id)}`, params);
    return result.data;
  }

  async deleteNewsletter(id: string): Promise<void> {
    await this.delete(`/v1/newsletters/${encodeURIComponent(id)}`);
  }

  async sendNewsletter(id: string): Promise<NewsletterSendResponse> {
    const result = await this.post<{ data: NewsletterSendResponse }>(
      `/v1/newsletters/${encodeURIComponent(id)}/send`,
      {}
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
    const result = await this.get<{ data: SignupForm }>(`/v1/signup-forms/${encodeURIComponent(id)}`);
    return result.data;
  }

  async updateSignupForm(id: string, params: UpdateSignupFormParams): Promise<SignupForm> {
    const result = await this.put<{ data: SignupForm }>(`/v1/signup-forms/${encodeURIComponent(id)}`, params);
    return result.data;
  }

  async deleteSignupForm(id: string): Promise<void> {
    await this.delete(`/v1/signup-forms/${encodeURIComponent(id)}`);
  }

  async toggleSignupForm(id: string): Promise<SignupForm> {
    const result = await this.post<{ data: SignupForm }>(
      `/v1/signup-forms/${encodeURIComponent(id)}/toggle`,
      {}
    );
    return result.data;
  }

  // ---- Email Validation Methods ----

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
    return this.request<GdprEraseResponse>("DELETE", `/v1/gdpr/erase?email=${encodeURIComponent(email)}`);
  }

  // ---- Agent Mailbox Methods ----

  async createMailbox(params?: CreateAgentMailboxParams): Promise<AgentMailbox> {
    const result = await this.post<{ data: AgentMailbox }>("/v1/agent-mailboxes", params ?? {});
    return result.data;
  }

  async listMailboxes(params?: ListAgentMailboxesParams): Promise<AgentMailbox[]> {
    const query = new URLSearchParams();
    if (params?.limit !== undefined) query.set("limit", String(params.limit));
    if (params?.offset !== undefined) query.set("offset", String(params.offset));
    const qs = query.toString();
    const result = await this.get<{ data: AgentMailbox[] }>(
      `/v1/agent-mailboxes${qs ? `?${qs}` : ""}`
    );
    return result.data;
  }

  async getMailbox(id: string): Promise<AgentMailbox> {
    const result = await this.get<{ data: AgentMailbox }>(
      `/v1/agent-mailboxes/${encodeURIComponent(id)}`
    );
    return result.data;
  }

  async deleteMailbox(id: string): Promise<void> {
    await this.delete(`/v1/agent-mailboxes/${encodeURIComponent(id)}`);
  }

  async listMessages(
    mailboxId: string,
    params?: ListMailboxMessagesParams
  ): Promise<MailboxMessage[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.limit !== undefined) query.set("limit", String(params.limit));
    if (params?.offset !== undefined) query.set("offset", String(params.offset));
    const qs = query.toString();
    const result = await this.get<{ data: MailboxMessage[] }>(
      `/v1/agent-mailboxes/${encodeURIComponent(mailboxId)}/messages${qs ? `?${qs}` : ""}`
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
    params?: WaitForNextMessageParams
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
      `/v1/agent-mailboxes/${encodeURIComponent(mailboxId)}/messages/${encodeURIComponent(messageId)}`
    );
  }

  async ackMessage(mailboxId: string, messageId: string, leaseToken: string): Promise<void> {
    await this.post(
      `/v1/agent-mailboxes/${encodeURIComponent(mailboxId)}/messages/${encodeURIComponent(messageId)}/ack`,
      { lease_token: leaseToken }
    );
  }

  async nackMessage(mailboxId: string, messageId: string, leaseToken: string): Promise<void> {
    await this.post(
      `/v1/agent-mailboxes/${encodeURIComponent(mailboxId)}/messages/${encodeURIComponent(messageId)}/nack`,
      { lease_token: leaseToken }
    );
  }

  // ---- HTTP Helpers ----

  private buildAnalyticsQuery(query?: AnalyticsQuery): URLSearchParams {
    const params = new URLSearchParams();
    if (query?.period) params.set("period", query.period);
    if (query?.from) params.set("from", query.from);
    if (query?.to) params.set("to", query.to);
    return params;
  }

  private async requestRaw(method: string, path: string, body?: unknown): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.apiKey}`,
        "User-Agent": USER_AGENT,
      };

      const init: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      if (body !== undefined) {
        headers["Content-Type"] = "application/json";
        headers["Accept"] = "application/json";
        init.body = JSON.stringify(body);
      }

      const response = await fetch(url, init);

      if (!response.ok) {
        throw await EuroMailError.fromResponse(response);
      }

      return response;
    } finally {
      clearTimeout(timer);
    }
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      };

      const init: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      if (body !== undefined) {
        headers["Content-Type"] = "application/json";
        init.body = JSON.stringify(body);
      }

      const response = await fetch(url, init);

      if (!response.ok) {
        throw await EuroMailError.fromResponse(response);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  private get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  private post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  private put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("PUT", path, body);
  }

  private patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("PATCH", path, body);
  }

  private delete(path: string): Promise<void> {
    return this.request<void>("DELETE", path);
  }
}
