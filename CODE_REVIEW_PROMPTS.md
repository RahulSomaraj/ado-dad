# Reusable Code Review Prompts

Project-agnostic review prompts. Each one focuses on **one concern** and works on **any codebase**
(any language/framework). Use them one at a time. There are two families:

- **Full-scan prompts** — point at a whole repo or a directory. (Sections 1–6)
- **Change/diff prompt** — point at a PR, a commit range, or a set of edited files. (Section 7)

### How to use
Replace the `{{PLACEHOLDERS}}` and paste the prompt to the reviewer (or say "run the security prompt on `src/`").

- `{{TARGET}}` — repo root, a folder (`src/`), or a file list.
- `{{STACK}}` — optional one-liner of the stack (e.g. "NestJS + MongoDB + Redis, JWT auth"). Helps but not required.
- `{{DIFF}}` — a branch/PR (`feature-x vs main`), a commit range (`abc123..def456`), or "the currently staged changes".

### Output contract (all prompts share this)
Report findings as a table ranked most-severe first. Each row:

| Severity | Location (file:line) | Category | Finding — what & why it matters | Concrete fix |

Severity scale: **Critical** (exploitable now / data loss) · **High** (serious, likely) · **Medium** ·
**Low** · **Info**. For every Critical/High give a concrete failure scenario (specific inputs → bad outcome).
If you cannot verify something without running it, label it **Needs verification** rather than guessing.
End with: (a) 3–5 systemic themes, (b) a prioritized fix order, (c) what's already done well.
Do not change any code — review only.

---

## 1. Security Review Prompt

```
You are a senior application security engineer. Perform a SECURITY review of {{TARGET}}.
Stack (if given): {{STACK}}. Read the code before judging; follow imports where trust boundaries cross.

Assess against these areas and report concrete, exploitable findings only (no generic advice):

AUTHENTICATION & SESSIONS
- Token/session signing & verification: hardcoded or fallback secrets, weak algorithms, alg-confusion,
  missing signature/issuer/audience/expiry checks, tokens that can't be revoked.
- Password & credential handling: hashing algorithm and cost, timing-safe comparisons, credential logging.
- OTP / MFA / reset flows: randomness source (crypto vs Math.random), expiry, attempt limits, replay.
- Brute-force protection: rate limiting / lockout on login, OTP, reset, and other guessable endpoints.
- Account enumeration via differing responses or error messages.

AUTHORIZATION
- Every route/handler/event has the correct authZ guard; find any that are unprotected or commented out.
- IDOR / broken object-level auth: can user A read or mutate user B's resource by changing an id?
- Ownership/tenant/participant checks on BOTH reads and writes.
- Privilege escalation: can a normal user set their own role/permissions via an update payload?
- Role logic correctness (field name mismatches, default-allow branches).

INPUT & INJECTION
- SQL/NoSQL injection (unsanitized operators, user-controlled query objects, string-built queries).
- Command/template/LDAP/XPath injection; unsafe eval or dynamic import of user data; deserialization.
- Mass assignment / over-posting; missing input validation or allow-listing.
- SSRF on any server-side fetch (URLs, webhooks, image fetch, redirects).
- Path traversal / arbitrary file read-write on any user-influenced file path.
- Unsafe file upload: type/size/content-sniffing, storage location, executable content.

SECRETS & CONFIG
- Committed secrets (.env, keys, service-account JSON, tokens) and secrets in logs or error messages.
- Insecure defaults, debug/verbose modes, docs/consoles exposed in production.

TRANSPORT & HEADERS
- CORS (wildcard origin combined with credentials), missing security headers, cookie flags
  (HttpOnly/Secure/SameSite), TLS assumptions, CSRF on state-changing routes.

DATA EXPOSURE
- PII / password hashes / tokens / internal fields leaking in responses or logs; stack traces to clients.

For each finding give the exact location, a concrete exploit scenario, and the minimal fix.
Follow the shared output contract (severity-ranked table + themes + fix order + what's solid).
```

---

## 2. Vulnerability / Exploit Review Prompt

```
You are a penetration tester doing a VULNERABILITY hunt on {{TARGET}}. Stack: {{STACK}}.
Think adversarially: for each candidate, construct the actual malicious input and trace it to a bad outcome.
Prefer a few CONFIRMED, reproducible issues over many speculative ones.

Hunt specifically for:
- Injection reachable from untrusted input (SQL/NoSQL/command/template), end to end.
- ReDoS: user-supplied or user-influenced input hitting catastrophic-backtracking regexes.
- Prototype pollution (merge/clone/assign of attacker-controlled keys) and its downstream impact.
- Race conditions / TOCTOU on create-if-not-exists, balance/counter updates, idempotency, file writes.
- Authentication/authorization bypasses (guard ordering, missing await, default-true returns).
- Insecure deserialization, unsafe reflection, dynamic require/import of user data.
- SSRF and open redirects; DNS-rebind-able server-side fetches.
- Business-logic abuse: negative quantities, integer/decimal overflow, replay, out-of-order state,
  privilege gaps between related endpoints (one guarded, a sibling not).
- Denial of service: unbounded queries/loops, memory blowups, missing pagination/limits, zip/JSON bombs.
- Known-vulnerable or abandoned dependencies (call out by name + why it matters; flag for `npm audit`/equivalent).

For each: exact location, the concrete payload/steps, the impact, and the fix.
Mark anything you could not fully trace as "Needs verification". Follow the shared output contract.
```

---

## 3. Complexity & Maintainability Review Prompt

```
You are a staff engineer reviewing {{TARGET}} for COMPLEXITY and MAINTAINABILITY (not security).
Goal: find what will be hard to change safely, and where bugs are likely to hide.

Flag:
- Oversized units: files/functions/classes far past reasonable size; God objects; long parameter lists.
- High cyclomatic/cognitive complexity: deep nesting, sprawling conditionals, flag arguments,
  branch-per-type logic that begs for polymorphism or a lookup table.
- Duplication: copy-pasted logic that should be shared; near-identical branches per case/category.
- Weak typing: pervasive `any`/`unknown`/untyped escapes that defeat the type system; unsafe casts.
- Dead & zombie code: unused exports, unreachable branches, commented-out blocks left in, debug logging.
- Error handling: swallowed errors, empty catches, inconsistent error shapes, fail-open where it should fail-closed.
- Naming & structure: misleading names, mixed responsibilities in one module, leaky abstractions,
  inconsistent patterns across similar modules.
- Magic numbers/strings, implicit coupling, hidden global/shared state, side effects in surprising places.
- Missing or weak tests around the riskiest logic; hard-to-test designs.

For each: location, why it's a maintenance/bug risk, and a concrete refactor (with the smallest safe first step).
Prioritize by (change frequency × blast radius). Follow the shared output contract.
```

---

## 4. Performance & Scalability Review Prompt

```
You are a performance engineer reviewing {{TARGET}} for PERFORMANCE and SCALABILITY. Stack: {{STACK}}.
Focus on the request/hot path and anything that grows with data or traffic.

Look for:
- Database: N+1 queries (loops issuing per-row lookups), missing indexes for hot filters/sorts,
  unbounded reads (no limit/pagination), over-fetching (select *), heavy aggregations on the request path,
  multi-document writes without transactions, chatty round-trips that should be batched.
- Caching: absent where it obviously helps; wrong TTLs; cache keys that mix users/tenants (correctness + perf);
  stampede/thundering-herd risk on cache miss.
- Concurrency & I/O: blocking/synchronous work in the request lifecycle, sequential awaits that could be
  parallel, unbounded concurrency (no pool/queue), event-loop-blocking CPU work.
- Memory: large in-memory buffers, whole-file/whole-collection loads, leaks (listeners, growing maps/caches).
- Payloads: unbounded response sizes, missing compression, oversized DTOs.
- Scaling: in-process state that breaks under multiple instances (in-memory sessions/rate-limits/pub-sub),
  work that should be a background job/queue, missing backpressure.

For each: location, expected impact (and at what scale it bites), and the fix (with a way to measure it).
Do not micro-optimize cold paths. Follow the shared output contract.
```

---

## 5. Code Quality, Architecture & "Anything Else" Review Prompt

```
You are a principal engineer doing a broad QUALITY & ARCHITECTURE review of {{TARGET}}. Stack: {{STACK}}.
This is the catch-all pass for everything the security/complexity/performance passes don't own.

Cover:
- Architecture: layering and boundaries, separation of concerns, dependency direction, coupling/cohesion,
  consistency of patterns across modules, appropriate abstractions (over- and under-engineering).
- Correctness & robustness: edge cases, null/undefined handling, off-by-one, date/timezone bugs,
  id type mismatches (string vs object id), floating-point money, idempotency of retryable operations,
  consistent API response envelopes and HTTP status codes.
- Data & schema: validation at boundaries, migrations, referential integrity, soft-delete consistency,
  enums vs magic strings, nullable vs required correctness.
- Testing: coverage of critical paths, meaningful assertions vs smoke tests, flaky patterns, missing edge tests.
- Observability: structured logging (no PII), correlation ids, error reporting, health/readiness, metrics.
- Reliability: timeouts, retries with backoff, circuit breakers on external calls, graceful shutdown,
  transaction boundaries, handling of partial failures.
- API & contracts: versioning, backward compatibility, pagination conventions, documentation accuracy.
- Config & deploy hygiene: env handling, feature flags, 12-factor adherence, build/CI concerns.
- Accessibility/i18n/licensing only if relevant to the code under review.

For each: location, impact, and a concrete improvement. Call out systemic patterns over one-off nits.
Follow the shared output contract.
```

---

## 6. Dependency & Supply-Chain Review Prompt  *(optional add-on)*

```
Review the dependencies of {{TARGET}} (manifest + lockfile). Report:
- Known-vulnerable versions (map to advisories; recommend the safe version). Suggest running the
  ecosystem auditor (npm audit / pip-audit / govulncheck / etc.) and summarize what it would likely flag.
- Duplicated or conflicting libraries doing the same job (e.g. two hashing or two http libs).
- Abandoned/unmaintained packages, pinned-to-old majors, or risky transitive deps.
- Packages with excessive privilege/footprint for what they're used for; typosquat-risk names.
- License incompatibilities for the project's distribution model.
Output: a table of dependency, current version, issue, recommended action, severity. Follow the shared output contract.
```

---

## 7. Change / Diff Review Prompt  *(for PRs, commits, or edited files)*

```
You are reviewing a SET OF CHANGES, not the whole codebase. Target diff: {{DIFF}}. Stack: {{STACK}}.
First run: `git diff {{DIFF}}` (or read the listed changed files) and read enough surrounding code to judge
each change in context. Review ONLY what changed and what the change affects — but flag if a change breaks
something outside the diff.

For the changed lines, evaluate across ALL concerns at once:
1. Correctness: does it do what it intends? Edge cases, null/error paths, off-by-one, regressions,
   broken assumptions in callers of changed functions.
2. Security: does the change introduce any issue from the Security prompt (authZ gaps, injection, secrets,
   IDOR, unsafe input, disabled/weakened guards)? Pay special attention to newly added endpoints, new inputs,
   changed auth/validation, and anything that was commented out or loosened.
3. Vulnerabilities: any new injection/ReDoS/race/SSRF/DoS surface introduced.
4. Performance: new N+1s, unbounded queries, blocking work, or per-request cost added on a hot path.
5. Complexity: added duplication, dead code, `any`, debug logging, oversized functions, unclear naming.
6. Tests: are the changed behaviors covered? Do existing tests still hold? Are new edge cases tested?
7. Backward compatibility: API/schema/contract breaks, migration needs, config changes required to deploy.

Also verify: no secrets/keys/debug artifacts added, no `.env`/generated files committed, commit scope is
coherent. Rank findings; block-level severity for anything that should not merge as-is.
Follow the shared output contract. End with a clear verdict: APPROVE / APPROVE WITH NITS / REQUEST CHANGES,
and the shortest list of must-fix items before merge.
```

---

## Suggested workflow

For a **full audit**, run 1 → 2 → 3 → 4 → 5 (→ 6) over the same target, then combine the findings
into one severity-ranked register and dedupe overlaps.

For **ongoing work**, run prompt 7 on every PR/branch before merge — it's the fast, all-concerns pass.

Keep the wording of these prompts identical across projects so results stay comparable; only swap the
`{{TARGET}}` / `{{STACK}}` / `{{DIFF}}` values.
