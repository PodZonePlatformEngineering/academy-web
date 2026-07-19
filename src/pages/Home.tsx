// Home (B8 Task 3) — the trainee's own corner of the academy: who they are,
// their device-local config, and help. The key vault moved here from the
// retired /keys page (same behaviour; /keys redirects here).

import KeyVault from '@/components/KeyVault'

export default function Home() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Home</h1>
        <p className="text-sm text-muted-foreground">
          Your profile, your device-local configuration, and where to find help.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Config</h2>
        <KeyVault />
      </section>
    </div>
  )
}
