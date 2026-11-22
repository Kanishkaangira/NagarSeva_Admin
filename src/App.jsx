import { useState } from 'react'
import { isSupabaseConfigured } from './lib/supabase'
import './App.css'

const navigation = [
  { label: 'Overview', icon: 'grid' },
  { label: 'Complaints', icon: 'inbox' },
  { label: 'Services', icon: 'layers' },
  { label: 'Residents', icon: 'users' },
]

const icons = {
  grid: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  ),
  inbox: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5.5h16v13H4z" />
      <path d="M4 14h4l1.5 2h5L16 14h4M8 9h8" />
    </svg>
  ),
  layers: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20v-1.5a6.5 6.5 0 0 1 13 0V20zM16 5a3.5 3.5 0 0 1 0 6.8M18 14a5.5 5.5 0 0 1 3.5 5.1v.9" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="m19.4 15 .1.1 1.1.9-1.4 2.4-1.4-.5a7.7 7.7 0 0 1-1.4.8l-.3 1.5h-2.8l-.3-1.5a7.7 7.7 0 0 1-1.4-.8l-1.4.5-1.4-2.4 1.1-.9a7.4 7.4 0 0 1 0-1.7l-1.1-.9 1.4-2.4 1.4.5a7.7 7.7 0 0 1 1.4-.8l.3-1.5h2.8l.3 1.5a7.7 7.7 0 0 1 1.4.8l1.4-.5 1.4 2.4-1.1.9a7.4 7.4 0 0 1 0 1.6Z" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  ),
  arrow: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  ),
}

function App() {
  const [activePage, setActivePage] = useState('Overview')

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="NagarSeva Admin home">
          <span className="brand-mark">N</span>
          <span className="brand-copy">
            <strong>NagarSeva</strong>
            <span>ADMIN PORTAL</span>
          </span>
        </a>

        <div className="nav-caption">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <button
              className={`nav-item${activePage === item.label ? ' active' : ''}`}
              key={item.label}
              onClick={() => setActivePage(item.label)}
              type="button"
            >
              <span className="nav-icon">{icons[item.icon]}</span>
              <span>{item.label}</span>
              {item.label === 'Complaints' && <span className="nav-count">0</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-icon">{icons.check}</span>
            <div>
              <strong>Workspace setup</strong>
              <span>Start building your admin tools.</span>
            </div>
          </div>
          <button
            className={`nav-item settings-link${activePage === 'Settings' ? ' active' : ''}`}
            onClick={() => setActivePage('Settings')}
            type="button"
          >
            <span className="nav-icon">{icons.settings}</span>
            <span>Settings</span>
          </button>
          <div className="profile">
            <div className="avatar">NS</div>
            <div className="profile-copy">
              <strong>Administrator</strong>
              <span>Municipal team</span>
            </div>
            <span className="profile-menu" aria-hidden="true">···</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>Workspace</span>
            <span className="breadcrumb-divider">/</span>
            <strong>{activePage}</strong>
          </div>
          <div className="topbar-actions">
            <label className="search-box">
              <span className="search-icon">{icons.search}</span>
              <input aria-label="Search" placeholder="Search..." type="search" />
              <kbd>⌘ K</kbd>
            </label>
            <div
              className={`connection-pill${isSupabaseConfigured ? ' ready' : ''}`}
              title={
                isSupabaseConfigured
                  ? 'Supabase environment variables are set'
                  : 'Add Supabase values to .env.local'
              }
            >
              <span className="connection-dot" />
              {isSupabaseConfigured ? 'Supabase configured' : 'Setup required'}
            </div>
          </div>
        </header>

        <div className="page-content">
          <section className="page-heading">
            <div>
              <div className="eyebrow">MUNICIPAL ADMINISTRATION</div>
              <h1>{activePage === 'Overview' ? 'Good to see you.' : activePage}</h1>
              <p>
                {activePage === 'Overview'
                  ? 'Your NagarSeva workspace is ready to set up.'
                  : `Manage ${activePage.toLowerCase()} from your workspace.`}
              </p>
            </div>
            <button
              className="date-button"
              onClick={() => setActivePage('Settings')}
              type="button"
            >
              <span className="date-icon">✳</span>
              Workspace settings
              <span className="button-arrow">{icons.arrow}</span>
            </button>
          </section>

          <section className="welcome-card">
            <div className="welcome-content">
              <div className="welcome-label">
                <span className="welcome-spark">✳</span>
                YOUR ADMIN WORKSPACE
              </div>
              <h2>{activePage === 'Overview' ? 'A better way to serve your city.' : `${activePage}, made clearer.`}</h2>
              <p>
                {isSupabaseConfigured
                  ? 'Your Supabase client is configured. Add your database schema and policies to start loading real municipal data.'
                  : 'Configure Supabase to prepare your workspace for real municipal data.'}
              </p>
              <button
                className="welcome-button"
                onClick={() => setActivePage('Settings')}
                type="button"
              >
                View setup details
                <span className="button-arrow">{icons.arrow}</span>
              </button>
            </div>
            <div className="welcome-art" aria-hidden="true">
              <div className="art-orbit orbit-one" />
              <div className="art-orbit orbit-two" />
              <div className="art-sun" />
              <div className="art-building building-one"><i /><i /><i /></div>
              <div className="art-building building-two"><i /><i /><i /><i /></div>
              <div className="art-ground" />
              <div className="art-spark spark-one">✳</div>
              <div className="art-spark spark-two">✦</div>
            </div>
          </section>

          <section className="section-heading">
            <div>
              <h2>Workspace modules</h2>
              <p>These sections are ready to connect to your database.</p>
            </div>
            <span className="module-count">04 MODULES</span>
          </section>

          <section className="module-grid" aria-label="Workspace modules">
            {navigation.slice(1).map((item, index) => (
              <button
                className="module-card"
                key={item.label}
                onClick={() => setActivePage(item.label)}
                type="button"
              >
                <span className={`module-icon module-icon-${index}`}>
                  {icons[item.icon]}
                </span>
                <span className="module-copy">
                  <strong>{item.label}</strong>
                  <span>Connect your {item.label.toLowerCase()} data</span>
                </span>
                <span className="module-arrow">{icons.arrow}</span>
              </button>
            ))}
          </section>

          <section className="setup-panel">
            <div className="setup-status">
              <span className={`status-icon${isSupabaseConfigured ? ' complete' : ''}`}>
                {icons.check}
              </span>
              <div>
                <span className="eyebrow">DATABASE CONNECTION</span>
                <h2>{isSupabaseConfigured ? 'Supabase client is ready' : 'Connect your database'}</h2>
                <p>
                  {isSupabaseConfigured
                    ? 'Connection settings are loaded from your local environment.'
                    : 'Add your Supabase URL and public key to the local environment file.'}
                </p>
              </div>
            </div>
            <div className="setup-steps">
              <span><b>01</b> Define your tables</span>
              <span><b>02</b> Enable row-level security</span>
              <span><b>03</b> Connect modules</span>
            </div>
          </section>
          <footer className="page-footer">
            <span>NagarSeva Admin</span>
            <span>Built for better local governance</span>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default App
