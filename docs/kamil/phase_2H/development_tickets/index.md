# Development Tickets Index — EB-FILEMG Phase 2

**Created**: 2026-03-27
**Dev Deadline**: 2026-03-31
**QA/Testing**: 2026-04-01 ~ 2026-04-07
**Master Doc**: [development_tickets.md](../development_tickets.md)
**Figma**: https://www.figma.com/design/2IWmtrCxhBCjaYXPcDDwQX/EB-MGAPP
**Permission Matrix**: https://eb-filemg-development.vercel.app/admin/permissions

---

## All Tickets

| ID | Title | Priority | Effort | Assignee | File |
|----|-------|----------|--------|----------|------|
| A | 認証E2Eフロー確認 / Auth E2E Flow | Low | S | TBD | [task_a_auth_e2e.md](task_a_auth_e2e.md) |
| B | マルチテナント提案書 / Multi-Tenant Proposal | Medium | M | Miftah | [task_b_multi_tenant.md](task_b_multi_tenant.md) |
| C | カテゴリサブタイプ / Category Sub-Types + Settings | Critical | L | Syahiid | [task_c_category_types.md](task_c_category_types.md) |
| D | 承認ルート拡張 / Approval Route Enhancements | Critical | L | Syahiid + Miftah | [task_d_approval_route.md](task_d_approval_route.md) |
| E | 稟議提出+ルート連携 / Submission + Route Integration | Critical | XL | Syahiid | [task_e_submission_integration.md](task_e_submission_integration.md) |
| F | 差戻し / Submission Remand (Revision) | Critical | L | Syahiid | [task_f_revision_remand.md](task_f_revision_remand.md) |
| G | タイムライン / Activity Log Timeline | High | M | Syahiid | [task_g_activity_timeline.md](task_g_activity_timeline.md) |
| H | 代理承認 / Proxy Approval + Escalation | High | XL | Syahiid | [task_h_proxy_approval.md](task_h_proxy_approval.md) |
| I | 通知リニューアル / Notification Revamp | High | M | Syahiid | [task_i_notification_revamp.md](task_i_notification_revamp.md) |
| J | 承認取消 / Cancel Approved Stage | High | M | Syahiid | [task_j_cancel_approval.md](task_j_cancel_approval.md) |
| K | 部署CRUD / Department Finalization | Low | S | TBD | [task_k_department_crud.md](task_k_department_crud.md) |
| L | 役職CRUD / Position Finalization | Low | S | TBD | [task_l_position_crud.md](task_l_position_crud.md) |
| M | チャットファイル管理 / File Management in Chat | Medium | M | Syahiid | [task_m_file_chat.md](task_m_file_chat.md) |
| N | 検索パフォーマンス / Search Performance | Medium | S | Syahiid | [task_n_search_performance.md](task_n_search_performance.md) |
| O | 稟議検索 / Submission Search in Chat | Medium | M | Syahiid | [task_o_submission_search.md](task_o_submission_search.md) |

---

## Execution Order (Recommended)

### Phase 1: Foundation (March 27-28)
1. **[C](task_c_category_types.md)** — Category Sub-Types (no dependencies, enables E)
2. **[D](task_d_approval_route.md)** — Approval Route Enhancements (no hard dependencies, enables E)
3. **[K](task_k_department_crud.md)**, **[L](task_l_position_crud.md)** — Dept/Position polish (if time)

### Phase 2: Core Integration (March 28-29)
4. **[E](task_e_submission_integration.md)** — Submission + Sub-Category + Route Integration (needs C, D)
5. **[F](task_f_revision_remand.md)** — Revision/Remand Flow (needs E)

### Phase 3: Advanced Features (March 29-31)
6. **[G](task_g_activity_timeline.md)** — Timeline Tab (needs F for diffs, can start early)
7. **[I](task_i_notification_revamp.md)** — Notification Revamp (needs E, can start UI early)
8. **[J](task_j_cancel_approval.md)** — Cancel Approved Stage (needs E)
9. **[H](task_h_proxy_approval.md)** — Proxy Approval + Escalation (needs D, E — largest task)

### Phase 4: AI/Chat (March 31 or April)
10. **[M](task_m_file_chat.md)** — File Management in Chat
11. **[N](task_n_search_performance.md)** — Search Performance Validation
12. **[O](task_o_submission_search.md)** — Submission Search in Chat

### Parallel Track (April)
- **[A](task_a_auth_e2e.md)** — Auth E2E Verification (TBD assignee)
- **[B](task_b_multi_tenant.md)** — Multi-Tenant Proposal (Miftah)

---

## Dependency Graph

```
C (Category Types) ──┐
                      ├──→ E (Submission + Route) ──→ F (Revision) ──→ G (Timeline)
D (Route Enhancements)┘         │                                         │
                                ├──→ I (Notifications)                    ▼
                                ├──→ J (Cancel Stage)              H (Proxy + Escalation)
                                └──→ O (Submission Search)

K,L (Dept/Position) → D (soft dependency)
M, N → independent (can run anytime)
A, B → independent (parallel track)
```

---

## Effort Summary

| Size | Tasks | Total |
|------|-------|-------|
| S (Small) | A, K, L, N | 4 |
| M (Medium) | B, G, I, J, M, O | 6 |
| L (Large) | C, D, F | 3 |
| XL (Extra Large) | E, H | 2 |

---

## Assignment Summary

| Person | Tasks | Effort |
|--------|-------|--------|
| Syahiid | C, D, E, F, G, H, I, J, M, N, O | 4S + 4M + 2L + 2XL |
| Miftah | B, D (co-owner) | 1M + 1L (shared) |
| TBD | A, K, L | 3S |
