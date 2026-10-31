# Thai and English Language Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent TH/EN mode covering the complete landing and photobooth room experience.

**Architecture:** A typed dictionary supplies all product copy. A client-side provider stores the active language, persists it to local storage, and exposes it to a reusable language switcher and both main screens.

**Tech Stack:** Next.js 15, React 19, TypeScript, Jest, Testing Library

**Spec:** `docs/superpowers/specs/2026-10-31-thai-english-language-mode-design.md`

## Global Constraints

- Thai is the first-visit default.
- Persist only `th` or `en` under one browser storage key.
- Keep room URLs and peer messages unchanged.
- Keep the switcher responsive down to 320px.

## Review Focus

- Missing or malformed stored preferences fall back to Thai.
- Switching language updates visible text and `document.documentElement.lang`.
- Navigation preserves the selected language through the shared provider and storage.
- Dynamic room states and host/guest controls use the active language.
- The host-generated photo strip uses the host's active localized frame label and date locale.

---

### Task 1: Language state and switcher

**Files:**
- Create: `lib/i18n.ts`
- Create: `components/LanguageProvider.tsx`
- Create: `components/LanguageSwitcher.tsx`
- Modify: `app/layout.tsx`
- Test: `__tests__/LanguageProvider.test.tsx`

**Interfaces:**
- Produces: `Language = "th" | "en"`, `translations`, and `useLanguage()`.

- [ ] Write failing tests for Thai default, switching to English, root language updates, persistence, and invalid stored values.
- [ ] Run the focused test and confirm it fails because the language components do not exist.
- [ ] Add the dictionary, provider, switcher, and layout wrapper.
- [ ] Run the focused test and confirm it passes.

### Task 2: Translate the landing page

**Files:**
- Modify: `components/LandingPage.tsx`
- Modify: `app/globals.css`
- Test: `__tests__/LandingPage.test.tsx`

**Interfaces:**
- Consumes: `useLanguage()`, `translations[language].landing`, and `LanguageSwitcher`.

- [ ] Write failing tests for Thai first-visit actions and English switching.
- [ ] Run the focused test and confirm it fails on the current English-only UI.
- [ ] Replace landing copy with dictionary values and add the switcher to the header.
- [ ] Run the focused test and confirm it passes.

### Task 3: Translate the room and generated strip

**Files:**
- Modify: `components/PhotoboothRoom.tsx`
- Test: `__tests__/PhotoboothRoom.test.tsx`

**Interfaces:**
- Consumes: `useLanguage()`, `translations[language].room`, and `LanguageSwitcher`.

- [ ] Write failing tests for Thai room labels, English switching, and localized download controls.
- [ ] Run the focused test and confirm it fails on untranslated room copy.
- [ ] Replace room, state, action, frame, and strip copy with dictionary values.
- [ ] Run the focused test and confirm it passes.

### Task 4: Full verification and PR update

**Files:**
- Modify: existing PR branch only.

- [ ] Run the complete Jest suite.
- [ ] Run ESLint and the production build.
- [ ] Run browser checks for both languages at desktop and mobile widths.
- [ ] Commit the verified change and update the existing draft PR.
