import { useCallback, useEffect, useMemo, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'

type CompanionStatus = {
  installed: boolean
  running: boolean
  path: string
  os: string
}

type Profile = {
  id: string
  name: string
  description: string
}

type Preferences = {
  profile: string
  path: string
}

const profiles: Profile[] = [
  { id: 'competitive', name: 'Competitive', description: 'Responsiveness-focused preference' },
  { id: 'balanced', name: 'Balanced', description: 'Everyday preference' },
  { id: 'streaming', name: 'Streaming', description: 'Streaming workflow preference' }
]

const STORAGE_KEY = 'playvortex-companion-preferences-v1'

function readPreferences(): Preferences {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<Preferences>
    return {
      profile: profiles.some((profile) => profile.id === stored.profile) ? stored.profile! : 'balanced',
      path: typeof stored.path === 'string' ? stored.path : ''
    }
  } catch {
    return { profile: 'balanced', path: '' }
  }
}

export default function App() {
  const [preferences, setPreferences] = useState<Preferences>(readPreferences)
  const [status, setStatus] = useState<CompanionStatus | null>(null)
  const [checking, setChecking] = useState(true)
  const [launching, setLaunching] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === preferences.profile) ?? profiles[1],
    [preferences.profile]
  )

  const refreshStatus = useCallback(async (quiet = false) => {
    if (!quiet) setChecking(true)
    try {
      const result = await invoke<CompanionStatus>('get_vortex_status')
      setStatus(result)
      setLastChecked(new Date())
      setPreferences((current) => current.path ? current : { ...current, path: result.path })
      setNotice((current) => current?.kind === 'error' ? null : current)
    } catch (error) {
      setNotice({ kind: 'error', text: `Could not check Vortex status: ${String(error)}` })
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    void refreshStatus()
    const timer = window.setInterval(() => void refreshStatus(true), 10000)
    return () => window.clearInterval(timer)
  }, [refreshStatus])

  const savePreferences = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
      setNotice({ kind: 'success', text: 'Profile and executable path saved on this computer.' })
    } catch (error) {
      setNotice({ kind: 'error', text: `Could not save preferences: ${String(error)}` })
    }
  }

  const launchVortex = async () => {
    const path = preferences.path.trim()
    if (!path) {
      setNotice({ kind: 'error', text: 'Enter the full path to Vortex.exe before launching.' })
      return
    }

    setLaunching(true)
    setNotice({ kind: 'info', text: 'Starting Vortex…' })
    try {
      await invoke('launch_vortex', { path })
      setNotice({ kind: 'success', text: 'Vortex launch was requested successfully.' })
      window.setTimeout(() => void refreshStatus(true), 1500)
    } catch (error) {
      setNotice({ kind: 'error', text: String(error) })
    } finally {
      setLaunching(false)
    }
  }

  const statusLabel = checking && !status
    ? 'Checking…'
    : status?.running
      ? 'Running'
      : status?.installed
        ? 'Installed'
        : 'Not detected'
  const statusTone = status?.running ? 'live' : status?.installed ? 'ready' : 'missing'

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-badge">V</div>
          <div>
            <p className="eyebrow">Desktop companion</p>
            <h1>PlayVortex</h1>
          </div>
        </div>
        <div className="sidebar-divider" />
        <div className="sidebar-status">
          <span className={`status-indicator ${statusTone}`} />
          <div>
            <small>Vortex status</small>
            <strong>{statusLabel}</strong>
          </div>
        </div>
        <div className="sidebar-footer">
          <span>Preferences are saved locally.</span>
          <span>Performance and overlay controls are not provided by this companion yet.</span>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">OVERVIEW</p>
            <h2>Your launcher dashboard</h2>
            <p className="subtitle">Check Vortex and launch it from one place.</p>
          </div>
          <div className="topbar-actions">
            <button className="ghost-btn" type="button" onClick={() => void refreshStatus()} disabled={checking}>
              {checking ? 'Checking…' : 'Refresh status'}
            </button>
            <button className="primary-btn" type="button" onClick={() => void launchVortex()} disabled={launching}>
              {launching ? 'Launching…' : 'Launch Vortex'}
            </button>
          </div>
        </header>

        {notice && (
          <div className={`notice ${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
            {notice.text}
          </div>
        )}

        <section className="status-banner">
          <div>
            <span className="eyebrow">VORTEX APPLICATION</span>
            <h3>{statusLabel}</h3>
            <p>{status?.path || 'No install was detected automatically. Enter the executable path below.'}</p>
          </div>
          <div className={`status-pill ${statusTone}`}>
            <span className={`status-indicator ${statusTone}`} />
            {statusLabel}
          </div>
        </section>

        <section className="content-grid">
          <div className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">PERSONALIZE</p>
                <h3>Launch profile</h3>
              </div>
            </div>
            <p className="panel-description">Select and save a workflow preference. This does not modify game settings.</p>
            <div className="profile-list">
              {profiles.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  className={`profile-card ${preferences.profile === profile.id ? 'selected' : ''}`}
                  onClick={() => setPreferences((current) => ({ ...current, profile: profile.id }))}
                  aria-pressed={preferences.profile === profile.id}
                >
                  <span className={`profile-radio ${preferences.profile === profile.id ? 'checked' : ''}`} />
                  <span className="profile-copy">
                    <strong>{profile.name}</strong>
                    <small>{profile.description}</small>
                  </span>
                  <span className="profile-choice">{preferences.profile === profile.id ? 'Selected' : 'Choose'}</span>
                </button>
              ))}
            </div>
            <div className="selected-profile">
              <span>Current preference</span>
              <strong>{selectedProfile.name}</strong>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">SETUP</p>
                <h3>Executable path</h3>
              </div>
            </div>
            <p className="panel-description">Enter the full path to Vortex.exe. A custom installation path works even when automatic detection does not.</p>
            <label className="field-label" htmlFor="vortex-path">Vortex executable</label>
            <input
              id="vortex-path"
              className="field-input"
              value={preferences.path}
              onChange={(event) => setPreferences((current) => ({ ...current, path: event.target.value }))}
              placeholder={'C:\\Program Files\\Vortex\\Vortex.exe'}
              spellCheck={false}
            />
            <div className="path-hint">Tip: In File Explorer, Shift + right-click Vortex.exe and select “Copy as path”.</div>
            <div className="settings-actions">
              <button className="ghost-btn" type="button" onClick={savePreferences}>Save preferences</button>
              <button className="primary-btn" type="button" onClick={() => void launchVortex()} disabled={launching}>
                {launching ? 'Launching…' : 'Launch from this path'}
              </button>
            </div>
            <div className="details-list">
              <div>
                <span>Operating system</span>
                <strong>{status?.os ?? '—'}</strong>
              </div>
              <div>
                <span>Last checked</span>
                <strong>{lastChecked?.toLocaleTimeString() ?? '—'}</strong>
              </div>
            </div>
          </div>
        </section>
        <footer className="app-footer">Status checks refresh every 10 seconds. FPS and latency are not measured by this app.</footer>
      </main>
    </div>
  )
}
