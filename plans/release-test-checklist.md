# VillaHadad Release Checklist (P0/P1)

## 0) Quick Gate Commands

```bash
npm run qa:gate:quick
# full gate (recommended before any release)
npm run qa:gate
# include playwright e2e
npm run qa:gate:e2e
```

Gate result file:
- `reports/release-gate-latest.md`

---

## 1) P0 Smoke (Must Pass)

- [ ] Login works for all 7 roles and role access is correct.
- [ ] Reception can create a booking and status update works with no critical console errors.
- [ ] Client portal link opens from `select.villahadad.org` with a valid token.
- [ ] Client selection reaches Selector/Editor immediately.
- [ ] Chat message sync works between two different devices.
- [ ] One completed print order moves to archive.
- [ ] No repeated `500` loop from `sync` function and no infinite queue retries.

---

## 2) P0 End-to-End Workflow (Business Path)

- [ ] Reception creates booking + session directory.
- [ ] Selector selects photos + sends notes/tags.
- [ ] Editor receives only selected photos and marks work done per photo.
- [ ] File movement is correct:
  - [ ] `01_RAW -> 02_SELECTED`
  - [ ] `02_SELECTED -> 03_EDITED`
  - [ ] `03_EDITED -> 04_FINAL` (move, not copy, when workflow requires)
- [ ] Printer creates print job from inventory dropdown with auto-filled price.
- [ ] Archive receives completed order with correct external/internal revenue.

---

## 3) Sync Matrix

- [ ] Internet ON: instant cloud sync.
- [ ] Internet OFF + LAN ON: local sync works for chat/tasks.
- [ ] Internet OFF -> ON: pending changes flush once without duplicates.
- [ ] Device A + B on same LAN: both receive chat/tasks events.
- [ ] Device outside LAN still receives cloud-synced data when online.

---

## 4) Chat & Task Reliability

- [ ] Messages survive app restart.
- [ ] User can edit/delete only own message.
- [ ] Manager retention policy applies correctly (`5s`, `1m`, `1h`, ...).
- [ ] Unread badge works in all roles.
- [ ] Voice message send/play works.
- [ ] LAN file mode accepts large/any files.
- [ ] Internet file mode allows compressed images only.

---

## 5) Client Portal

- [ ] Mobile scrolling is stable (single scroll container, no horizontal drift).
- [ ] Double-tap heart works from grid and lightbox.
- [ ] Open image via zoom icon works without breaking long-press save behavior.
- [ ] Selection finalization updates booking status + 60-day timer correctly.
- [ ] QR and WhatsApp links open the correct HTTPS URL.

---

## 6) Printing & Inventory

- [ ] Print WhatsApp button sends ready-message to customer.
- [ ] New print work uses inventory product dropdown only.
- [ ] Stock deduction is accurate after confirmation.
- [ ] Archive financial totals include external jobs.

---

## 7) Data Integrity & Migrations

- [ ] Migrations run idempotently (no duplicate/unsafe schema effects).
- [ ] Safe fallback exists for missing optional columns.
- [ ] Queue items end in deterministic states: `processed` or `failed`.
- [ ] No silent file move/delete without logs.

---

## 8) Performance Baseline

- [ ] 500-1000 images load without freeze in selection/editor flows.
- [ ] Memory usage remains stable in long session.
- [ ] Dashboard load time remains acceptable for each role.

---

## 9) Release Gate Decision

Release only if all below are true:

- [ ] `qa:gate` passes.
- [ ] P0 Smoke passes.
- [ ] P0 End-to-End workflow passes.
- [ ] No critical runtime console errors in tested flow.
