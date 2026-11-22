import { useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import './App.css'

const roleDetails = {
  superadmin: {
    label: 'Super Administrator',
    scopeLabel: 'Statewide administration',
    description: 'Statewide visibility and administrative oversight.',
    navigation: ['Overview', 'Complaints', 'Departments', 'Districts', 'Administrators'],
  },
  stateadmin: {
    label: 'State Department Administrator',
    scopeLabel: 'Department · State level',
    description: 'Department-wide operations across the state.',
    navigation: ['Overview', 'Department queue', 'Districts'],
  },
  districtadmin: {
    label: 'District Officer',
    scopeLabel: 'District operations',
    description: 'Local reports and resolution work for your district.',
    navigation: ['Overview', 'District queue'],
  },
}

const directoryConfig = {
  Departments: {
    table: 'departments',
    select: 'id,code,name,is_external,is_active',
    title: 'Departments',
    description: 'Government service departments configured for issue routing.',
    columns: ['CODE', 'DEPARTMENT', 'TYPE', 'STATUS'],
    values: (row) => [row.code, row.name, row.is_external ? 'External authority' : 'Government department', row.is_active ? 'Active' : 'Inactive'],
  },
  Districts: {
    table: 'districts',
    select: 'id,name,is_active',
    title: 'Districts',
    description: 'District jurisdictions available in the NagarSeva service area.',
    columns: ['ID', 'DISTRICT', 'STATUS'],
    values: (row) => [row.id, row.name, row.is_active ? 'Active' : 'Inactive'],
  },
  Administrators: {
    table: 'admin_users',
    select: 'email,role,department_id,district_id,is_active,created_at',
    title: 'Administrator accounts',
    description: 'Authorized accounts and the scope assigned to each administrator.',
    columns: ['ACCOUNT', 'ROLE', 'DEPARTMENT', 'DISTRICT', 'STATUS'],
    values: (row) => [
      row.email,
      roleDetails[row.role]?.label || row.role,
      row.department_id ?? 'Statewide',
      row.district_id ?? 'All districts',
      row.is_active ? 'Active' : 'Inactive',
    ],
  },
}

const issueFilters = [
  { id: 'all', label: 'All reports' },
  { id: 'active', label: 'Active' },
  { id: 'critical', label: 'Critical' },
  { id: 'unassigned', label: 'Unassigned' },
]

const icons = {
  overview: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1" />
    </>
  ),
  complaints: (
    <>
      <path d="M5 4.5h14v15H5z" />
      <path d="M8.5 9h7M8.5 12.5h7M8.5 16h4" />
    </>
  ),
  departments: (
    <>
      <path d="M3.5 20.5h17M5 20.5V8l7-4 7 4v12.5M9 10h.01M15 10h.01M9 13.5h.01M15 13.5h.01M10 20.5v-4h4v4" />
    </>
  ),
  districts: (
    <>
      <path d="M20 10.2c0 5.2-8 10.3-8 10.3S4 15.4 4 10.2a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  administrators: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.8 20v-1.3a6.2 6.2 0 0 1 12.4 0V20zM16 5.2a3.2 3.2 0 0 1 0 6.2M18 14a5.2 5.2 0 0 1 3.2 4.7V20" />
    </>
  ),
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 19 6v5c0 4.6-2.8 8-7 10-4.2-2-7-5.4-7-10V6z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  arrow: <path d="M7 17 17 7M8 7h9v9" />,
  logout: (
    <>
      <path d="M10 17l5-5-5-5M15 12H3" />
      <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12s3.2-6 9.5-6 9.5 6 9.5 6-3.2 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  eyeOff: (
    <>
      <path d="m3 3 18 18M10.6 6.2A10.7 10.7 0 0 1 12 6c6.3 0 9.5 6 9.5 6a15 15 0 0 1-3.2 3.7M6.2 6.3C3.8 8 2.5 12 2.5 12s3.2 6 9.5 6c1 0 1.9-.2 2.7-.5" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 7v5h-5M4 17v-5h5" />
      <path d="M5.5 9a7 7 0 0 1 11.6-2L20 12M4 12l2.9 5a7 7 0 0 0 11.6-2" />
    </>
  ),
}

function Icon({ name, className = '' }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      {icons[name]}
    </svg>
  )
}

function Brand({ compact = false }) {
  return (
    <a className={`brand${compact ? ' brand-compact' : ''}`} href="/" aria-label="NagarSeva home">
      <span className="brand-emblem" aria-hidden="true">
        <span>N</span>
      </span>
      <span className="brand-name">
        <strong>NagarSeva</strong>
        <span>PUBLIC SERVICE PORTAL</span>
      </span>
    </a>
  )
}

function LoadingScreen() {
  return (
    <main className="auth-page">
      <div className="auth-loading">
        <Brand />
        <span className="loading-spinner" />
        <p>Securely checking your session…</p>
      </div>
    </main>
  )
}

function SignInScreen({ error, onSignIn, busy }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    await onSignIn(email.trim(), password)
  }

  return (
    <main className="auth-page">
      <div className="auth-topline">
        <Brand />
        <span className="secure-label"><Icon name="shield" /> SECURE ADMIN ACCESS</span>
      </div>

      <div className="auth-layout">
        <section className="auth-card" aria-labelledby="sign-in-title">
          <div className="auth-intro">
            <span className="eyebrow">OFFICIAL ADMINISTRATION PORTAL</span>
            <h1 id="sign-in-title">Sign in to your workspace</h1>
            <p>Use your authorized government administrator account to continue.</p>
          </div>

          {!isSupabaseConfigured && (
            <div className="message-box message-error" role="alert">
              Supabase is not configured. Add the project URL and public key to
              <code> .env.local</code>, then restart the app.
            </div>
          )}

          {error && <div className="message-box message-error" role="alert">{error}</div>}

          <form className="sign-in-form" onSubmit={handleSubmit}>
            <label htmlFor="admin-email">Official email address</label>
            <input
              autoComplete="username"
              disabled={!isSupabaseConfigured || busy}
              id="admin-email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@department.gov.in"
              required
              type="email"
              value={email}
            />

            <div className="password-label-row">
              <label htmlFor="admin-password">Password</label>
              <span>Contact your system administrator if you need help.</span>
            </div>
            <div className="password-field">
              <input
                autoComplete="current-password"
                disabled={!isSupabaseConfigured || busy}
                id="admin-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
                type={passwordVisible ? 'text' : 'password'}
                value={password}
              />
              <button
                aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                className="password-toggle"
                onClick={() => setPasswordVisible((visible) => !visible)}
                type="button"
              >
                <Icon name={passwordVisible ? 'eyeOff' : 'eye'} />
              </button>
            </div>

            <button
              className="primary-button sign-in-button"
              disabled={!isSupabaseConfigured || busy}
              type="submit"
            >
              {busy ? <><span className="button-spinner" /> Verifying account…</> : 'Sign in securely'}
            </button>
          </form>

          <div className="auth-security-note">
            <Icon name="shield" />
            <span>Your role and permitted access are verified securely after sign-in.</span>
          </div>
          <div className="auth-help">
            Administrator accounts are provisioned by authorized system staff.
            Public registration is disabled.
          </div>
        </section>

        <aside className="auth-aside">
          <div className="aside-seal" aria-hidden="true">
            <span className="seal-ring">NS</span>
          </div>
          <span className="aside-kicker">CITIZEN SERVICES · ACCOUNTABLE GOVERNANCE</span>
          <h2>One trusted workspace for public service.</h2>
          <p>
            Secure access for state administrators, department authorities, and
            district officers.
          </p>
          <div className="aside-divider" />
          <div className="access-levels">
            <div><span>01</span><strong>Statewide oversight</strong></div>
            <div><span>02</span><strong>Department coordination</strong></div>
            <div><span>03</span><strong>District operations</strong></div>
          </div>
          <div className="aside-tricolor" aria-hidden="true"><i /><i /><i /></div>
        </aside>
      </div>

      <footer className="auth-footer">
        <span>NagarSeva Administration</span>
        <span>For authorized government personnel only</span>
      </footer>
    </main>
  )
}

function getScope(admin) {
  if (admin.role === 'superadmin') return 'All departments · All districts'
  if (admin.role === 'stateadmin') {
    return `${admin.departmentName || `Department ${admin.department_id}`} · State level`
  }
  return `${admin.districtName || `District ${admin.district_id}`} · ${admin.departmentName || `Department ${admin.department_id}`}`
}

function getInitials(name) {
  return name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatStatus(status) {
  if (status === 'In Progress') return 'In progress'
  return status
}

function MetricCard({ label, value, detail, tone, icon }) {
  return (
    <article className="metric-card">
      <div className={`metric-icon metric-${tone}`}><Icon name={icon} /></div>
      <div className="metric-copy">
        <span>{label}</span>
        <strong>{value ?? '—'}</strong>
        <small>{detail}</small>
      </div>
    </article>
  )
}

function useAdminDashboard(admin, showFullQueue, refreshToken) {
  const [dashboard, setDashboard] = useState({
    loading: true,
    error: '',
    metrics: null,
    issues: [],
  })

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      if (!supabase) return

      setDashboard((current) => ({ ...current, loading: true, error: '' }))
      const openStatuses = ['Reported', 'Assigned', 'In Progress', 'Reopened']
      const countOptions = { count: 'exact', head: true }
      const requests = [
        supabase.from('GovtReport').select('report_id', countOptions),
        supabase.from('GovtReport').select('report_id', countOptions).in('status', openStatuses),
        supabase.from('GovtReport').select('report_id', countOptions)
          .eq('severity', 'Critical').in('status', openStatuses),
        supabase.from('GovtReport').select('report_id', countOptions)
          .in('status', ['Resolved', 'Closed']),
        supabase.from('GovtReport').select('report_id', countOptions)
          .is('assigned_to', null).in('status', openStatuses),
        supabase.from('GovtReport').select('report_id', countOptions)
          .eq('assigned_to', admin.user_id).in('status', openStatuses),
        supabase.from('GovtReport').select('report_id', countOptions)
          .eq('status', 'Resolved').eq('citizen_verification', 'Pending'),
        supabase.from('GovtReport')
          .select('report_id,status,severity,priority_score,reporter_count,department_id,district_id,assigned_at')
          .order('priority_score', { ascending: false, nullsFirst: false })
          .limit(showFullQueue ? 100 : 8),
      ]

      const results = await Promise.all(requests)
      const failedRequest = results.find((result) => result.error)
      if (failedRequest) {
        if (active) {
          setDashboard({
            loading: false,
            error: `Could not load dashboard data: ${failedRequest.error.message}`,
            metrics: null,
            issues: [],
          })
        }
        return
      }

      const issueRows = results[7].data || []
      let linkedReports = []

      if (issueRows.length) {
        const { data, error } = await supabase
          .from('UserReport')
          .select('id,complaint_number,location_address,created_at,issue_id')
          .in('issue_id', issueRows.map((issue) => issue.report_id))
          .order('created_at', { ascending: false })

        if (error) {
          if (active) {
            setDashboard({
              loading: false,
              error: `Could not load report details: ${error.message}`,
              metrics: null,
              issues: [],
            })
          }
          return
        }
        linkedReports = data || []
      }

      const reportsByIssue = new Map()
      for (const report of linkedReports) {
        const existing = reportsByIssue.get(report.issue_id) || []
        existing.push(report)
        reportsByIssue.set(report.issue_id, existing)
      }

      const issues = issueRows.map((issue) => {
        const relatedReports = reportsByIssue.get(issue.report_id) || []
        const primaryReport = relatedReports.find((report) => report.id === issue.report_id)
          || relatedReports[0]
        return { ...issue, primaryReport }
      })

      if (active) {
        setDashboard({
          loading: false,
          error: '',
          metrics: {
            total: results[0].count ?? 0,
            active: results[1].count ?? 0,
            critical: results[2].count ?? 0,
            resolved: results[3].count ?? 0,
            unassigned: results[4].count ?? 0,
            assignedToMe: results[5].count ?? 0,
            awaitingVerification: results[6].count ?? 0,
          },
          issues,
        })
      }
    }

    loadDashboard().catch((error) => {
      if (active) {
        setDashboard({
          loading: false,
          error: `Could not load dashboard data: ${error.message}`,
          metrics: null,
          issues: [],
        })
      }
    })

    return () => {
      active = false
    }
  }, [admin.user_id, refreshToken, showFullQueue])

  return dashboard
}

function getMetrics(admin, metrics) {
  if (!metrics) return []

  if (admin.role === 'superadmin') {
    return [
      { label: 'Total issues', value: metrics.total, detail: 'Across all districts', tone: 'blue', icon: 'complaints' },
      { label: 'Active cases', value: metrics.active, detail: 'Require follow-up', tone: 'amber', icon: 'overview' },
      { label: 'Critical issues', value: metrics.critical, detail: 'Highest severity', tone: 'red', icon: 'shield' },
      { label: 'Resolved', value: metrics.resolved, detail: 'Closed or resolved', tone: 'green', icon: 'departments' },
    ]
  }

  if (admin.role === 'stateadmin') {
    return [
      { label: 'Department issues', value: metrics.total, detail: 'Within your department', tone: 'blue', icon: 'complaints' },
      { label: 'Active queue', value: metrics.active, detail: 'Across state districts', tone: 'amber', icon: 'overview' },
      { label: 'Awaiting assignment', value: metrics.unassigned, detail: 'No officer assigned', tone: 'violet', icon: 'administrators' },
      { label: 'Critical issues', value: metrics.critical, detail: 'Needs urgent attention', tone: 'red', icon: 'shield' },
    ]
  }

  return [
    { label: 'District issues', value: metrics.total, detail: 'Within your district', tone: 'blue', icon: 'complaints' },
    { label: 'Active locally', value: metrics.active, detail: 'Open follow-up work', tone: 'amber', icon: 'overview' },
    { label: 'Assigned to me', value: metrics.assignedToMe, detail: 'Your assigned cases', tone: 'violet', icon: 'administrators' },
    { label: 'Awaiting verification', value: metrics.awaitingVerification, detail: 'Marked resolved', tone: 'green', icon: 'shield' },
  ]
}

function EmptyIssues({ filtered }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon name="complaints" /></span>
      <strong>{filtered ? 'No reports match these filters' : 'No issues in this workspace yet'}</strong>
      <p>{filtered
        ? 'Try another filter or search term to find reports in your authorized scope.'
        : 'When reports are submitted, they will appear here according to your access scope.'}</p>
    </div>
  )
}

function IssuesTable({ issues, loading, expanded = false, filtered = false }) {
  if (loading) {
    return <div className="table-loading"><span className="loading-spinner" /> Loading reports…</div>
  }

  if (!issues.length) return <EmptyIssues filtered={filtered} />

  return (
    <div className="table-scroll">
      <table className="issues-table">
        <thead>
          <tr>
            <th>COMPLAINT</th>
            <th>LOCATION</th>
            <th>STATUS</th>
            <th>SEVERITY</th>
            <th>REPORTERS</th>
            <th>PRIORITY</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue) => (
            <tr key={issue.report_id}>
              <td>
                <strong className="complaint-number">
                  {issue.primaryReport?.complaint_number || issue.report_id.slice(0, 8).toUpperCase()}
                </strong>
                <span className="table-subtext">
                  {issue.assigned_at ? 'Assigned issue' : 'Awaiting assignment'}
                </span>
              </td>
              <td className="location-cell">
                {issue.primaryReport?.location_address || 'Location pending'}
              </td>
              <td><span className={`status-tag status-${issue.status.toLowerCase().replaceAll(' ', '-')}`}>{formatStatus(issue.status)}</span></td>
              <td><span className={`severity-tag severity-${issue.severity.toLowerCase().replaceAll(' ', '-')}`}>{issue.severity}</span></td>
              <td>{issue.reporter_count}</td>
              <td className="priority-cell">{issue.priority_score ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {expanded && <p className="table-footnote">Showing the highest-priority issues in your authorized scope.</p>}
    </div>
  )
}

function DirectoryPage({ page, admin }) {
  const details = directoryConfig[page]
  const [result, setResult] = useState({ loading: true, error: '', rows: [] })

  useEffect(() => {
    let active = true
    async function load() {
      if (!supabase || !details) return
      let query = supabase.from(details.table).select(details.select)

      if (details.table === 'departments') query = query.order('name')
      if (details.table === 'districts') query = query.order('name')
      if (details.table === 'admin_users') query = query.order('created_at', { ascending: false })
      if (admin.role === 'stateadmin' && details.table === 'departments') {
        query = query.eq('id', admin.department_id)
      }

      const { data, error } = await query
      if (!active) return
      if (error) {
        setResult({ loading: false, error: `Could not load ${details.title.toLowerCase()}: ${error.message}`, rows: [] })
        return
      }
      setResult({ loading: false, error: '', rows: data || [] })
    }
    load().catch((error) => {
      if (active) setResult({ loading: false, error: error.message, rows: [] })
    })
    return () => { active = false }
  }, [admin.department_id, admin.role, details, page])

  if (!details) return null

  return (
    <section className="content-card directory-card">
      <div className="card-heading">
        <div>
          <span className="eyebrow">AUTHORIZED DIRECTORY</span>
          <h2>{details.title}</h2>
          <p>{details.description}</p>
        </div>
      </div>
      {result.error && <div className="message-box message-error" role="alert">{result.error}</div>}
      {result.loading ? (
        <div className="table-loading"><span className="loading-spinner" /> Loading directory…</div>
      ) : result.rows.length ? (
        <div className="table-scroll">
          <table className="issues-table directory-table">
            <thead><tr>{details.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
            <tbody>
              {result.rows.map((row, index) => (
                <tr key={row.id ?? row.email ?? index}>
                  {details.values(row).map((value, valueIndex) => (
                    <td key={`${row.id ?? row.email}-${valueIndex}`}>{value}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !result.error ? (
        <div className="empty-state directory-empty">
          <span className="empty-icon"><Icon name={page === 'Districts' ? 'districts' : page === 'Departments' ? 'departments' : 'administrators'} /></span>
          <strong>No records configured</strong>
          <p>This directory will populate when authorized records are added.</p>
        </div>
      ) : null}
    </section>
  )
}

function Dashboard({ admin, profile, onSignOut, signOutError, accountWarning }) {
  const [activePage, setActivePage] = useState('Overview')
  const [search, setSearch] = useState('')
  const [queueFilter, setQueueFilter] = useState('all')
  const [refreshToken, setRefreshToken] = useState(0)
  const [today] = useState(() => formatDate(new Date()))
  const role = roleDetails[admin.role]
  const isDirectoryPage = ['Departments', 'Districts', 'Administrators'].includes(activePage)
  const isQueuePage = activePage !== 'Overview' && !isDirectoryPage
  const dashboard = useAdminDashboard(admin, isQueuePage, refreshToken)
  const isAuthority = admin.role === 'stateadmin'
  const isDistrict = admin.role === 'districtadmin'
  const metricCards = getMetrics(admin, dashboard.metrics)
  const userName = profile?.full_name || admin.email || 'Administrator'
  const filteredIssues = useMemo(() => {
    const searchTerm = search.trim().toLowerCase()
    return dashboard.issues.filter((issue) => [
      issue.primaryReport?.complaint_number,
      issue.primaryReport?.location_address,
      issue.status,
      issue.severity,
    ].some((value) => !searchTerm || value?.toLowerCase().includes(searchTerm))
      && (queueFilter === 'all'
        || (queueFilter === 'active' && ['Reported', 'Assigned', 'In Progress', 'Reopened'].includes(issue.status))
        || (queueFilter === 'critical' && issue.severity === 'Critical')
        || (queueFilter === 'unassigned' && !issue.assigned_at)))
  }, [dashboard.issues, queueFilter, search])

  const heading = isDirectoryPage ? activePage : isQueuePage ? activePage : 'Overview'
  const greeting = admin.role === 'districtadmin'
    ? 'District operations overview'
    : admin.role === 'stateadmin'
      ? 'Department operations overview'
      : 'Statewide operations overview'
  const queuePage = role.navigation.find((item) => item.toLowerCase().includes('queue')) || 'Complaints'

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <Brand compact />
        <div className="side-portal">
          <span className="side-portal-icon"><Icon name="shield" /></span>
          <span><strong>Administration</strong><small>Government workspace</small></span>
        </div>

        <div className="nav-caption">WORKSPACE</div>
        <nav className="dashboard-nav" aria-label="Administration navigation">
          {role.navigation.map((item, index) => {
            const iconName = item === 'Overview' ? 'overview'
              : item.includes('queue') || item === 'Complaints' ? 'complaints'
                : item === 'Departments' ? 'departments'
                  : item === 'Districts' ? 'districts' : 'administrators'
            return (
              <button
                className={`dashboard-nav-item${activePage === item ? ' selected' : ''}`}
                key={item}
                onClick={() => { setActivePage(item); setSearch(''); setQueueFilter('all') }}
                type="button"
              >
                <Icon name={iconName} />
                <span>{item}</span>
                {index === 0 && <span className="nav-active-mark" />}
              </button>
            )
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="scope-mini-card">
            <span className="scope-mini-icon"><Icon name="districts" /></span>
            <div><small>YOUR ACCESS SCOPE</small><strong>{role.scopeLabel}</strong></div>
          </div>
          <div className="sidebar-user">
            <span className="user-avatar">{getInitials(userName)}</span>
            <span className="sidebar-user-copy">
              <strong>{userName}</strong>
              <small>{role.label}</small>
            </span>
            <button className="logout-button" onClick={onSignOut} title="Sign out" type="button">
              <Icon name="logout" />
            </button>
          </div>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="topbar-identity">
            <span className="breadcrumb-root">NagarSeva</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{heading}</strong>
          </div>
          <div className="topbar-right">
            <div className="topbar-date"><span className="live-dot" /> SECURE ADMIN SESSION</div>
            <span className="topbar-divider" />
            <span className="topbar-date">{today}</span>
            <span className="user-avatar topbar-avatar">{getInitials(userName)}</span>
          </div>
        </header>

        <div className="dashboard-content">
          {(signOutError || accountWarning) && (
            <div className="message-box message-error dashboard-error" role="alert">
              {signOutError || accountWarning}
            </div>
          )}

          <section className="page-title-row">
            <div>
              <div className="eyebrow">NAGARSEVA · PUBLIC SERVICE ADMINISTRATION</div>
              <h1>{isDirectoryPage ? heading : isQueuePage ? heading : greeting}</h1>
              <p>{isDirectoryPage ? role.description : `Welcome, ${userName}. Here is the current picture for your authorized scope.`}</p>
            </div>
            <div className="scope-badge">
              <Icon name={isDistrict ? 'districts' : 'shield'} />
              <span><small>AUTHORIZED SCOPE</small><strong>{getScope(admin)}</strong></span>
            </div>
          </section>

          {isDirectoryPage ? (
            <DirectoryPage admin={admin} key={activePage} page={activePage} />
          ) : (
            <>
              <section className={`role-banner${isAuthority ? ' banner-authority' : ''}${isDistrict ? ' banner-district' : ''}`}>
                <div className="banner-content">
                  <span className="banner-kicker">ROLE-BASED WORKSPACE</span>
                  <h2>{role.label}</h2>
                  <p>{role.description} Information shown here is restricted to your authorized scope.</p>
                  <span className="banner-scope"><Icon name="shield" /> {getScope(admin)}</span>
                  {!isQueuePage && (
                    <button
                      className="banner-action"
                      onClick={() => { setActivePage(queuePage); setQueueFilter('all') }}
                      type="button"
                    >
                      Review priority queue <Icon name="arrow" />
                    </button>
                  )}
                </div>
                <div className="banner-graphic" aria-hidden="true">
                  <div className="graphic-orbit orbit-a" />
                  <div className="graphic-orbit orbit-b" />
                  <div className="graphic-seal"><Icon name="shield" /><span>NS</span></div>
                  <div className="graphic-line line-a" />
                  <div className="graphic-line line-b" />
                  <div className="graphic-dot dot-a" />
                  <div className="graphic-dot dot-b" />
                  <div className="graphic-dot dot-c" />
                </div>
              </section>

              {dashboard.error && <div className="message-box message-error dashboard-error" role="alert">{dashboard.error}</div>}

              <section className="metrics-grid" aria-label="Report summary">
                {dashboard.loading && !metricCards.length
                  ? Array.from({ length: 4 }, (_, index) => <div className="metric-skeleton" key={index} />)
                  : metricCards.map((metric) => <MetricCard key={metric.label} {...metric} />)}
              </section>

              <section className="content-card queue-card">
                <div className="card-heading queue-heading">
                  <div>
                    <span className="eyebrow">{isDistrict ? 'LOCAL ACTION' : isAuthority ? 'DEPARTMENT OPERATIONS' : 'STATEWIDE OVERSIGHT'}</span>
                    <h2>{isQueuePage ? 'Issue queue' : 'Priority work queue'}</h2>
                    <p>{isDistrict ? 'Reports visible to your district office.' : isAuthority ? 'Department reports across state districts.' : 'High-priority issues across all authorized jurisdictions.'}</p>
                  </div>
                  <div className="queue-actions">
                    <div className="queue-filters" aria-label="Filter reports">
                      {issueFilters.map((filter) => (
                        <button
                          aria-pressed={queueFilter === filter.id}
                          className={`queue-filter${queueFilter === filter.id ? ' active' : ''}`}
                          key={filter.id}
                          onClick={() => setQueueFilter(filter.id)}
                          type="button"
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>
                    <label className="search-field">
                      <Icon name="search" />
                      <input
                        aria-label="Search reports"
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search reports"
                        type="search"
                        value={search}
                      />
                    </label>
                    <button className="icon-button" onClick={() => setRefreshToken((value) => value + 1)} title="Refresh dashboard" type="button">
                      <Icon name="refresh" />
                    </button>
                  </div>
                </div>
                <IssuesTable
                  expanded={isQueuePage}
                  issues={filteredIssues}
                  loading={dashboard.loading}
                  filtered={Boolean(search.trim() || queueFilter !== 'all')}
                />
              </section>

              {!isQueuePage && (
                <section className="workspace-bottom-grid">
                  <article className="content-card scope-card">
                    <div className="card-heading">
                      <div><span className="eyebrow">ACCESS CONTROL</span><h2>Your permissions</h2></div>
                      <span className="verified-mark"><Icon name="shield" /></span>
                    </div>
                    <div className="permission-row">
                      <span className="permission-check">✓</span>
                      <span><strong>{role.label}</strong><small>Verified from your administrator account</small></span>
                    </div>
                    <div className="permission-row">
                      <span className="permission-check">✓</span>
                      <span><strong>{getScope(admin)}</strong><small>Enforced by Supabase row-level security</small></span>
                    </div>
                  </article>
                  <article className="official-note">
                    <span className="note-overline">PUBLIC SERVICE</span>
                    <h2>Every report deserves a clear response.</h2>
                    <p>Use the work queue to review issues in your scope and support accountable resolution.</p>
                    <div className="note-rule"><i /><i /><i /></div>
                  </article>
                </section>
              )}
            </>
          )}

          <footer className="dashboard-footer">
            <span><strong>NagarSeva</strong> · Government administration portal</span>
            <span>Authorized access only</span>
          </footer>
        </div>
      </main>
    </div>
  )
}

function App() {
  const [session, setSession] = useState(null)
  const [admin, setAdmin] = useState(null)
  const [profile, setProfile] = useState(null)
  const [initializing, setInitializing] = useState(Boolean(supabase))
  const [signInBusy, setSignInBusy] = useState(false)
  const [authError, setAuthError] = useState('')
  const [signOutError, setSignOutError] = useState('')
  const sessionUserId = session?.user?.id

  useEffect(() => {
    if (!supabase) {
      return undefined
    }

    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession)
    })

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) setAuthError(`Could not check your session: ${error.message}`)
      setSession(data.session)
      setInitializing(false)
    }).catch((error) => {
      if (!active) return
      setAuthError(`Could not check your session: ${error.message}`)
      setInitializing(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!supabase || !sessionUserId) return undefined

    let active = true
    async function loadAdminAccount() {
      const { data: account, error } = await supabase
        .from('admin_users')
        .select('user_id,email,role,department_id,district_id,is_active')
        .eq('user_id', sessionUserId)
        .maybeSingle()

      if (error) {
        if (active) setAuthError(`Could not verify administrator access: ${error.message}`)
        await supabase.auth.signOut()
        return
      }

      if (!account || !account.is_active || !roleDetails[account.role]) {
        if (active) setAuthError('This account does not have an active NagarSeva administrator role. Contact an authorized system administrator.')
        await supabase.auth.signOut()
        return
      }

      const lookups = await Promise.all([
        account.department_id
          ? supabase.from('departments').select('name').eq('id', account.department_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        account.district_id
          ? supabase.from('districts').select('name').eq('id', account.district_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase.from('profiles').select('full_name').eq('id', account.user_id).maybeSingle(),
      ])

      const lookupError = lookups.find((result) => result.error)
      if (active) {
        if (lookupError) {
          setAuthError(`Administrator access is verified, but account details could not be loaded: ${lookupError.error.message}`)
        }
        setAdmin({
          ...account,
          departmentName: lookups[0].data?.name || null,
          districtName: lookups[1].data?.name || null,
        })
        setProfile(lookups[2].data || null)
      }
    }

    loadAdminAccount().catch((error) => {
      if (active) {
        setAuthError(`Could not verify administrator access: ${error.message}`)
      }
    })

    return () => { active = false }
  }, [sessionUserId])

  async function handleSignIn(email, password) {
    if (!supabase) return
    setSignInBusy(true)
    setAuthError('')
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setAuthError(`Sign-in failed: ${error.message}`)
    } catch (error) {
      setAuthError(`Sign-in failed: ${error.message}`)
    } finally {
      setSignInBusy(false)
    }
  }

  async function handleSignOut() {
    if (!supabase) return
    setSignOutError('')
    try {
      const { error } = await supabase.auth.signOut()
      if (error) setSignOutError(`Could not sign out: ${error.message}`)
    } catch (error) {
      setSignOutError(`Could not sign out: ${error.message}`)
    }
  }

  if (initializing || (session && admin?.user_id !== sessionUserId && !authError)) {
    return <LoadingScreen />
  }

  if (session && admin?.user_id === sessionUserId) {
    return (
      <Dashboard
        admin={admin}
        accountWarning={authError}
        key={session.user.id}
        onSignOut={handleSignOut}
        profile={profile}
        signOutError={signOutError}
      />
    )
  }

  return (
    <SignInScreen
      busy={signInBusy}
      error={authError}
      onSignIn={handleSignIn}
    />
  )
}

export default App
