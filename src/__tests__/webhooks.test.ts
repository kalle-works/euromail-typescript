import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { DEFAULT_TOLERANCE_SECONDS, verifyWebhookSignature } from "../webhooks.js";

const SECRET = "whsec_test_secret_do_not_use";
const TIMESTAMP = 1735689600;
const BODY =
  '{"event":"delivered","email_id":"018f2c3a-7b1e-7c3e-8b1a-2f6e9d4c5a01",' +
  '"account_id":"018f2c3a-7b1e-7c3e-8b1a-2f6e9d4c5a02","timestamp":"2025-01-01T00:00:00Z"}';
const EXPECTED_V1 = "d571fbef13b9e524d460f6f2c88f8d8dc7df3c50ff7aabdedd8a3656abb96dd0";

describe("verifyWebhookSignature", () => {
  it("matches the known signing test vector", () => {
    const header = `t=${TIMESTAMP},v1=${EXPECTED_V1}`;
    expect(verifyWebhookSignature(BODY, header, SECRET, DEFAULT_TOLERANCE_SECONDS, TIMESTAMP)).toBe(
      true,
    );
  });

  it("rejects a wrong secret", () => {
    const header = `t=${TIMESTAMP},v1=${EXPECTED_V1}`;
    expect(
      verifyWebhookSignature(BODY, header, "wrong-secret", DEFAULT_TOLERANCE_SECONDS, TIMESTAMP),
    ).toBe(false);
  });

  it("rejects a tampered body", () => {
    const header = `t=${TIMESTAMP},v1=${EXPECTED_V1}`;
    expect(
      verifyWebhookSignature(`${BODY}x`, header, SECRET, DEFAULT_TOLERANCE_SECONDS, TIMESTAMP),
    ).toBe(false);
  });

  it("rejects a timestamp outside the tolerance window", () => {
    const header = `t=${TIMESTAMP},v1=${EXPECTED_V1}`;
    const outside = TIMESTAMP + DEFAULT_TOLERANCE_SECONDS + 1;
    expect(verifyWebhookSignature(BODY, header, SECRET, DEFAULT_TOLERANCE_SECONDS, outside)).toBe(
      false,
    );
  });

  it("accepts a timestamp exactly at the tolerance boundary", () => {
    const header = `t=${TIMESTAMP},v1=${EXPECTED_V1}`;
    const boundary = TIMESTAMP + DEFAULT_TOLERANCE_SECONDS;
    expect(verifyWebhookSignature(BODY, header, SECRET, DEFAULT_TOLERANCE_SECONDS, boundary)).toBe(
      true,
    );
  });

  it("rejects a missing header", () => {
    expect(verifyWebhookSignature(BODY, null, SECRET)).toBe(false);
    expect(verifyWebhookSignature(BODY, undefined, SECRET)).toBe(false);
  });

  it("rejects a malformed header", () => {
    expect(
      verifyWebhookSignature(
        BODY,
        "not-a-valid-header",
        SECRET,
        DEFAULT_TOLERANCE_SECONDS,
        TIMESTAMP,
      ),
    ).toBe(false);
  });

  it("supports secret rotation with multiple v1 entries", () => {
    const oldSecret = "whsec_old";
    const newSecret = "whsec_new";
    const signedPayload = `${TIMESTAMP}.${BODY}`;
    const oldSig = createHmac("sha256", oldSecret).update(signedPayload).digest("hex");
    const newSig = createHmac("sha256", newSecret).update(signedPayload).digest("hex");
    const header = `t=${TIMESTAMP},v1=${oldSig},v1=${newSig}`;

    expect(
      verifyWebhookSignature(BODY, header, oldSecret, DEFAULT_TOLERANCE_SECONDS, TIMESTAMP),
    ).toBe(true);
    expect(
      verifyWebhookSignature(BODY, header, newSecret, DEFAULT_TOLERANCE_SECONDS, TIMESTAMP),
    ).toBe(true);
  });

  it("does not throw on a signature of the wrong length", () => {
    const header = `t=${TIMESTAMP},v1=deadbeef`;
    expect(() =>
      verifyWebhookSignature(BODY, header, SECRET, DEFAULT_TOLERANCE_SECONDS, TIMESTAMP),
    ).not.toThrow();
    expect(verifyWebhookSignature(BODY, header, SECRET, DEFAULT_TOLERANCE_SECONDS, TIMESTAMP)).toBe(
      false,
    );
  });
});
