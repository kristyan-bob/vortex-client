import { useMemo, useState } from 'react'

type Profile = {
  id: number
  name: string
  mode: string
  fps: number
  latency: number
  color: string
}

const initialProfiles: Profile[] = [
  { id: 1, name: 'Competitive', mode: 'High FPS', fps: 144, latency: 22, color: '#6ee7b7' },
  { id: 2, name: 'Balanced', mode: 'Smooth gameplay', fps: 120, latency: 36, color: '#60a5fa' },
  { id: 3, name: 'Streaming', mode: 'Capture ready', fps: 60, latency: 54, color: '#fbbf24' }
]

export default function App() {
  const [activeProfile, setActiveProfile] = useState<number>(1)
  const [gamePath, setGamePath] = useState<string>('C:/Games/PlayVortex/PlayVortex.exe')

  const active = useMemo(
    () => initialProfiles.find((profile) => profile.id === activeProfile) ?? initialProfiles[0],
    [activeProfile]
  )

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

        <nav className="nav">
          <button className="nav-item active">Dashboard</button>
          <button className="nav-item">Games</button>
          <button className="nav-item">Profiles</button>
          <button className="nav-item">Studio</button>
        </nav>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">PlayVortex launcher</p>
            <h2>Performance and setup dashboard</h2>
          </div>
          <button className="primary-btn">Launch PlayVortex</button>
        </header>

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
            <strong>Stable</strong>
            <small>Ready for PlayVortex</small>
          </div>
        </section>

        <section className="content-grid">
          <div className="panel">
            <div className="panel-header">
              <h3>Profiles</h3>
              <button className="ghost-btn">Save</button>
            </div>

            <div className="profile-list">
              {initialProfiles.map((profile) => (
                <button
                  key={profile.id}
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
              <button className="ghost-btn">Browse</button>
            </div>

            <label className="field-label">Game path</label>
            <input
              className="field-input"
              value={gamePath}
              onChange={(event) => setGamePath(event.target.value)}
            />

            <div className="toggle-row">
              <span>Performance boost</span>
              <button className="toggle on">On</button>
            </div>
            <div className="toggle-row">
              <span>Overlay enabled</span>
              <button className="toggle on">On</button>
            </div>
            <div className="toggle-row">
              <span>Quick join</span>
              <button className="toggle on">On</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
