/**
 * EuroMail TypeScript SDK — comprehensive example exercising every method.
 *
 * Usage:
 *   EUROMAIL_API_KEY=em_live_... npx tsx examples/all-methods.ts
 */
import { EuroMail } from "../src/index.js";

const client = new EuroMail({ apiKey: process.env.EUROMAIL_API_KEY! });

async function main() {
  // ---- Account ----
  const account = await client.getAccount();
  console.log(`Account: ${account.name} (${account.plan})`);

  // ---- API Keys ----
  const apiKey = await client.createApiKey({ name: "test-key", scopes: ["emails:send"] });
  console.log(`Created API key: ${apiKey.key_prefix}... (id: ${apiKey.id})`);

  const keys = await client.listApiKeys();
  console.log(`API keys: ${keys.length}`);

  await client.deleteApiKey(apiKey.id);
  console.log("Deleted API key");

  // ---- Domains ----
  const testDomain = "test-sdk-example.com";
  const domain = await client.addDomain(testDomain);
  console.log(`Added domain: ${domain.domain} (id: ${domain.id})`);

  const domainDetail = await client.getDomain(domain.id);
  console.log(`Domain DKIM selector: ${domainDetail.dkim_selector}`);

  const verification = await client.verifyDomain(domain.id);
  console.log(`Domain SPF verified: ${verification.checks.spf?.verified}`);

  const domains = await client.listDomains({ page: 1, per_page: 10 });
  console.log(`Domains: ${domains.data.length} total`);

  // Tracking domain
  try {
    const tracking = await client.setTrackingDomain(domain.id, "track.test-sdk-example.com");
    console.log(`Tracking domain CNAME target: ${tracking.cname_target}`);

    const trackVerify = await client.verifyTrackingDomain(domain.id);
    console.log(`Tracking verified: ${trackVerify.tracking_check.verified}`);

    await client.removeTrackingDomain(domain.id);
    console.log("Removed tracking domain");
  } catch (e: any) {
    console.log(`Tracking domain: ${e.message}`);
  }

  await client.deleteDomain(domain.id);
  console.log("Deleted domain");

  // ---- Templates ----
  const templateAlias = `test-welcome-${Date.now()}`;
  const template = await client.createTemplate({
    alias: templateAlias,
    name: "Test Welcome",
    subject: "Welcome {{ name }}!",
    html_body: "<p>Hello {{ name }}</p>",
  });
  console.log(`Created template: ${template.alias} (id: ${template.id})`);

  const tmpl = await client.getTemplate(template.id);
  console.log(`Template subject: ${tmpl.subject}`);

  const updated = await client.updateTemplate(template.id, {
    name: "Updated Welcome",
    subject: template.subject,
    html_body: "<p>Updated {{ name }}</p>",
  });
  console.log(`Updated template name: ${updated.name}`);

  const templates = await client.listTemplates({ page: 1, per_page: 10 });
  console.log(`Templates: ${templates.data.length}`);

  await client.deleteTemplate(template.id);
  console.log("Deleted template");

  // ---- Emails ----
  const sent = await client.sendEmail({
    from: `test@${account.email.split("@")[1]}`,
    to: account.email,
    subject: "SDK test",
    text_body: "Hello from the TypeScript SDK example!",
  });
  console.log(`Sent email: ${sent.id} (status: ${sent.status})`);

  const email = await client.getEmail(sent.id) as any;
  console.log(`Email to: ${email.email?.to_address ?? email.to_address}`);

  const emails = await client.listEmails({ page: 1, per_page: 5 });
  console.log(`Emails: ${emails.data.length}`);

  // ---- Email Validation ----
  const validation = await client.validateEmail("test@example.com");
  console.log(`Validation: valid=${validation.valid}, deliverable=${validation.deliverable}`);

  // ---- Webhooks ----
  const webhook = await client.createWebhook({
    url: "https://httpbin.org/post",
    events: ["delivered", "bounced"],
  });
  console.log(`Created webhook: ${webhook.id}`);

  const wh = await client.getWebhook(webhook.id);
  console.log(`Webhook events: ${wh.events.join(", ")}`);

  const updatedWh = await client.updateWebhook(webhook.id, {
    url: "https://httpbin.org/post",
    events: ["delivered", "bounced", "opened"],
    is_active: true,
  });
  console.log(`Updated webhook events: ${updatedWh.events.join(", ")}`);

  const webhooks = await client.listWebhooks({ page: 1, per_page: 10 });
  console.log(`Webhooks: ${webhooks.data.length}`);

  try {
    const test = await client.testWebhook(webhook.id);
    console.log(`Webhook test: ${test.message}`);
  } catch (e: any) {
    console.log(`Webhook test: ${e.message}`);
  }

  await client.deleteWebhook(webhook.id);
  console.log("Deleted webhook");

  // ---- Suppressions ----
  const suppression = await client.addSuppression("blocked@example.com", "manual");
  console.log(`Added suppression: ${suppression.email_address}`);

  const suppressions = await client.listSuppressions({ page: 1, per_page: 10 });
  console.log(`Suppressions: ${suppressions.data.length}`);

  await client.deleteSuppression("blocked@example.com");
  console.log("Deleted suppression");

  // ---- Contact Lists ----
  const list = await client.createContactList({ name: "SDK Test List" });
  console.log(`Created list: ${list.name} (id: ${list.id})`);

  const contact = await client.addContact(list.id, { email: "user@example.com" });
  console.log(`Added contact: ${contact.email}`);

  const bulk = await client.bulkAddContacts(list.id, {
    contacts: [
      { email: "a@example.com" },
      { email: "b@example.com" },
    ],
  });
  console.log(`Bulk added: ${bulk.inserted}/${bulk.total_requested}`);

  const contacts = await client.listContacts(list.id, { page: 1, per_page: 10 });
  console.log(`Contacts: ${contacts.data.length}`);

  await client.removeContact(list.id, "user@example.com");
  console.log("Removed contact");

  const updatedList = await client.updateContactList(list.id, {
    name: "Updated List",
    double_opt_in: false,
  });
  console.log(`Updated list: ${updatedList.name}`);

  const lists = await client.listContactLists();
  console.log(`Contact lists: ${lists.length}`);

  const listDetail = await client.getContactList(list.id);
  console.log(`List contacts: ${listDetail.contact_count}`);

  await client.deleteContactList(list.id);
  console.log("Deleted contact list");

  // ---- Newsletters ----
  const nl = await client.createNewsletter({
    list_id: "00000000-0000-0000-0000-000000000000", // placeholder
    subject: "Test Newsletter",
    from_address: account.email,
    html_body: "<p>Newsletter content</p>",
  }).catch((e: any) => { console.log(`Newsletter create: ${e.message}`); return null; });

  if (nl) {
    const nlDetail = await client.getNewsletter(nl.id);
    console.log(`Newsletter: ${nlDetail.subject} (status: ${nlDetail.status})`);

    const updatedNl = await client.updateNewsletter(nl.id, { subject: "Updated Newsletter" });
    console.log(`Updated newsletter: ${updatedNl.subject}`);

    const newsletters = await client.listNewsletters({ page: 1, per_page: 10 });
    console.log(`Newsletters: ${newsletters.length}`);

    await client.deleteNewsletter(nl.id);
    console.log("Deleted newsletter");
  }

  // ---- Analytics ----
  const overview = await client.getAnalyticsOverview({ period: "30d" });
  console.log(`Analytics: ${overview.data.sent} sent, ${overview.data.delivered} delivered`);

  const timeseries = await client.getAnalyticsTimeseries({ period: "7d" });
  console.log(`Timeseries points: ${timeseries.data.length}`);

  const domainStats = await client.getAnalyticsDomains({ period: "30d", limit: 5 });
  console.log(`Domain analytics: ${domainStats.data.length} domains`);

  const csv = await client.exportAnalyticsCsv({ period: "7d" });
  console.log(`CSV export: ${csv.length} bytes`);

  // ---- Operations ----
  const ops = await client.listOperations({ page: 1, per_page: 5 });
  console.log(`Operations: ${ops.data.length}`);

  // ---- Audit Logs ----
  const logs = await client.listAuditLogs({ page: 1, per_page: 5 });
  console.log(`Audit logs: ${logs.data.length}`);

  // ---- Dead Letters ----
  const deadLetters = await client.listDeadLetters({ count: 5 });
  console.log(`Dead letters: ${deadLetters.length}`);

  // ---- Inbound ----
  const inbound = await client.listInboundEmails({ page: 1, per_page: 5 });
  console.log(`Inbound emails: ${inbound.data.length}`);

  const routes = await client.listInboundRoutes({ page: 1, per_page: 5 });
  console.log(`Inbound routes: ${routes.data.length}`);

  // ---- Billing ----
  const plans = await client.listPlans();
  console.log(`Plans: ${plans.map((p) => p.plan).join(", ")}`);

  const sub = await client.getSubscription();
  console.log(`Subscription: ${sub.plan} (${sub.subscription_status})`);

  // ---- GDPR ----
  try {
    const gdpr = await client.gdprExport("test@example.com");
    console.log(`GDPR export: ${gdpr.data.email_address}`);
  } catch (e: any) {
    console.log(`GDPR export: ${e.message}`);
  }

  console.log("\nAll methods exercised successfully!");
}

main().catch(console.error);
