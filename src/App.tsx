import { useEffect, useMemo, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'

type Profile = {
  id: number
  name: string
  mode: string
  fps: number
  latency: number
  color: string
}

type CompanionStatus = {
  installed: boolean
  running: boolean
  path: string
  os: string
}

type ToggleKey = 'boost' | 'overlay' | 'quickJoin'

const profiles: Profile[] = [
  { id: 1, name: 'Competitive', mode: 'High FPS', fps: 144, latency: 22, color: '#6ee7b7' },
  { id: 2, name: 'Balanced', mode: 'Smooth gameplay', fps: 120, latency: 36, color: '#60a5fa' },
  { id: 3, name: 'Streaming', mode: 'Capture ready', fps: 60, latency: 54, color: '#fbbf24' }
]

export default function App() {
  const [activeProfile, setActiveProfile] = useState<number>(2)
  const [status, setStatus] = useState<CompanionStatus | null>(null)
  const [customPath, setCustomPath] = useState<string>('C:/Games/PlayVortex/PlayVortex.exe')
  const [loading, setLoading] = useState(true)
  const [launching, setLaunching] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [toggles, setToggles] = useState<Record<ToggleKey, boolean>>({
    boost: true,
    overlay: true,
    quickJoin: true
  })

  const active = useMemo(
    () => profiles.find((profile) => profile.id === activeProfile) ?? profiles[1],
    [activeProfile]
  )

  const refreshStatus = async () => {
    setLoading(true)
    try {
      const current = await invoke<CompanionStatus>('get_vortex_status')
      setStatus(current)
      if (current.path) {
        setCustomPath(current.path)
      }
      setMessage(null)
    } catch (error) {
      setMessage({ type: 'error', text: String(error) })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshStatus()
    const timer = window.setInterval(() => {
      void refreshStatus()
    }, 5000)

    return () => window.clearInterval(timer)
  }, [])

  const launchVortex = async () => {
    const targetPath = customPath.trim() || status?.path || ''

    if (!targetPath) {
      setMessage({ type: 'error', text: 'No Vortex path is available yet. Try refreshing status first.' })
      return
    }

    setLaunching(true)
    setMessage({ type: 'info', text: 'Launching Vortex…' })

    try {
      await invoke('launch_vortex', { path: targetPath })
      setMessage({ type: 'success', text: `Vortex launched from ${targetPath}` })
      window.setTimeout(() => void refreshStatus(), 1500)
    } catch (error) {
      setMessage({ type: 'error', text: String(error) })
    } finally {
      setLaunching(false)
    }
  }

  const toggleFeature = (key: ToggleKey) => {
    setToggles((previous) => ({ ...previous, [key]: !previous[key] }))
  }

  const systemStatus = status?.running ? 'Running' : status?.installed ? 'Ready' : 'Not installed'

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-badge">V</div>
          <div>
            <p className="eyebrow">Companion client</p>
            <h1>PlayVortex</h1>
          </div>
        </div>

        <nav className="nav" aria-label="Main navigation">
          <button className="nav-item active" type="button">Dashboard</button>
          <button className="nav-item" type="button">Games</button>
          <button className="nav-item" type="button">Profiles</button>
          <button className="nav-item" type="button">Studio</button>
        </nav>

        <div className="sidebar-panel">
          <span className="status-dot" aria-hidden="true" />
          <div>
            <small>System status</small>
            <strong>{systemStatus}</strong>
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">PlayVortex launcher</p>
            <h2>Performance and setup dashboard</h2>
          </div>
          <div className="topbar-actions">
            <button className="ghost-btn" type="button" onClick={() => void refreshStatus()} disabled={loading}>
              {loading ? 'Checking…' : 'Refresh'}
            </button>
            <button className="primary-btn" type="button" onClick={() => void launchVortex()} disabled={loading || launching || !customPath.trim()}>
              {launching ? 'Launching…' : status?.running ? 'Vortex is running' : 'Launch PlayVortex'}
            </button>
          </div>
        </header>

        {message && <div className={`notice ${message.type}`}>{message.text}</div>}

        <section className="stats-grid">
          <div className="stat-card accent">
            <span>Current profile</span>
            <strong>{active.name}</strong>
            <small>{active.mode}</small>
          </div>
          <div className="stat-card">
            <span>FPS target</span>
            <strong>{active.fps}</strong>
            <small>Frames per second</small>
          </div>
          <div className="stat-card">
            <span>Latency</span>
            <strong>{active.latency} ms</strong>
            <small>Network + system load</small>
          </div>
          <div className="stat-card">
            <span>System status</span>
            <strong>{systemStatus}</strong>
            <small>{status?.os ? `Detected on ${status.os}` : 'Checking system…'}</small>
          </div>
        </section>

        <section className="content-grid">
          <div className="panel">
            <div className="panel-header">
              <h3>Profiles</h3>
            </div>

            <div className="profile-list">
              {profiles.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  className={`profile-card ${activeProfile === profile.id ? 'selected' : ''}`}
                  onClick={() => setActiveProfile(profile.id)}
                >
                  <div className="dot" style={{ background: profile.color }} />
                  <div>
                    <strong>{profile.name}</strong>
                    <small>{profile.mode}</small>
                  </div>
                  <span>{profile.fps} FPS</span>
                </button>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h3>Launch settings</h3>
            </div>

            <label className="field-label" htmlFor="game-path">Game path</label>
            <input
              id="game-path"
              className="field-input"
              value={customPath}
              onChange={(event) => setCustomPath(event.target.value)}
              placeholder="C:/Games/PlayVortex/PlayVortex.exe"
            />

            <div className="toggle-row">
              <span>Performance boost</span>
              <button
                type="button"
                className={`toggle ${toggles.boost ? 'on' : 'off'}`}
                onClick={() => toggleFeature('boost')}
              >
                {toggles.boost ? 'On' : 'Off'}
              </button>
            </div>
            <div className="toggle-row">
              <span>Overlay enabled</span>
              <button
                type="button"
                className={`toggle ${toggles.overlay ? 'on' : 'off'}`}
                onClick={() => toggleFeature('overlay')}
              >
                {toggles.overlay ? 'On' : 'Off'}
              </button>
            </div>
            <div className="toggle-row">
              <span>Quick join</span>
              <button
                type="button"
                className={`toggle ${toggles.quickJoin ? 'on' : 'off'}`}
                onClick={() => toggleFeature('quickJoin')}
              >
                {toggles.quickJoin ? 'On' : 'Off'}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
