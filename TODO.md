# Fix Horizontal Scrollbar & Icon Cut-off on Small Screens

## Steps

- [x] 1. Update `frontend/src/components/layout/Header.jsx` — add flex-shrink controls, min-w-0, overflow-hidden, and hide non-essential icons on very small screens.
- [x] 2. Update `frontend/src/components/layout/CurrencySwitcher.jsx` — add flex-shrink-0 to prevent squishing.
- [x] 3. Update `frontend/src/index.css` — add global overflow-x-hidden to body/#root as safety net.
- [ ] 4. Verify in Chrome DevTools at 320px–375px widths.
