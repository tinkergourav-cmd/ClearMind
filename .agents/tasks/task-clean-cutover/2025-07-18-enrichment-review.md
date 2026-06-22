# Code-Level Review: Password State Hydration & Enrichment

## Summary

With the addition of `enrichProjectWithLocalMetadata()`, the Firestore initialization path now correctly merges local-only fields (currently: `password`) from localStorage into the in-memory project objects before they reach React state. This review classifies each area of the password lifecycle.

---

## Architecture (Post-Fix)

```
Firestore project docs (password stripped)
        +
localStorage cm-proj-{id} (password present)
        |
        v
enrichProjectWithLocalMetadata()
        |
        v
Enriched project objects (password restored)
        |
        v
Migration steps (hash check, field additions)
        |
        v
setProjects(fullyMigrated) -> React state
        |
        v
activeProj.password -> setPasswordEnabled / setStoredPassword
```

---

## Area Classifications

### 1. Browser Refresh - CONFIDENT

On browser refresh, the init useEffect runs again. If Firestore is configured:
- Projects are loaded from Firestore (no passwords).
- The hydration step writes project metadata to localStorage, preserving existing passwords.
- `enrichProjectWithLocalMetadata()` merges passwords back into the in-memory objects.
- `setProjects()` receives objects with correct passwords.
- The password gate initializes correctly.

If Firestore is unavailable, the localStorage fallback loads directly from `loadProjectMeta()` which already includes the password.

### 2. Browser Restart - CONFIDENT

Same flow as browser refresh. localStorage persists across browser restarts. The Firestore hydration step explicitly reads and preserves existing localStorage passwords before overwriting. The enrichment step then ensures the in-memory state has them.

### 3. initializePersistence() - CONFIDENT

This function in `persistenceService.js` is not directly used by the current App.jsx init flow (App.jsx has its own inline init logic). However, its Firestore hydration path also preserves localStorage passwords via:
```js
const existingLocal = loadProjectMeta(pid);
const preservedPassword = existingLocal ? existingLocal.password : null;
saveProjectMeta(pid, { ...pmeta, password: preservedPassword || pmeta.password || null });
```
If it were used in the future, its output (a projects Map) would need enrichment before flowing to React state. The consumer is responsible for calling `enrichProjectWithLocalMetadata()`.

### 4. Firestore Initialization - CONFIDENT

The Firestore path in App.jsx:
1. Loads all project docs from Firestore (no passwords in the docs).
2. Hydrates localStorage while preserving existing password hashes.
3. Assigns to `firestoreProjects` / `loadedProjects`.
4. **NEW**: Calls `enrichProjectWithLocalMetadata()` on each project.
5. Flows into migration and then `setProjects()`.

The enrichment reads from localStorage which was just hydrated (or already existed). The password is correctly restored.

### 5. Project Enrichment Stage - CONFIDENT

`enrichProjectWithLocalMetadata()` is:
- Idempotent: does nothing if the project already has a truthy value for the field.
- Safe for null/undefined project or missing localStorage entry.
- Extensible via the `LOCAL_ONLY_FIELDS` array.
- Applied via `.map()` so it creates new objects only when enrichment is needed (lazy shallow copy).

### 6. setProjects() - CONFIDENT

After enrichment and migration, `setProjects(fullyMigrated)` receives project objects that carry `password` fields. The React state is now the single source of truth for the current session. All downstream reads (`projects.find(...)`) will see the password.

### 7. activeProj.password - CONFIDENT

```js
const activeProj = fullyMigrated.find(p => p.id === activeId) || fullyMigrated[0];
```
Since `fullyMigrated` was enriched, `activeProj.password` is correctly populated.

### 8. setStoredPassword() - CONFIDENT

```js
if (!isDefaultProject && activeProj.password) {
  setPasswordEnabled(true);
  setStoredPassword(activeProj.password);
}
```
This now correctly fires because `activeProj.password` is truthy (the hash from localStorage).

### 9. setPasswordEnabled() - CONFIDENT

Same block as above. If the active project has a password and is not the default project, `setPasswordEnabled(true)` is called. The authentication gate will render.

### 10. Authentication Gate - CONFIDENT

The gate renders when `passwordEnabled && !isAuthenticated`. With the fix, `passwordEnabled` is correctly set to `true` for password-protected non-default projects on init. The user must enter their password to authenticate.

### 11. switchProject() - CONFIDENT

`switchProject` does:
1. Finds `target` from `projects` state (which now has passwords after enrichment).
2. Verifies the entered password against `target.password` (hash comparison).
3. After switch, calls `setStoredPassword(target.password || '')` and `setPasswordEnabled(!!target.password)`.

Since the in-memory state is enriched, `target.password` is correct. Additionally, `hydrateProject(targetId)` reads from localStorage which also has the password, so it could be used as a fallback. However, the current code reads password from `target` (React state), not from `hydrateProject` result.

### 12. cycleToProject() - CONFIDENT

Similar to `switchProject` but without password verification (used for boss key / default project switch / passwordless projects). It reads `target.password` from `projectsRef.current` (the ref tracking React state). With enrichment in place, this is correct.

The only case where `cycleToProject` is called for a password-protected project is the boss key (Ctrl+Shift+/) which switches to the default project (always password-free). For non-default projects, the UI only allows `cycleToProject` if `!p.password`. Safe by design.

### 13. Import/Export Interactions - CONFIDENT

**Export Single Project**: Strips password before export (`{ ...hydrated, password: '' }`). Safe.

**Export All Data**: Strips passwords from each exported project. Safe.

**Import Full Backup**: Imported projects carry their own `password` field (or empty string). They are directly passed to `setProjects()` and also saved to localStorage via `saveProjectMeta()`. No enrichment needed because the data is complete from the import file.

**Import Single Project / Partial Import**: Replaces workspace data only, does not affect project-level password. Safe.

---

## Edge Cases Considered

1. **First-time user (no localStorage, no Firestore data)**: Default project is created with `password: ''`. No enrichment needed. CONFIDENT.

2. **User sets password, then Firestore syncs back without it**: The autosave debounced saver calls `saveProjectToFirestore()` which strips password. On next load, Firestore data lacks password, but localStorage has it. Enrichment restores it. CONFIDENT.

3. **User clears localStorage manually**: Passwords are lost permanently. This is by design (passwords are local-only). Firestore hydration creates new localStorage entries with `password: null`. The project becomes unprotected. NEEDS MANUAL TEST (edge case, but architecturally correct behavior).

4. **Multiple tabs**: Each tab runs its own init. If Tab A changes a password, Tab B will pick up the new password on its next init (refresh). During the same session, Tab B's React state may be stale. This is a known limitation of the single-tab architecture. NEEDS MANUAL TEST.

---

## Final Classification Summary

| # | Area | Classification |
|---|------|---------------|
| 1 | Browser refresh | CONFIDENT |
| 2 | Browser restart | CONFIDENT |
| 3 | initializePersistence() | CONFIDENT |
| 4 | Firestore initialization | CONFIDENT |
| 5 | Project enrichment stage | CONFIDENT |
| 6 | setProjects() | CONFIDENT |
| 7 | activeProj.password | CONFIDENT |
| 8 | setStoredPassword() | CONFIDENT |
| 9 | setPasswordEnabled() | CONFIDENT |
| 10 | Authentication gate | CONFIDENT |
| 11 | switchProject() | CONFIDENT |
| 12 | cycleToProject() | CONFIDENT |
| 13 | Import/export interactions | CONFIDENT |

**Additional edge cases**: localStorage cleared manually (NEEDS MANUAL TEST), multi-tab (NEEDS MANUAL TEST).
