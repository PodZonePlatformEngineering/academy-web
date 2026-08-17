// Deployment-identity feature flags (PROJ-011/ACP-245, proposal §4.3) — a
// per-deployment on/off decision made once at CF Pages project setup, not a
// database-backed or trainee-editable registry. Same build-time env-var
// mechanism as `VITE_THEME` (src/lib/theme.ts): read directly from
// `import.meta.env`, no indirection through a flag store.
//
// Defaults ON (silence = today's behaviour everywhere); only a deployment
// that wants the feature off sets the var to the literal string "false" in
// its CF Pages project config.
//
// academy-web has no Reserved-context-slots UI (only academy-frontend does,
// per proposal §4.1) — this repo only needs the repo-request flag.

/** Gates `TrainingRepoCard`'s render (also gated identically in academy-frontend). */
export const featureRepoRequest = import.meta.env.VITE_FEATURE_REPO_REQUEST !== 'false'
