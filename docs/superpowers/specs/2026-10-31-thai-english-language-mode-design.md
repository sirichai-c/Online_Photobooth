# Thai and English Language Mode Design

## Intent

Add a clear TH/EN language control so Thai and English users can complete the full photobooth flow in their preferred language.

## Goals

- Translate the landing page, room flow, status labels, errors, frame choices, and download experience.
- Use Thai on a first visit.
- Remember the selected language in the browser and use it across navigation and later visits.
- Update the document language for accessibility.
- Keep the existing room URLs and peer protocol unchanged.

## Non-goals

- No locale-specific URLs or search-engine localization.
- No third-party localization dependency.
- No automatic translation of browser or camera error text supplied by external APIs.

## Approach

Use a small typed translation dictionary, a React language provider, and one reusable TH/EN switcher. The provider owns the selected language, persists it in local storage, and updates the root HTML language attribute. Both existing client components consume the same provider.

Alternatives considered were locale-specific routes and a localization library. Both add routing or dependency overhead that the current two-language application does not need.

## Constraints

- Thai is the initial language when no valid preference exists.
- Only `th` and `en` are accepted from browser storage.
- The switcher remains usable at 320px width.
- Generated photo-strip labels use the host's selected language because the host produces the shared final image.
