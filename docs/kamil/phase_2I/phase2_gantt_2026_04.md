# EB-FILEMG Phase 2 — Re-planned Schedule

**Date:** 2026-04-04
**Reported by:** Syahiid Kamil (Lead Developer / PM)
**To:** Mitsuyoshi Endo (General PM)

---

## Team

| Member | Role | Hours/Day | Notes |
|--------|------|-----------|-------|
| Kamil | AI Native Developer (Lead/PM) | 4-6h | Complex tasks: chat, ringi submission, escalation |
| Dzikri | AI Native Developer (Fast Learner Junior - Intermediate) | 4-6h | Onboarded Apr 2. Isolated tasks only. No chat/ringi submission. |
| Vanessa | BA / UI/UX / APO | 4-6h | BA analysis, mockups, MVP scope |
| Nabila | QA Tester | 4-6h | SIT parallel with dev + regression |

---

## Epics

| # | Epic | Priority | Progress | Est. Period |
|---|------|----------|----------|-------------|
| 1 | Middle Manager Inquiry MVP | HIGH | 0-5% | Apr 4 - Apr 25 |
| 2 | Feature Improvements (Excl Autonomous File Org) | HIGH | 90% | Apr 25 - Apr 28 (~2 days after Ringi regression) |
| 3 | Autonomous File Org | TBD | 0-5% | ~5-7 days. Pending Endo-san guidance |
| 4 | Slack & Email Notification | TBD | 0% | Apr 18 - Apr 22 (~3-4 days, during Ringi regression) |
| 5 | Ringi Phase 2 Full System (Excl Slack/Email & Multi-tenant) | VERY HIGH | 50% | Apr 4 - Apr 25 |

**Priority: Epic #1 and #5 run in parallel** (Kamil on complex tasks, Dzikri on isolated tasks across both)

---

## Epic 5. Ringi Phase 2 Full System (Excl Slack/Email & Multi-tenant) — PRIORITY

> In-progress items (#91, #121, #133, #142) are 80-90% complete. Remaining hours reflect only the unfinished portion.

### Kamil — Complex Tasks (chat, submission flow, escalation)

| Task | Ticket | Remaining Hrs | Days | Start | End |
|------|--------|---------------|------|-------|-----|
| Bug - Bulk Move Multiple Files | #125 (in progress) | 2 | 0.5 | Apr 4 | Apr 4 |
| Integration between features (submission, notification, remand, proxy approval) | - | 8 | 2 | Apr 5 | Apr 6 |
| Proxy Approval + Escalation (H) | #133 (80-90% done) | 4 | 1 | Apr 7 | Apr 7 |
| Submission Embedding | #91 (80-90% done) | 2 | 0.5 | Apr 8 | Apr 8 |
| AI Bug - Unsupported Suggestions | #121 (80-90% done) | 1 | 0.5 | Apr 8 | Apr 8 |
| Cancel Approved Stage (J) | #135 | 3 | 0.5 | Apr 9 | Apr 9 |
| File Chat Management (M) | #138 | 4 | 1 | Apr 10 | Apr 10 |
| Submission Search in Chat (O) | #140 | 4 | 1 | Apr 11 | Apr 11 |
| File URLs and Previews in Chat | #122 | 5 | 1 | Apr 14 | Apr 14 |
| **Kamil subtotal** | | **33h** | **8d** | | |

### Dzikri — Isolated Tasks (no chat / no ringi submission flow)

| Task | Ticket | Remaining Hrs | Days | Start | End |
|------|--------|---------------|------|-------|-----|
| Bug - Error Message Persists | #142 (80-90% done) | 1 | 0.5 | Apr 7 | Apr 7 |
| Search Performance Validation (N) | #139 | 2 | 0.5 | Apr 7 | Apr 7 |
| Team Activity Log Revamp (P1) | #144 | 10 | 2 | Apr 8 | Apr 9 |
| Admin Settings Pages | not yet ticketed | 10 | 2 | Apr 10 | Apr 11 |
| Accountant Analytics Dashboard | #145 | 12 | 2.5 | Apr 14 | Apr 16 |
| **Dzikri subtotal** | | **35h** | **7.5d** | | |

### QA + Regression

| Task | Owner | Hours | Days | Start | End |
|------|-------|-------|------|-------|-----|
| Individual Ticket Ringi Phase 2 Testing (parallel with dev) | Nabila | 15 | - | Apr 4 | Apr 17 |
| Regression + Bug Fix: Ringi Phase 2 | Nabila + Devs | 25 | 5 | Apr 18 | Apr 24 |

> During Ringi regression (Apr 18 - Apr 24), devs work on Epic #1 (Inquiry MVP) and Epic #4 (Slack & Email Notification)

**>>> Ringi Phase 2 Full System Complete: ~Apr 24 (incl regression)**

---

## Epic 1. Middle Manager Inquiry MVP — PRIORITY

| Task | Owner | Hours | Days | Start | End |
|------|-------|-------|------|-------|-----|
| BA Analysis + Inquiry Categorization | Vanessa | 15 | 3 | Apr 4 | Apr 8 |
| Lo-fi UX Mockups + MVP Scope | Vanessa | 12 | 2.5 | Apr 9 | Apr 11 |
| Solution Architecture + Tech Design | Kamil | 5 | 1 | Apr 15 | Apr 15 |
| Knowledge Base + Data Pipeline | Dzikri | 15 | 3 | Apr 17 | Apr 21 |
| Simple UI Components | Dzikri | 8 | 1.5 | Apr 22 | Apr 23 |
| Routing Intelligence | Kamil | 8 | 1.5 | Apr 16 | Apr 17 |
| Chat UI + Integration | Kamil | 7 | 1.5 | Apr 18 | Apr 21 |
| QA SIT: Inquiry MVP (parallel) | Nabila | 10 | 2 | Apr 24 | Apr 25 |

**>>> Middle Manager Inquiry MVP Complete: ~Apr 25**

---

## Epic 2. Feature Improvements (Excl Autonomous File Org)

- 7/8 items complete
- Last item "Remove Unnecessary Suggestions" (#121) depends on Ringi Phase 2 completion
- Note: #121 dev work is listed under Epic 5 (Ringi). QA verification + final tuning needed after Ringi is done.

| Task | Owner | Hours | Days | Start | End |
|------|-------|-------|------|-------|-----|
| Final tuning + verification after Ringi | Kamil | 3 | 0.5 | Apr 25 | Apr 25 |
| QA SIT: Feature Improvements (all 8 items) | Nabila | 5 | 1 | Apr 25 | Apr 28 |

**Est. duration: ~2 days after Ringi regression complete**

**>>> Feature Improvements Complete: ~Apr 28**

---

## Epic 4. Slack & Email Notification (Priority: TBD)

> Scheduled during Ringi regression — devs available while Nabila runs regression

| Task | Owner | Hours | Days | Start | End |
|------|-------|-------|------|-------|-----|
| Research + PoC | Kamil | 3 | 0.5 | Apr 18 | Apr 18 |
| Slack Integration | Kamil | 5 | 1 | Apr 21 | Apr 21 |
| Email Integration | Dzikri | 3 | 0.5 | Apr 18 | Apr 18 |
| QA SIT: Notification | Nabila | 4 | 1 | Apr 22 | Apr 22 |

**Est. duration: ~3-4 days (dev during Ringi regression, QA after)**

**>>> Slack & Email Notification Complete: ~Apr 22**

---

## Epic 3. Autonomous File Org (Priority: TBD)

**Status:** 0-5%. Pending Endo-san guidance. Outside Phase 2 spec scope.

| Task | Owner | Hours | Days | Start | End |
|------|-------|-------|------|-------|-----|
| Solution design + intent parsing logic | Kamil | 15 | 3 | TBD | TBD |
| File organization execution engine | Kamil + Dzikri | 10 | 2 | TBD | TBD |
| QA SIT | Nabila | 5 | 1 | TBD | TBD |

**Est. duration: ~5-7 days if prioritized**

---

## Man-Days Summary

| Person | Role | Total Hours | Total Man-Days | Period |
|--------|------|-------------|----------------|--------|
| Kamil | Dev (Senior/Lead) | 71h | 14.5d | Apr 4 - Apr 25 |
| Dzikri | Dev (Fast Learner Junior - Intermediate) | 58h | 11.5d | Apr 7 - Apr 23 |
| Vanessa | BA/UX | 27h | 5.5d | Apr 4 - Apr 11 |
| Nabila | QA | 61h | 12.5d | Apr 4 - Apr 28 |
| **TOTAL** | | **217h** | **44 man-days** | **Apr 4 - Apr 28** |

> Excludes Epic 3 (Autonomous File Org) — add ~30h / 6 man-days if prioritized

---

## Milestones

| Milestone | Target Date | Owner |
|-----------|-------------|-------|
| Kamil Ringi dev complete | ~Apr 14 | Kamil |
| Middle Manager Inquiry MVP Complete | ~Apr 21 | Kamil + Dzikri + Vanessa |
| Dzikri Ringi dev complete | ~Apr 16 | Dzikri |
| Ringi Regression + Bug Fix Complete | ~Apr 24 | Nabila + Devs |
| Slack & Email Notification Complete | ~Apr 22 | Kamil + Dzikri |
| Feature Improvements Complete | ~Apr 28 | Kamil + Nabila |
| Autonomous File Org (if prioritized) | ~+5-7 days after | Kamil + Dzikri |
| **ALL PHASE 2 COMPLETE (excl Auto File Org)** | **~Apr 28** | **Full Team** |

---

## Items Pending Endo-san Guidance

1. **Autonomous File Org** — Outside Phase 2 spec. Deprioritize or schedule separately?
2. **Slack & Email Notification priority** — Currently scheduled during Ringi regression. Should it be earlier?
3. **eb-mgapp MVP scope** — Vanessa BA analysis will clarify by Apr 11
4. **Multi-tenant** — Deferred per Endo-san. When to re-introduce?

---

## Excluded from Schedule

- **Multi-tenant** — deferred per Endo-san
- **Autonomous File Org** — pending guidance (outside Phase 2 spec)

---

## Notes

- Both Kamil and Dzikri use AI-assisted development (Claude Code), parallel AI agents
- Dzikri is junior (onboarded Apr 2) — assigned isolated tasks only, no chat/ringi submission flow
- In-progress items (#91, #121, #133, #142) are 80-90% done — only remaining portion estimated
- QA/SIT runs parallel with dev, not sequential
- Regression (5 days) only for Ringi Phase 2; devs work on other Epics during regression
- Schedule assumes 4-6h effective/day (avg 5h), Mon-Fri, excl holidays
- Apr 29 = Showa Day (holiday)
- Some tickets not yet created (admin settings)
