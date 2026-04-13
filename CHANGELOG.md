# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
