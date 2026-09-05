# Performance Implementation Report

## Executive Summary

PERF-001 and PERF-004 are complete with measured mobile improvements. Live previews and Resume PDF still work when the user navigates to those items.

---

## Final Before vs After (mobile Lighthouse simulate, after PERF-001 + PERF-004)

| Metric | Baseline | Current | Target | Status |
|--------|----------|---------|--------|--------|
| Performance score | 40 | 68 | ≥ 80 | FAIL |
| FCP | 0.8 s | 0.8 s | — | — |
| LCP | 3.9 s | 3.7 s | ≤ 2.5 s | FAIL |
| TBT | 1,370 ms | 80 ms | ≤ 300 ms | PASS |
| CLS | 0.515 | 0.507 | ≤ 0.1 | FAIL |
| TTI | 12.0 s | 3.7 s | ≤ 5 s | PASS |
| First-load transfer | 6,745 KiB | 2,768 KiB | ≤ 1,500 KiB | PARTIAL |
| Third-party requests | 92 | 0 | ≤ 15 | PASS |

---

## PERF-001 — Sticky Live Iframes

**Status:** PASS

See audit gates: 0 iframes on About after settle, third-party requests eliminated on initial load, live preview works on project navigation.

---

## PERF-004 — react-pdf Duplicate Workers

**Status:** PASS

0 PDF documents on About; Resume PDF loads when Resume is the settled active item.

---

## PERF-003 through PERF-006

**Status:** PENDING
