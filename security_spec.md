# Firestore Security Specification

## 1. Data Invariants
1. **Strict Ownership & Email Verification**: Every document in `/users/{userId}`, `/users/{userId}/attempts/{attemptId}`, and `/users/{userId}/events/{eventId}` is strictly private to the authenticated, email-verified user whose `request.auth.uid == userId`.
2. **No Cross-User Listing**: Listing `/users` is forbidden (`allow list: if false`). Listing `/attempts` or `/events` requires `isOwner(userId)` AND `resource.data.userId == request.auth.uid`.
3. **Master Gate Relational Integrity**: Creating, updating, or deleting documents in `attempts` or `events` requires the parent `/users/{userId}` document to exist with `uid == request.auth.uid`.
4. **Immutable Ownership & Timestamps**: `uid`, `userId`, `id`, and `createdAt` are immutable once created. All `createdAt` and `updatedAt` timestamps must equal `request.time`.
5. **Terminal Quiz Attachment**: An attempt may be updated **only once** to attach `quiz` when `!('quiz' in existing())`, leaving `drillId`, `seed`, `grade`, `userId`, and `createdAt` unchanged.
6. **Append-Only Events**: `AnalyticsEventRecord` documents in `/users/{userId}/events/{eventId}` cannot be updated (`allow update: if false`).
7. **PII Avoidance**: Email addresses are never stored in Firestore documents; only Firebase Auth holds the verified Google identity.

## 2. The "Dirty Dozen" Attack Payloads (All Must Fail with PERMISSION_DENIED)

1. **Unauthenticated Profile Read (`GET /users/user_a`)**: `request.auth == null`.
2. **Cross-User Profile Read (`GET /users/user_b` as `user_a`)**: `request.auth.uid != userId`.
3. **Unverified Email Write (`CREATE /users/user_a`)**: `request.auth.token.email_verified == false`.
4. **UID Spoofing on Profile Create (`CREATE /users/user_a`)**: `{ "uid": "user_b", "displayName": "Mallory", ... }`.
5. **Shadow / Ghost Field Injection (`CREATE /users/user_a`)**: `{ "uid": "user_a", ..., "isAdmin": true, "role": "admin" }`.
6. **Oversized ID Poisoning (`CREATE /users/user_a/attempts/<200-char-invalid-id>`)**: Document ID fails `isValidId()` (`size() <= 128 && matches('^[a-zA-Z0-9_\\-]+$')`).
7. **Client Timestamp Forgery (`CREATE /users/user_a`)**: `{ "createdAt": "2020-01-01T00:00:00Z", "updatedAt": "2020-01-01T00:00:00Z" }` instead of `request.time`.
8. **Score Tampering on Attempt Update (`UPDATE /users/user_a/attempts/att_1`)**: Updating `grade.total` from `20` to `100` (`affectedKeys()` does not match `['quiz', 'updatedAt']`).
9. **Double Quiz Overwrite (`UPDATE /users/user_a/attempts/att_1`)**: Updating `quiz` when `quiz` already exists on `existing()` (terminal state locking).
10. **Array Flood Attack (`UPDATE /users/user_a`)**: Sending `checklist` with 31+ items (`size() <= 30`) or `bookmarks` with 101+ items (`size() <= 100`).
11. **Value Type Poisoning (`UPDATE /users/user_a`)**: Sending `displayName: 12345` or `timerMode: "unlimited"` instead of allowed enum/string types.
12. **Event Mutation Attack (`UPDATE /users/user_a/events/ev_1`)**: Attempting to alter `correct: true` on a stored analytics event (`allow update: if false`).
