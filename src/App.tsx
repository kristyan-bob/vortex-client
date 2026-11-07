import { useCallback, useEffect, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'

type CompanionStatus = { installed: boolean; running: boolean; path: string; os: string }
type Notice = { kind: 'success' | 'error' | 'info'; text: string }
type Goal = 'fps' | 'balanced' | 'visuals'
type Point = { x: number; y: number }

const STORAGE_KEY = 'playvortex-executable-path'
const GOAL_KEY = 'playvortex-performance-goal'
const SIDEBAR_POSITION_KEY = 'playvortex-sidebar-position'
const SIDEBAR_COLLAPSED_KEY = 'playvortex-sidebar-collapsed'
const DEFAULT_PATH = String.raw`C:\Users\kslal\Downloads\Vortex-Windows (4)\Vortex\Vortex.exe`
const goals: { id: Goal; title: string; description: string }[] = [
  { id: 'fps', title: 'Higher FPS', description: 'Favor smoother frame rates' },
  { id: 'balanced', title: 'Balanced', description: 'Keep a mix of quality and speed' },
  { id: 'visuals', title: 'Visual quality', description: 'Favor graphics quality' }
]

function loadStoredValue(key: string, fallback: string) {
  try { return localStorage.getItem(key) || fallback } catch { return fallback }
}

function loadSidebarPosition(): Point {
  try {
    const value = JSON.parse(localStorage.getItem(SIDEBAR_POSITION_KEY) || 'null') as Point | null
    if (value && Number.isFinite(value.x) && Number.isFinite(value.y)) return value
  } catch { /* use the default position */ }
  return { x: 18, y: 18 }
}

export default function App() {
  const [path, setPath] = useState(() => loadStoredValue(STORAGE_KEY, DEFAULT_PATH))
  const [goal, setGoal] = useState<Goal>(() => {
    const saved = loadStoredValue(GOAL_KEY, 'fps')
    return goals.some((item) => item.id === saved) ? saved as Goal : 'fps'
  })
  const [sidebarPosition, setSidebarPosition] = useState<Point>(loadSidebarPosition)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => loadStoredValue(SIDEBAR_COLLAPSED_KEY, 'false') === 'true')
  const dragOffset = useRef<Point | null>(null)
  const [status, setStatus] = useState<CompanionStatus | null>(null)
  const [checking, setChecking] = useState(true)
  const [launching, setLaunching] = useState(false)
  const [openingSettings, setOpeningSettings] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const refreshStatus = useCallback(async () => {
    setChecking(true)
    try {
      const current = await invoke<CompanionStatus>('get_vortex_status')
      setStatus(current)
      setNotice(null)
    } catch (error) {
      setNotice({ kind: 'error', text: `Could not check Vortex status: ${String(error)}` })
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    void refreshStatus()
    const timer = window.setInterval(() => void refreshStatus(), 10000)
    return () => window.clearInterval(timer)
  }, [refreshStatus])

  useEffect(() => {
    try { localStorage.setItem(SIDEBAR_POSITION_KEY, JSON.stringify(sidebarPosition)) } catch { /* position remains for this session */ }
  }, [sidebarPosition])

  const moveSidebar = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragOffset.current) return
    const width = sidebarCollapsed ? 76 : 248
    const height = sidebarCollapsed ? 190 : 320
    const next = {
      x: Math.max(8, Math.min(window.innerWidth - width - 8, event.clientX - dragOffset.current.x)),
      y: Math.max(8, Math.min(window.innerHeight - Math.min(height, window.innerHeight - 16) - 8, event.clientY - dragOffset.current.y))
    }
    setSidebarPosition(next)
  }

  const startSidebarDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if ((event.target as HTMLElement).closest('button[data-no-drag="true"]')) return
    dragOffset.current = { x: event.clientX - sidebarPosition.x, y: event.clientY - sidebarPosition.y }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const stopSidebarDrag = () => { dragOffset.current = null }

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current
      try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next)) } catch { /* session state still updates */ }
      return next
    })
  }

  const selectGoal = (nextGoal: Goal) => {
    setGoal(nextGoal)
    try { localStorage.setItem(GOAL_KEY, nextGoal) } catch { /* selection remains active for this session */ }
  }

  const savePath = () => {
    try {
      localStorage.setItem(STORAGE_KEY, path.trim())
      setNotice({ kind: 'success', text: 'Vortex executable path saved on this computer.' })
    } catch (error) {
      setNotice({ kind: 'error', text: `Could not save the path: ${String(error)}` })
    }
  }

  const launchVortex = async () => {
    const target = path.trim().replace(/^"|"$/g, '')
    if (!target) {
      setNotice({ kind: 'error', text: 'Enter the full path to Vortex.exe first.' })
      return
    }
    setLaunching(true)
    setNotice({ kind: 'info', text: 'Starting Vortex…' })
    try {
      await invoke('launch_vortex', { path: target })
      setNotice({ kind: 'success', text: 'Vortex launch requested. The selected goal is guidance only; it does not change game settings.' })
      window.setTimeout(() => void refreshStatus(), 1500)
    } catch (error) {
      setNotice({ kind: 'error', text: String(error) })
    } finally {
      setLaunching(false)
    }
  }

  const openGraphicsSettings = async () => {
    setOpeningSettings(true)
    try {
      await invoke('open_windows_graphics_settings')
      setNotice({ kind: 'info', text: 'In Windows Graphics settings, add the Vortex.exe path below, choose Options → High performance → Save, then restart Vortex. Windows does not report that preference back to this app.' })
    } catch (error) {
      setNotice({ kind: 'error', text: String(error) })
    } finally {
      setOpeningSettings(false)
    }
  }

  const statusLabel = checking && !status ? 'Checking…' : status?.running ? 'Running' : status?.installed ? 'Installed' : 'Not detected'
  const statusTone = status?.running ? 'live' : status?.installed ? 'ready' : 'missing'

  return (
    <div className="app-shell">
      <aside
        className={`sidebar draggable-sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}
        style={{ left: sidebarPosition.x, top: sidebarPosition.y }}
        aria-label="Draggable PlayVortex sidebar"
      >
        <div className="sidebar-drag-row">
          <button
            className="sidebar-drag-handle"
            type="button"
            aria-label="Drag sidebar to move it. Use arrow keys to reposition."
            title="Drag to move sidebar"
            onPointerDown={startSidebarDrag}
            onPointerMove={moveSidebar}
            onPointerUp={stopSidebarDrag}
            onPointerCancel={stopSidebarDrag}
            onKeyDown={(event) => {
              const step = event.shiftKey ? 30 : 10
              const directions: Record<string, Point> = {
                ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 },
                ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step }
              }
              const delta = directions[event.key]
              if (!delta) return
              event.preventDefault()
              setSidebarPosition((current) => ({
                x: Math.max(8, Math.min(window.innerWidth - (sidebarCollapsed ? 84 : 256), current.x + delta.x)),
                y: Math.max(8, Math.min(window.innerHeight - 80, current.y + delta.y))
              }))
            }}
          >
            <span className="drag-grip" aria-hidden="true">⠿</span>
            {!sidebarCollapsed && <><span>MOVE PANEL</span><span className="drag-hint">DRAG</span></>}
          </button>
          <button className="sidebar-collapse" type="button" onClick={toggleSidebar} aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {sidebarCollapsed ? '›' : '‹'}
          </button>
        </div>
        {!sidebarCollapsed ? (
          <>
            <div className="brand-block">
              <div className="brand-badge">V</div>
              <div><p className="eyebrow">Desktop companion</p><h1>PlayVortex</h1></div>
            </div>
            <div className="sidebar-divider" />
            <div className="sidebar-status">
              <span className={`status-indicator ${statusTone}`} />
              <div><small>Vortex status</small><strong>{statusLabel}</strong></div>
            </div>
            <div className="sidebar-footer">This app does not set an FPS cap or change Vortex’s internal graphics settings.</div>
          </>
        ) : (
          <div className="collapsed-status" title={`Vortex: ${statusLabel}`}>
            <span className={`status-indicator ${statusTone}`} />
            <span>{status?.running ? 'ON' : 'V'}</span>
          </div>
        )}
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div><p className="eyebrow">VORTEX PERFORMANCE</p><h2>Make gameplay smoother</h2><p className="subtitle">Choose a goal to see relevant tips. The choice is a guide, not an automatic game setting.</p></div>
          <div className="topbar-actions">
            <button className="ghost-btn" type="button" onClick={() => void refreshStatus()} disabled={checking}>{checking ? 'Checking…' : 'Refresh status'}</button>
            <button className="primary-btn" type="button" onClick={() => void launchVortex()} disabled={launching}>{launching ? 'Launching…' : 'Launch Vortex'}</button>
          </div>
        </header>

        {notice && <div className={`notice ${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>{notice.text}</div>}

        <section className="status-banner">
          <div><span className="eyebrow">VORTEX APPLICATION</span><h3>{statusLabel}</h3><p>{status?.path || path || 'Executable path not detected'}</p></div>
          <div className={`status-pill ${statusTone}`}><span className={`status-indicator ${statusTone}`} />{statusLabel}</div>
        </section>

        <section className="panel goal-panel" aria-labelledby="goal-title">
          <div className="panel-header"><div><p className="eyebrow">YOUR GOAL</p><h3 id="goal-title">What do you want to improve?</h3></div></div>
          <div className="goal-list" role="group" aria-label="Gameplay goal">
            {goals.map((item) => (
              <button key={item.id} type="button" className={`goal-option ${goal === item.id ? 'selected' : ''}`} onClick={() => selectGoal(item.id)} aria-pressed={goal === item.id}>
                <span className={`profile-radio ${goal === item.id ? 'checked' : ''}`} />
                <span className="profile-copy"><strong>{item.title}</strong><small>{item.description}</small></span>
                <span className="profile-choice">{goal === item.id ? 'Selected' : 'Select'}</span>
              </button>
            ))}
          </div>
          <p className="goal-disclaimer"><strong>{goals.find((item) => item.id === goal)?.title} selected.</strong> This selection only changes the tips below; it does not alter Vortex or guarantee higher FPS.</p>
        </section>

        <section className="performance-grid">
          <article className="panel performance-card">
            <div className="performance-number">01</div>
            <p className="eyebrow">WINDOWS GPU PREFERENCE</p>
            <h3>Try the high-performance GPU</h3>
            <p>If your PC has more than one graphics adapter, Windows may let you choose which one Vortex uses. This opens Settings; you review and apply the choice yourself.</p>
            <button className="primary-btn" type="button" onClick={() => void openGraphicsSettings()} disabled={openingSettings}>{openingSettings ? 'Opening settings…' : 'Open Windows Graphics settings'}</button>
            <ol className="instruction-list">
              <li>Add the Vortex.exe path shown below (use <strong>Browse</strong> if needed).</li>
              <li>Choose Vortex → <strong>Options</strong> → <strong>High performance</strong> → <strong>Save</strong>.</li>
              <li>Restart Vortex and check gameplay. This app cannot verify Windows’ GPU selection.</li>
            </ol>
          </article>

          <article className="panel performance-card">
            <div className="performance-number">02</div>
            <p className="eyebrow">IN-GAME SETTINGS</p>
            <h3>{goal === 'fps' ? 'Reduce rendering work' : goal === 'visuals' ? 'Keep visual quality in mind' : 'Tune one setting at a time'}</h3>
            {goal === 'fps' ? (
              <ul className="checklist"><li>Lower resolution or render scale if frame rate is low.</li><li>Reduce shadows, effects, and other demanding quality settings.</li><li>Try a smaller game window; fewer pixels may reduce GPU load.</li><li>Change one option, then compare in the same game scene.</li></ul>
            ) : goal === 'visuals' ? (
              <ul className="checklist"><li>Keep the current resolution and lower only the settings you can compromise on.</li><li>Watch for stuttering; restore the last setting if it gets worse.</li><li>Use the in-game quality menu rather than unknown launch flags.</li></ul>
            ) : (
              <ul className="checklist"><li>Start with the game’s default settings.</li><li>Lower shadows or effects first if you see slowdowns.</li><li>Compare changes in the same scene and revert anything that hurts.</li></ul>
            )}
            <p className="caution-note">Lowering graphics may improve frame rate when the GPU is the bottleneck. It does not necessarily reduce network ping.</p>
          </article>
        </section>

        <section className="panel executable-panel">
          <div className="panel-header"><div><p className="eyebrow">SETUP</p><h3>Vortex executable</h3></div></div>
          <label className="field-label" htmlFor="vortex-path">Full path to Vortex.exe</label>
          <input id="vortex-path" className="field-input" value={path} onChange={(event) => setPath(event.target.value)} spellCheck={false} />
          <div className="settings-actions"><button className="ghost-btn" type="button" onClick={savePath}>Save path</button><button className="primary-btn" type="button" onClick={() => void launchVortex()} disabled={launching}>{launching ? 'Launching…' : 'Launch Vortex'}</button></div>
          <p className="path-hint">Changes are made in Windows or Vortex itself. This companion does not modify hidden files, the registry, process priority, or game settings.</p>
        </section>
        <footer className="app-footer">FPS and latency are not measured by this app. Apply one change at a time and revert it if gameplay worsens.</footer>
      </main>
    </div>
  )
}
