# TASK N — ファイル検索パフォーマンス検証 / File Search Performance Validation

**Priority**: Medium
**Assignee**: Syahiid
**Effort**: S (Small) — Testing + optimization, not new features
**Status**: Validation — hybrid search exists, needs perf benchmarking

---

## Current State

- **Hybrid search**: BM25 keyword + semantic vector (Gemini multimodal embeddings)
- **RRF**: Reciprocal Rank Fusion merges BM25 + vector results
- **LLM filter**: Post-processing relevance filter
- **Progressive UI**: Results stream in as they're found
- **Implemented**: 2026-03-23 with 4 DB migration iterations for optimization
- **Services**: `src/service/rag/embedding.ts`, `src/service/gemini/embedding.ts`
- **Demo**: `/benchmark` page was created for S3+parse vs Gemini speed comparison

## Scope

Performance testing and optimization:
1. Benchmark search speed (target: < 2s)
2. Benchmark search quality (relevant results in top 5)
3. Test with both Japanese and English queries
4. Test with realistic data volume (100+ documents)
5. Fix any bottlenecks found

## Test Plan

### Speed Benchmarks
| Query Type | Target | Method |
|-----------|--------|--------|
| Simple keyword ("invoice") | < 1s | Manual + DevTools timing |
| Multi-word ("IT equipment Q4") | < 2s | Manual + DevTools timing |
| Japanese ("請求書 2025年") | < 2s | Manual + DevTools timing |
| Semantic ("documents about budget") | < 2s | Manual + DevTools timing |

### Quality Benchmarks
| Query | Expected Top Result | Acceptable if in Top 5 |
|-------|-------------------|----------------------|
| "invoice" | Invoice documents | Yes |
| "contract ABC Corp" | Contracts with ABC Corp | Yes |
| "会議議事録" (meeting minutes) | Meeting docs | Yes |

### Volume Testing
- Upload 100+ test documents (mix of PDF, images, text)
- Run benchmark queries
- Measure: response time, result relevance, memory usage

## Acceptance Criteria

- [ ] Search completes within 2 seconds for typical queries
- [ ] Relevant documents appear in top 5 results
- [ ] Japanese queries return accurate results
- [ ] English queries return accurate results
- [ ] No timeout errors under normal load
- [ ] Embedding ingestion doesn't block UI (async confirmed)
- [ ] Results are consistent across repeated queries

## Potential Optimizations

- Index tuning (GIN/GiST for BM25, HNSW for vectors)
- Embedding dimension reduction
- RRF weight adjustment (BM25 vs vector balance)
- LLM filter threshold tuning
- Query caching for repeated searches
- Connection pooling for parallel queries

## Code References

| File | Purpose |
|------|---------|
| `src/service/rag/embedding.ts` | Search functions |
| `src/service/gemini/embedding.ts` | Gemini embedding |
| `src/service/rag/ingestDocuments.ts` | Ingestion pipeline |
| `supabase/migrations/*bm25*` | Search DB functions |

## Dependencies

- Independent — can test anytime
- Related to Task M (chat uses same search)
