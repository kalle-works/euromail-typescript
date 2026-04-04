# @euromail/sdk

Official TypeScript SDK for the [EuroMail](https://euromail.dev) transactional email service.

## Installation

```bash
npm install @euromail/sdk
```

## Quick Start

```typescript
import { EuroMail } from "@euromail/sdk";

const euromail = new EuroMail({
  apiKey: "em_live_your_api_key_here",
});

const result = await euromail.sendEmail({
  from: "sender@yourdomain.com",
  to: "recipient@example.com",
  subject: "Hello from EuroMail",
  html_body: "<h1>Welcome!</h1><p>Your account is ready.</p>",
});

console.log(`Email queued: ${result.id}`);
```

## Configuration

```typescript
const euromail = new EuroMail({
  apiKey: "em_live_...",     // Required
  timeout: 30000,            // Default: 30000ms
});
```

## Sending Emails

### Direct send

```typescript
const result = await euromail.sendEmail({
  from: "noreply@yourdomain.com",
  to: "user@example.com",
  subject: "Order Confirmation",
  html_body: "<h1>Thanks for your order!</h1>",
  text_body: "Thanks for your order!",
  reply_to: "support@yourdomain.com",
  tags: ["order", "confirmation"],
  metadata: { order_id: "12345" },
});
```

### Send with template

```typescript
await euromail.sendEmail({
  from: "noreply@yourdomain.com",
  to: "user@example.com",
  template_alias: "welcome-email",
  template_data: {
    name: "John",
    activation_url: "https://example.com/activate/abc123",
  },
});
```

### Send with attachments

```typescript
await euromail.sendEmail({
  from: "noreply@yourdomain.com",
  to: "user@example.com",
  subject: "Your Invoice",
  html_body: "<p>Please find your invoice attached.</p>",
  attachments: [
    {
      filename: "invoice.pdf",
      content: base64EncodedContent,
      content_type: "application/pdf",
    },
  ],
});
```

### Batch send

```typescript
const batch = await euromail.sendBatch({
  emails: [
    {
      from: "noreply@yourdomain.com",
      to: "user1@example.com",
      subject: "Hello User 1",
      text_body: "Welcome aboard!",
    },
    {
      from: "noreply@yourdomain.com",
      to: "user2@example.com",
      subject: "Hello User 2",
      text_body: "Welcome aboard!",
    },
  ],
});

console.log(`Sent: ${batch.data.length}, Errors: ${batch.errors.length}`);
```

### Idempotent sends

```typescript
await euromail.sendEmail({
  from: "noreply@yourdomain.com",
  to: "user@example.com",
  subject: "Payment Receipt",
  html_body: "<p>Payment received.</p>",
  idempotency_key: "payment-receipt-12345",
});
```

### Retrieve and list emails

```typescript
const email = await euromail.getEmail("email-uuid");

const emails = await euromail.listEmails({
  page: 1,
  per_page: 50,
  status: "delivered",
});
```

## Domains

```typescript
// Add a sending domain
const domain = await euromail.addDomain("mail.yourdomain.com");
console.log("Configure these DNS records:", domain.dns_records);

// Trigger verification
const verification = await euromail.verifyDomain(domain.id);
if (verification.fully_verified) {
  console.log("Domain verified! SPF, DKIM, DMARC, and return-path all confirmed.");
}

// List all domains
const domains = await euromail.listDomains({ page: 1, per_page: 25 });

// Remove a domain
await euromail.deleteDomain(domain.id);
```

## Templates

```typescript
// Create a template with Jinja2-style variables
const template = await euromail.createTemplate({
  alias: "welcome-email",
  name: "Welcome Email",
  subject: "Welcome, {{ name }}!",
  html_body: "<h1>Hello {{ name }}</h1><p>Welcome to {{ company }}.</p>",
  text_body: "Hello {{ name }}, welcome to {{ company }}.",
});

// Update a template
await euromail.updateTemplate(template.id, {
  subject: "Welcome to {{ company }}, {{ name }}!",
});

// List and delete
const templates = await euromail.listTemplates({ page: 1, per_page: 25 });
await euromail.deleteTemplate(template.id);
```

## Webhooks

```typescript
// Subscribe to delivery events
const webhook = await euromail.createWebhook({
  url: "https://yourdomain.com/webhooks/euromail",
  events: ["delivered", "bounced", "complained", "email.inbound"],
});

// Update webhook
await euromail.updateWebhook(webhook.id, {
  url: "https://yourdomain.com/webhooks/v2",
  events: ["delivered", "bounced"],
  is_active: true,
});

// Send a test event
const test = await euromail.testWebhook(webhook.id);

// List and delete
const webhooks = await euromail.listWebhooks();
await euromail.deleteWebhook(webhook.id);
```

Supported events: `sent`, `delivered`, `bounced`, `opened`, `clicked`, `complained`, `email.inbound`

## Suppressions

```typescript
// Suppress an address manually
await euromail.addSuppression("bounced@example.com", "hard_bounce");

// List all suppressions
const suppressions = await euromail.listSuppressions({ page: 1, per_page: 50 });

// Remove a suppression
await euromail.deleteSuppression("bounced@example.com");
```

## Contact Lists

```typescript
// Create a list with double opt-in
const list = await euromail.createContactList({
  name: "Newsletter",
  description: "Monthly product updates",
  double_opt_in: true,
});

// Add a single contact
const contact = await euromail.addContact(list.id, {
  email: "user@example.com",
  metadata: { first_name: "Jane", source: "signup" },
});

// Bulk add contacts
const result = await euromail.bulkAddContacts(list.id, {
  contacts: [
    { email: "a@example.com", metadata: { name: "Alice" } },
    { email: "b@example.com", metadata: { name: "Bob" } },
  ],
});
console.log(`Inserted: ${result.inserted} of ${result.total_requested}`);

// List contacts with filters
const contacts = await euromail.listContacts(list.id, {
  page: 1,
  per_page: 50,
  status: "active",
});

// Remove a contact and delete the list
await euromail.removeContact(list.id, "user@example.com");
await euromail.deleteContactList(list.id);
```

## Inbound Email

```typescript
// List received emails
const inbound = await euromail.listInboundEmails({ page: 1, per_page: 25 });

// Get details
const email = await euromail.getInboundEmail("inbound-uuid");
console.log(`From: ${email.from_address}, Subject: ${email.subject}`);

// Delete
await euromail.deleteInboundEmail("inbound-uuid");
```

## Inbound Routes

```typescript
// Route incoming email to a webhook
const route = await euromail.createInboundRoute({
  domain_id: "domain-uuid",
  pattern: "support@",
  match_type: "prefix",
  priority: 10,
  webhook_url: "https://yourdomain.com/inbound/support",
});

// Update route
await euromail.updateInboundRoute(route.id, {
  webhook_url: "https://yourdomain.com/inbound/v2",
  is_active: true,
});

// Catch-all route
await euromail.createInboundRoute({
  domain_id: "domain-uuid",
  pattern: "*",
  match_type: "catch_all",
  priority: 100,
});

// List and delete
const routes = await euromail.listInboundRoutes();
await euromail.deleteInboundRoute(route.id);
```

## Analytics

```typescript
// Overview for the last 30 days
const overview = await euromail.getAnalyticsOverview({ period: "30d" });
console.log(`Delivery rate: ${overview.data.delivery_rate}%`);

// Custom date range
const custom = await euromail.getAnalyticsOverview({
  from: "2025-01-01",
  to: "2025-01-31",
});

// Time series data
const timeseries = await euromail.getAnalyticsTimeseries({
  period: "7d",
  metrics: "sent,delivered,bounced",
});

// Per-domain breakdown
const domains = await euromail.getAnalyticsDomains({
  period: "30d",
  limit: 10,
});

// Export as CSV
const csv = await euromail.exportAnalyticsCsv({ period: "30d" });
```

## Account

```typescript
const account = await euromail.getAccount();
console.log(`Plan: ${account.plan}, Used: ${account.emails_sent_this_month}/${account.monthly_quota}`);

// Export all account data (GDPR)
const exportData = await euromail.exportAccount();

// Delete account permanently
await euromail.deleteAccount();
```

## Audit Logs

```typescript
const logs = await euromail.listAuditLogs({ page: 1, per_page: 50 });
for (const log of logs.data) {
  console.log(`${log.created_at}: ${log.action} on ${log.resource_type}`);
}
```

## Dead Letters

```typescript
// List failed emails
const deadLetters = await euromail.listDeadLetters({ count: 20 });

// Retry delivery
await euromail.retryDeadLetter("dead-letter-uuid");

// Remove permanently
await euromail.deleteDeadLetter("dead-letter-uuid");
```

## Error Handling

All API errors throw typed exceptions:

```typescript
import {
  EuroMail,
  EuroMailError,
  AuthenticationError,
  RateLimitError,
  ValidationError,
} from "@euromail/sdk";

try {
  await euromail.sendEmail({ ... });
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Invalid or missing API key (401)
    console.error("Check your API key");
  } else if (error instanceof ValidationError) {
    // Invalid request parameters (422)
    console.error(`${error.code}: ${error.message}`);
  } else if (error instanceof RateLimitError) {
    // Too many requests (429)
    console.error(`Retry after ${error.retryAfter} seconds`);
  } else if (error instanceof EuroMailError) {
    // Other API errors (4xx/5xx)
    console.error(`[${error.status}] ${error.code}: ${error.message}`);
  }
}
```

## API Reference

| Category | Method | Description |
|---|---|---|
| **Emails** | `sendEmail(params)` | Send a single email |
| | `sendBatch(params)` | Send up to 500 emails in one request |
| | `getEmail(id)` | Get email details and status |
| | `listEmails(params?)` | List emails with pagination and status filter |
| **Templates** | `createTemplate(params)` | Create an email template |
| | `getTemplate(id)` | Get template by ID |
| | `updateTemplate(id, params)` | Update template fields |
| | `deleteTemplate(id)` | Delete a template |
| | `listTemplates(params?)` | List templates with pagination |
| **Domains** | `addDomain(domain)` | Register a sending domain |
| | `getDomain(id)` | Get domain details and DNS records |
| | `verifyDomain(id)` | Trigger DNS verification |
| | `deleteDomain(id)` | Remove a domain |
| | `listDomains(params?)` | List domains with pagination |
| **Webhooks** | `createWebhook(params)` | Subscribe to events |
| | `getWebhook(id)` | Get webhook details |
| | `updateWebhook(id, params)` | Update URL, events, or status |
| | `testWebhook(id)` | Send a test event |
| | `deleteWebhook(id)` | Remove a webhook |
| | `listWebhooks(params?)` | List webhooks with pagination |
| **Suppressions** | `addSuppression(email, reason?)` | Suppress an email address |
| | `deleteSuppression(email)` | Remove a suppression |
| | `listSuppressions(params?)` | List suppressions with pagination |
| **Contact Lists** | `createContactList(params)` | Create a contact list |
| | `getContactList(id)` | Get list details |
| | `updateContactList(id, params)` | Update list settings |
| | `deleteContactList(id)` | Delete a list |
| | `listContactLists()` | List all contact lists |
| | `addContact(listId, params)` | Add a contact to a list |
| | `bulkAddContacts(listId, params)` | Add multiple contacts |
| | `listContacts(listId, params?)` | List contacts with filters |
| | `removeContact(listId, email)` | Remove a contact |
| **Inbound** | `listInboundEmails(params?)` | List received emails |
| | `getInboundEmail(id)` | Get inbound email details |
| | `deleteInboundEmail(id)` | Delete an inbound email |
| **Inbound Routes** | `createInboundRoute(params)` | Create a routing rule |
| | `getInboundRoute(id)` | Get route details |
| | `updateInboundRoute(id, params)` | Update a route |
| | `deleteInboundRoute(id)` | Delete a route |
| | `listInboundRoutes(params?)` | List routes with pagination |
| **Analytics** | `getAnalyticsOverview(query?)` | Aggregated delivery stats |
| | `getAnalyticsTimeseries(query?)` | Daily metrics over time |
| | `getAnalyticsDomains(query?)` | Per-domain breakdown |
| | `exportAnalyticsCsv(query?)` | Export stats as CSV |
| **Audit Logs** | `listAuditLogs(params?)` | List account activity |
| **Dead Letters** | `listDeadLetters(params?)` | List permanently failed emails |
| | `retryDeadLetter(id)` | Retry delivery |
| | `deleteDeadLetter(id)` | Remove from dead letter queue |
| **Account** | `getAccount()` | Get account info and quota |
| | `exportAccount()` | Export all account data |
| | `deleteAccount()` | Permanently delete account |

## Requirements

- Node.js 18+ (uses native `fetch`)
- TypeScript 5.0+ (for type definitions)

## License

MIT

