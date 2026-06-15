# Brutalist Shadow Catalog (Phase 1)

Catalog of all hard-offset (brutalist) shadow usages in `app/src` identified
during the KKD UI/UX Redesign. These will be removed/replaced in later
phases of the redesign.

Generated: 2026-06-15
Pattern: `4px 4px 0` and `0 2px 0 var(--amber-...)`

## File:line index

### app/src/App.jsx
- L98   `boxShadow: '0 2px 0 var(--amber-500)'`
- L193  `boxShadow: '4px 4px 0px var(--amber-400)'`
- L203  hover handler: `'4px 4px 0px var(--amber-400)'`
- L233  `boxShadow: '0 2px 0 var(--amber-500)'`

### app/src/components/NetworkSyncHub.jsx
- L94   `boxShadow: '4px 4px 0px rgba(24, 24, 27, 0.1)'` (subtle hard shadow)

### app/src/components/SaveLoadModal.jsx
- L252  inline style: `'4px 4px 0px var(--charcoal-900)'`
- L292  inline style: `'4px 4px 0px var(--charcoal-900)'`

### app/src/components/ServerFileBrowser.jsx
- L167  `boxShadow: '4px 4px 0 var(--charcoal-900)'`
- L249  `boxShadow: isDownloading ? '0 0 0' : '4px 4px 0 var(--charcoal-900)'`
- L257  mouseUp handler: `'4px 4px 0 var(--charcoal-900)'`
- L323  `boxShadow: '4px 4px 0 #991B1B'`

### app/src/extract-opname.css
- L201  `box-shadow: 4px 4px 0 rgba(13,17,23,0.1);`

### app/src/index.css
- L2560 `box-shadow: 0 2px 0 var(--amber-500);`
- L3195 `box-shadow: 4px 4px 0 var(--charcoal-900);`
- L3407 `box-shadow: 4px 4px 0 var(--charcoal-900);`
- L5731 `box-shadow: 4px 4px 0 rgba(13,17,23,0.1) !important; /* Brutalist shadow */`

### app/src/pages/App3ConsolidationPage.jsx
- L134  inline style: `'4px 4px 0px var(--success-600)' / '4px 4px 0px var(--amber-500)' / '4px 4px 0px var(--charcoal-900)'`
- L181  inline style: `'4px 4px 0px var(--success-600)'`
- L187  inline style: `'4px 4px 0px var(--danger-600)'`
- L207  inline style: `'4px 4px 0px var(--amber-400)'`
- L237  mouseOver handler
- L260  inline style: `'4px 4px 0px var(--charcoal-900)'`
- L280  inline style: `'2px 2px 0px var(--amber-400)' / '4px 4px 0px var(--charcoal-900)'`
- L319  mouseOver handler

### app/src/pages/App4RecouncilPage.jsx
- L140  inline style: `'4px 4px 0px var(--success-600)' / '4px 4px 0px var(--charcoal-900)'`
- L199  inline style: `'4px 4px 0px var(--success-600)'`
- L205  inline style: `'4px 4px 0px var(--danger-600)'`
- L219  inline style: `'4px 4px 0px var(--amber-400)'`
- L279  mouseOver handler

### app/src/pages/OpnamePage.jsx
- L413  inline style: `'4px 4px 0px var(--charcoal-900)'`
- L422  mouseOut handler

### app/src/pages/UnifiedMasterDataPage.jsx
- L55   inline style: `'2px 2px 0px var(--amber-400)' / '4px 4px 0px var(--charcoal-900)'`
- L73   inline style: `'2px 2px 0px var(--amber-400)' / '4px 4px 0px var(--charcoal-900)'`

### app/src/pages/UploadPage.jsx
- L149  inline style: `'4px 4px 0px var(--charcoal-900)'`
- L152  mouseOut handler
- L166  inline style: `'4px 4px 0px var(--charcoal-900)'`
- L169  mouseOut handler

## Replacement guidance

Replace with Warm Atelier soft shadow tokens:
- `var(--shadow-xs)` (1px, 2% opacity)
- `var(--shadow-sm)` (1px, 4% opacity)
- `var(--shadow-md)` (multi-stop soft)
- `var(--shadow-lg)` (multi-stop soft)
- `var(--shadow-glow)` (terracotta glow for primary CTAs)

For interactive elements, drop the `translate(2px, 2px)` press effect and
keep hover states via `transform: translateY(-1px)` + soft shadow.
