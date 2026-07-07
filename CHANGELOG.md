# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-07-07

### Added

- Agent mailbox methods bringing the SDK to full parity with the server API: `replyToMessage`, `listMailboxThreads`, `getMailboxThread`, `searchMailboxMessages`, `updateMessageLabels`, `getMessageAttachmentUrls`, `listMailboxContacts`, `getMailboxAnalytics`, and `updateAutoResponder`.
- Types: `ReplyToMessageParams`, `MailboxReplyResult`, `ListMailboxThreadsParams`, `GetMailboxThreadParams`, `SearchMailboxMessagesParams`, `MailboxAttachmentUrl`, `ListMailboxContactsParams`, `MailboxContact`, `MailboxAnalytics`, `UpdateAutoResponderParams`, `AutoResponderConfig`.
- `MailboxMessage`: added `in_reply_to`, `references_header`, `attachments_stored`, `attachments_metadata`, `classification`, `classification_confidence`, `classified_at`, `leased_until`, and `lease_token` to match the full server row.
- `AgentMailbox`: added `webhook_filters`, `auto_responder_enabled`, and `auto_responder_rules`.

## [0.3.0] - 2026-07-07

### Added

- `SendEmailParams`: `send_at` (schedule delivery), `tracking` (per-email open/click override), `transactional` (opt out of the default `List-Unsubscribe`-suppressing behavior for marketing/newsletter sends), and `stream` (route through a named message stream) — brings `sendEmail`/`sendBatch` up to date with the current `/v1/emails` API.
- `BroadcastParams`: `tracking` and `transactional` overrides for `sendBroadcast`.

## [0.2.0] - 2026-04-13

### Added

- Native agent mailbox support: `createMailbox`, `listMailboxes`, `getMailbox`, `deleteMailbox`, `listMessages`, `waitForNextMessage`, `deleteMessage`, `ackMessage`, `nackMessage`.
- Long-poll `waitForNextMessage` returns `null` on HTTP 408 timeout so callers can loop without try/catch.
- Types: `AgentMailbox`, `CreateAgentMailboxParams`, `ListAgentMailboxesParams`, `MailboxMessage`, `ListMailboxMessagesParams`, `WaitForNextMessageParams`, `LeasedMessage`.

## [0.1.2] - 2026-04-13

### Added

- `getEmailLinks` method to retrieve click statistics for tracked links in a sent email.
- `generateInsights` method to generate deliverability insight reports.
- `LinkClickStat`, `InsightSeverity`, `InsightArea`, `InsightFinding`, and `InsightReport` types.

## [0.1.1] - 2026-04-12

### Fixed

- Added CommonJS `require` export for compatibility with non-ESM projects.
- Updated repository URLs to point to the correct GitHub location.

## [0.1.0] - 2026-04-11

### Added

- Initial release of the `@euromail/sdk` TypeScript SDK.
- Full API coverage: emails, templates, domains, webhooks, suppressions, contact lists, newsletters, signup forms, analytics, audit logs, dead letters, inbound email, API keys, billing, GDPR, and email validation.
- Typed error classes: `EuroMailError`, `AuthenticationError`, `ValidationError`, `RateLimitError`.
- Automatic `EUROMAIL_API_URL` environment variable support for base URL.
- Configurable timeout with 30-second default.
