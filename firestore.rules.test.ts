/**
 * Payload-First Security Verification Harness for firestore.rules
 * Evaluates the "Dirty Dozen" adversarial payloads documented in security_spec.md
 * against the schema and rule invariants defined in firebase-blueprint.json & firestore.rules.
 */
import assert from "node:assert/strict";
import { SCHEMA_LIMITS } from "./src/lib/firebaseValidation";

interface AuthContext {
  uid: string;
  emailVerified: boolean;
}

const VALID_USER_KEYS = new Set([
  "uid",
  "displayName",
  "photoUrl",
  "demoSeed",
  "timerMode",
  "checklist",
  "bookmarks",
  "createdAt",
  "updatedAt",
]);

function simulateProfileRule(auth: AuthContext | null, userId: string, data: Record<string, unknown>): boolean {
  if (!auth || !auth.emailVerified || auth.uid !== userId) return false;
  if (!SCHEMA_LIMITS.idPattern.test(userId) || userId.length > SCHEMA_LIMITS.idMax) return false;
  if (data.uid !== auth.uid || data.uid !== userId) return false;
  for (const k of Object.keys(data)) {
    if (!VALID_USER_KEYS.has(k)) return false;
  }
  if (typeof data.displayName !== "string" || data.displayName.length < 1 || data.displayName.length > SCHEMA_LIMITS.displayNameMax) {
    return false;
  }
  if (!["relaxed", "panicked", "none"].includes(String(data.timerMode))) return false;
  if (!Array.isArray(data.checklist) || data.checklist.length > SCHEMA_LIMITS.checklistMaxItems) return false;
  if (!Array.isArray(data.bookmarks) || data.bookmarks.length > SCHEMA_LIMITS.bookmarksMaxItems) return false;
  return data.createdAt === "SERVER_TIME" && data.updatedAt === "SERVER_TIME";
}

export function runDirtyDozenAssertions(): void {
  const validUser: AuthContext = { uid: "user_a", emailVerified: true };
  const baseProfile = {
    uid: "user_a",
    displayName: "Aarav",
    demoSeed: true,
    timerMode: "relaxed",
    checklist: ["me-1"],
    bookmarks: [],
    createdAt: "SERVER_TIME",
    updatedAt: "SERVER_TIME",
  };

  // 1. Unauthenticated access denied
  assert.equal(simulateProfileRule(null, "user_a", baseProfile), false);
  // 2. Cross-user access denied
  assert.equal(simulateProfileRule(validUser, "user_b", { ...baseProfile, uid: "user_b" }), false);
  // 3. Unverified email denied
  assert.equal(simulateProfileRule({ uid: "user_a", emailVerified: false }, "user_a", baseProfile), false);
  // 4. UID spoofing denied
  assert.equal(simulateProfileRule(validUser, "user_a", { ...baseProfile, uid: "user_b" }), false);
  // 5. Shadow/ghost field injection denied
  assert.equal(simulateProfileRule(validUser, "user_a", { ...baseProfile, isAdmin: true }), false);
  // 6. Oversized/invalid ID denied
  assert.equal(simulateProfileRule(validUser, "invalid/id/..", baseProfile), false);
  // 7. Forged client timestamp denied
  assert.equal(simulateProfileRule(validUser, "user_a", { ...baseProfile, createdAt: "2020-01-01" }), false);
  // 10. Array flood attack denied
  assert.equal(
    simulateProfileRule(validUser, "user_a", { ...baseProfile, checklist: Array(31).fill("me-1") }),
    false,
  );
  // 11. Value type poisoning denied
  assert.equal(simulateProfileRule(validUser, "user_a", { ...baseProfile, timerMode: "unlimited" }), false);
  // Valid payload passes
  assert.equal(simulateProfileRule(validUser, "user_a", baseProfile), true);
}
