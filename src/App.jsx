import { useEffect, useMemo, useRef, useState } from 'react'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import IssueDetailDrawer from './IssueDetailDrawer'
import './App.css'

const roleDetails = {
  superadmin: {
    label: 'Super Administrator',
    scopeLabel: 'Statewide administration',
    description: 'Statewide visibility and administrative oversight.',
    navigation: ['Dashboard', 'Departments', 'Districts', 'Administrators'],
  },
  stateadmin: {
    label: 'State Department Administrator',
    scopeLabel: 'Department · State level',
    description: 'Department-wide operations across the state.',
    navigation: ['Dashboard', 'Districts'],
  },
  districtadmin: {
    label: 'District Officer',
    scopeLabel: 'District operations',
    description: 'Local reports and resolution work for your district.',
    navigation: ['Dashboard'],
  },
}

const directoryConfig = {
  Departments: {
    table: 'departments',
    select: 'id,code,name,is_external,is_active',
    reportScope: 'department',
    title: 'Departments',
    description: 'Government service departments configured for issue routing.',
    columns: ['CODE', 'DEPARTMENT', 'TYPE', 'STATUS'],
    values: (row) => [row.code, row.name, row.is_external ? 'External authority' : 'Government department', row.is_active ? 'Active' : 'Inactive'],
  },
  Districts: {
    table: 'districts',
    select: 'id,name,is_active',
    reportScope: 'district',
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
  { id: 'unassigned', label: 'Unassigned' },
]

const reportStatuses = ['Reported', 'Viewed', 'Processing', 'Completed']
const activeStatuses = ['Reported', 'Viewed', 'Processing']

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

function useAdminDashboard(admin, refreshToken) {
  const [dashboard, setDashboard] = useState({
    loading: true,
    error: '',
    metrics: null,
    issues: [],
  })
  const priorityColumn = admin.role === 'districtadmin'
    ? 'priority_score_district'
    : 'priority_score_state'

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      if (!supabase) return

      setDashboard((current) => ({ ...current, loading: true, error: '' }))
      const missingScope = admin.role === 'stateadmin' && !admin.department_id
        ? 'This administrator account has no assigned department.'
        : admin.role === 'districtadmin' && (!admin.department_id || !admin.district_id)
          ? 'This administrator account is missing its assigned department or district.'
          : ''
      if (missingScope) {
        setDashboard({
          loading: false,
          error: missingScope,
          metrics: null,
          issues: [],
        })
        return
      }

      const scopedReports = (columns, options) => {
        let query = supabase.from('GovtReport').select(columns, options)
        if (admin.role !== 'superadmin') query = query.eq('department_id', admin.department_id)
        if (admin.role === 'districtadmin') query = query.eq('district_id', admin.district_id)
        return query
      }
      const countOptions = { count: 'exact', head: true }
      const reportColumns = [
        'report_id',
        'status',
        'severity_level',
        'severity_score',
        'severity_confidence',
        'priority_score_state',
        'priority_score_district',
        'priority_confidence_state',
        'priority_confidence_district',
        'priority_model_version_state',
        'priority_model_version_district',
        'priority_breakdown',
        'priority_calculated_at',
        'department_id',
        'department_confidence',
        'department_model_version',
        'district_id',
        'assigned_to',
        'assigned_at',
        'authority_remarks',
        'resolution_note',
        'resolution_image_urls',
        'resolved_at',
        'citizen_verification',
        'citizen_feedback',
        'verified_at',
        'reporter_count',
        'location',
        'latitude',
        'longitude',
        'updated_at',
      ].join(',')
      let departmentQuery = supabase.from('departments').select('id,code,name,is_external')
      let districtQuery = supabase.from('districts').select('id,name')
      if (admin.department_id) departmentQuery = departmentQuery.eq('id', admin.department_id)
      if (admin.district_id) districtQuery = districtQuery.eq('id', admin.district_id)
      const requests = [
        scopedReports(reportColumns)
          .order(priorityColumn, { ascending: false, nullsFirst: false })
          .range(0, 499),
        scopedReports('report_id', countOptions),
        departmentQuery,
        districtQuery,
        scopedReports('report_id', countOptions)
          .in('status', activeStatuses).not(priorityColumn, 'is', null),
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

      let issueRows = results[0].data || []
      const reportCount = results[1].count ?? 0
      let rangeStart = issueRows.length
      while (rangeStart < reportCount) {
        const { data, error } = await scopedReports(reportColumns)
          .order(priorityColumn, { ascending: false, nullsFirst: false })
          .range(rangeStart, rangeStart + 499)

        if (error) {
          if (active) {
            setDashboard({
              loading: false,
              error: `Could not load dashboard data: ${error.message}`,
              metrics: null,
              issues: [],
            })
          }
          return
        }

        if (!data?.length) {
          if (active) {
            setDashboard({
              loading: false,
              error: 'Could not load all reports: no reports were returned before the reported total.',
              metrics: null,
              issues: [],
            })
          }
          return
        }

        issueRows = issueRows.concat(data)
        rangeStart = issueRows.length
      }

      const reportIds = issueRows.map((issue) => issue.report_id)
      const reportChunks = []
      for (let index = 0; index < reportIds.length; index += 75) {
        reportChunks.push(reportIds.slice(index, index + 75))
      }
      const primaryReports = reportChunks.length
        ? await Promise.all(reportChunks.map((ids) => supabase
          .from('UserReport')
          .select('id,issue_id,complaint_number,location_address,created_at,"Issue Type"')
          .in('id', ids)))
        : []
      const failedReportLookup = primaryReports.find((result) => result.error)

      if (failedReportLookup) {
        if (active) {
          setDashboard({
            loading: false,
            error: `Could not load report details: ${failedReportLookup.error.message}`,
            metrics: null,
            issues: [],
          })
        }
        return
      }

      const reportsById = new Map(primaryReports.flatMap((result) => result.data || []).map((report) => [report.id, report]))
      const departmentsById = new Map((results[2].data || []).map((department) => [department.id, department]))
      const districtsById = new Map((results[3].data || []).map((district) => [district.id, district]))

      const issues = issueRows
        .map((issue) => {
          const primaryReport = reportsById.get(issue.report_id)
          return {
            ...issue,
            primaryReport,
            department: departmentsById.get(issue.department_id) || null,
            district: districtsById.get(issue.district_id) || null,
            priorityScore: issue[priorityColumn],
            priorityConfidence: admin.role === 'districtadmin'
              ? issue.priority_confidence_district
              : issue.priority_confidence_state,
            priorityModelVersion: admin.role === 'districtadmin'
              ? issue.priority_model_version_district
              : issue.priority_model_version_state,
          }
        })
        .filter((issue) => issue.primaryReport
          && (!issue.primaryReport.issue_id || issue.primaryReport.issue_id === issue.report_id))
      const priorityTotal = results[4].count ?? 0
      const countReportsByStatus = (status) => issues.reduce(
        (count, issue) => count + (issue.status === status ? 1 : 0),
        0,
      )
      const rankedIssues = issues.map((issue) => {
        const priorityRank = activeStatuses.includes(issue.status) && issue.priorityScore != null
          ? issues.filter((candidate) => (
            activeStatuses.includes(candidate.status)
            && candidate.priorityScore != null
            && Number(candidate.priorityScore) > Number(issue.priorityScore)
          )).length + 1
          : null
        return { ...issue, priorityRank, priorityTotal }
      })

      if (active) {
        setDashboard({
          loading: false,
          error: '',
          metrics: {
            total: reportCount,
            viewed: countReportsByStatus('Viewed'),
            processing: countReportsByStatus('Processing'),
            completed: countReportsByStatus('Completed'),
            priorityTotal,
          },
          issues: rankedIssues,
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
  }, [admin.department_id, admin.district_id, admin.role, admin.user_id, priorityColumn, refreshToken])

  return dashboard
}

function getMetrics(admin, metrics) {
  if (!metrics) return []

  const scopeDetail = admin.role === 'superadmin'
    ? 'Across all districts'
    : admin.role === 'stateadmin'
      ? 'Within your department'
      : 'Within your district'
  return [
    { label: 'Total complaints', value: metrics.total, detail: scopeDetail, tone: 'blue', icon: 'complaints' },
    { label: 'Viewed complaints', value: metrics.viewed, detail: 'Reviewed by an officer', tone: 'violet', icon: 'overview' },
    { label: 'Processing complaints', value: metrics.processing, detail: 'Work currently in progress', tone: 'amber', icon: 'departments' },
    { label: 'Completed complaints', value: metrics.completed, detail: 'Marked complete by an officer', tone: 'green', icon: 'shield' },
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

function IssuesTable({ issues, loading, filtered = false, onOpenIssue, priorityLabel }) {
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
            <th>ISSUE / LOCATION</th>
            <th>STATUS</th>
            <th>SEVERITY</th>
            <th>REPORTERS</th>
            <th>{priorityLabel.toUpperCase()}</th>
            <th>ACTION</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue) => (
            <tr
              aria-label={`Open report ${issue.primaryReport?.complaint_number || issue.report_id.slice(0, 8).toUpperCase()}`}
              className="issue-row"
              key={issue.report_id}
              onClick={() => onOpenIssue(issue)}
              onKeyDown={(event) => {
                if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault()
                  onOpenIssue(issue)
                }
              }}
              tabIndex={0}
            >
              <td>
                <button
                  aria-label={`Open report ${issue.primaryReport?.complaint_number || issue.report_id.slice(0, 8).toUpperCase()}`}
                  className="complaint-number issue-open-button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onOpenIssue(issue)
                  }}
                  type="button"
                >
                  {issue.primaryReport?.complaint_number || issue.report_id.slice(0, 8).toUpperCase()}
                </button>
                <span className="table-subtext">
                  {issue.department?.code || 'Department pending'}
                </span>
              </td>
              <td className="location-cell issue-description-cell">
                <strong>{issue.primaryReport?.['Issue Type'] || 'Public infrastructure report'}</strong>
                <span className="table-subtext">{issue.location || issue.primaryReport?.location_address || 'Location pending'}</span>
              </td>
              <td><span className={`status-tag status-${(issue.status || '').toLowerCase().replaceAll(' ', '-')}`}>{issue.status || 'Unknown'}</span></td>
              <td>
                <span className={`severity-tag severity-${(issue.severity_level || '').toLowerCase().replaceAll(' ', '-')}`}>
                  {issue.severity_level || 'Not assessed'}
                </span>
                {issue.severity_score != null && <span className="table-subtext">{issue.severity_score}/100</span>}
              </td>
              <td>{issue.reporter_count ?? 0}</td>
              <td className="priority-cell">
                <strong className="priority-rank">
                  {issue.priorityRank == null ? '—' : `#${issue.priorityRank}`}
                </strong>
                <span className="priority-rank-context">
                  {issue.priorityRank != null
                    ? `of ${issue.priorityTotal} active scored reports`
                    : activeStatuses.includes(issue.status)
                      ? issue.priorityScore == null ? 'Awaiting AI score' : 'Rank unavailable'
                      : 'Not in active queue'}
                </span>
              </td>
              <td className="issue-action-cell">
                <button
                  aria-label={`View details for complaint ${issue.primaryReport?.complaint_number || issue.report_id.slice(0, 8).toUpperCase()}`}
                  className="issue-view-button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onOpenIssue(issue)
                  }}
                  type="button"
                >
                  <Icon name="eye" />
                  <span>View details</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DirectoryPage({
  page,
  admin,
  onSelectReportScope,
  reportDistrictIds,
  reportsLoading,
  reportsError,
}) {
  const details = directoryConfig[page]
  const [result, setResult] = useState({ loading: true, error: '', rows: [] })

  useEffect(() => {
    let active = true
    async function load() {
      if (!supabase || !details) return
      if (details.table === 'districts' && admin.role === 'stateadmin' && reportsLoading) {
        setResult((current) => ({ ...current, loading: true, error: '' }))
        return
      }

      let query = supabase.from(details.table).select(details.select)

      if (details.table === 'departments') query = query.order('name')
      if (details.table === 'districts') query = query.order('name')
      if (details.table === 'admin_users') query = query.order('created_at', { ascending: false })
      if (admin.role === 'stateadmin' && details.table === 'departments') {
        query = query.eq('id', admin.department_id)
      }
      if (details.table === 'districts' && admin.role === 'stateadmin') {
        if (reportsError) {
          setResult({
            loading: false,
          error: `Could not load districts for this department: ${reportsError}`,
            rows: [],
          })
          return
        }
        if (!reportDistrictIds.length) {
          setResult({ loading: false, error: '', rows: [] })
          return
        }
        query = query.in('id', reportDistrictIds)
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
  }, [admin.department_id, admin.role, details, page, reportDistrictIds, reportsError, reportsLoading])

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
            <thead>
              <tr>
                {details.columns.map((column) => <th key={column}>{column}</th>)}
                {details.reportScope && <th>REPORTS</th>}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row, index) => (
                <tr key={row.id ?? row.email ?? index}>
                  {details.values(row).map((value, valueIndex) => (
                    <td key={`${row.id ?? row.email}-${valueIndex}`}>{value}</td>
                  ))}
                  {details.reportScope && (
                    <td className="issue-action-cell">
                      <button
                        aria-label={`View reports for ${row.name}`}
                        className="issue-view-button"
                        onClick={() => onSelectReportScope({
                          type: details.reportScope,
                          id: row.id,
                          name: row.name,
                        })}
                        type="button"
                      >
                        View reports
                      </button>
                    </td>
                  )}
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
  const [activePage, setActivePage] = useState('Dashboard')
  const [search, setSearch] = useState('')
  const [queueFilter, setQueueFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [selectedReportScope, setSelectedReportScope] = useState(null)
  const [selectedIssue, setSelectedIssue] = useState(null)
  const [refreshToken, setRefreshToken] = useState(0)
  const [today] = useState(() => formatDate(new Date()))
  const queueRef = useRef(null)
  const role = roleDetails[admin.role]
  const isDirectoryPage = ['Departments', 'Districts', 'Administrators'].includes(activePage)
  const dashboard = useAdminDashboard(admin, refreshToken)
  const isAuthority = admin.role === 'stateadmin'
  const isDistrict = admin.role === 'districtadmin'
  const metricCards = getMetrics(admin, dashboard.metrics)
  const userName = profile?.full_name || admin.email || 'Administrator'
  const priorityLabel = isDistrict ? 'District focus rank' : 'State focus rank'
  const selectedIssueRecord = selectedIssue
  const reportDistrictIds = useMemo(() => [...new Set(dashboard.issues
    .filter((issue) => admin.role === 'stateadmin'
      && String(issue.department_id) === String(admin.department_id)
      && issue.district_id != null)
    .map((issue) => issue.district_id))], [admin.department_id, admin.role, dashboard.issues])
  const filteredIssues = useMemo(() => {
    const searchTerm = search.trim().toLowerCase()
    return dashboard.issues.filter((issue) => [
      issue.primaryReport?.complaint_number,
      issue.primaryReport?.location_address,
      issue.primaryReport?.['Issue Type'],
      issue.location,
      issue.department?.name,
      issue.district?.name,
      issue.status,
      issue.severity_level,
    ].some((value) => !searchTerm || String(value || '').toLowerCase().includes(searchTerm))
      && (queueFilter === 'all'
        || (queueFilter === 'unassigned' && !issue.assigned_to))
      && (statusFilter === 'all' || issue.status === statusFilter)
      && (severityFilter === 'all' || issue.severity_level === severityFilter)
      && (!selectedReportScope
        || String(issue[`${selectedReportScope.type}_id`]) === String(selectedReportScope.id)))
  }, [dashboard.issues, queueFilter, search, selectedReportScope, severityFilter, statusFilter])

  useEffect(() => {
    if (selectedReportScope) {
      queueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [selectedReportScope])

  const heading = isDirectoryPage ? activePage : 'Dashboard'
  const greeting = admin.role === 'districtadmin'
    ? 'District operations dashboard'
    : admin.role === 'stateadmin'
      ? 'Department operations dashboard'
      : 'Statewide operations dashboard'
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
            const iconName = item === 'Dashboard' ? 'overview'
              : item === 'Departments' ? 'departments'
                : item === 'Districts' ? 'districts' : 'administrators'
            return (
              <button
                className={`dashboard-nav-item${activePage === item ? ' selected' : ''}`}
                key={item}
                onClick={() => {
                  setActivePage(item)
                  setSearch('')
                  setQueueFilter('all')
                  setStatusFilter('all')
                  setSeverityFilter('all')
                  setSelectedReportScope(null)
                  setSelectedIssue(null)
                }}
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
              <h1>{isDirectoryPage ? heading : greeting}</h1>
              <p>{isDirectoryPage ? role.description : `Welcome, ${userName}. Here is your current workload and report activity for your authorized scope.`}</p>
            </div>
            <div className="scope-badge">
              <Icon name={isDistrict ? 'districts' : 'shield'} />
              <span><small>AUTHORIZED SCOPE</small><strong>{getScope(admin)}</strong></span>
            </div>
          </section>

          {isDirectoryPage ? (
            <DirectoryPage
              admin={admin}
              key={activePage}
              onSelectReportScope={(scope) => {
                setSelectedReportScope(scope)
                setActivePage('Dashboard')
                setSearch('')
                setQueueFilter('all')
                setStatusFilter('all')
                setSeverityFilter('all')
                setSelectedIssue(null)
              }}
              page={activePage}
              reportDistrictIds={reportDistrictIds}
              reportsError={dashboard.error}
              reportsLoading={dashboard.loading}
            />
          ) : (
            <>
              <section className={`role-banner${isAuthority ? ' banner-authority' : ''}${isDistrict ? ' banner-district' : ''}`}>
                <div className="banner-content">
                  <span className="banner-kicker">ROLE-BASED WORKSPACE</span>
                  <h2>{role.label}</h2>
                  <p>{role.description} Information shown here is restricted to your authorized scope.</p>
                  <span className="banner-scope"><Icon name="shield" /> {getScope(admin)}</span>
                  <button
                    className="banner-action"
                    onClick={() => queueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    type="button"
                  >
                    View all reports <Icon name="arrow" />
                  </button>
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

              <section className="content-card queue-card" ref={queueRef}>
                <div className="card-heading queue-heading">
                  <div>
                    <span className="eyebrow">{isDistrict ? 'LOCAL ACTION' : isAuthority ? 'DEPARTMENT OPERATIONS' : 'STATEWIDE OVERSIGHT'}</span>
                    <h2>{selectedReportScope ? `Reports for ${selectedReportScope.name}` : 'All complaints'}</h2>
                    <p>{selectedReportScope
                      ? `All submitted reports assigned to this ${selectedReportScope.type}, ordered by priority.`
                      : 'All reports in your authorized scope, ordered by priority. Select View details on any complaint to open its full report.'}</p>
                    {selectedReportScope && (
                      <button
                        className="report-scope-clear"
                        onClick={() => setSelectedReportScope(null)}
                        type="button"
                      >
                        Clear {selectedReportScope.type} selection
                      </button>
                    )}
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
                    <select
                      aria-label="Filter by status"
                      className="queue-select"
                      onChange={(event) => setStatusFilter(event.target.value)}
                      value={statusFilter}
                    >
                      <option value="all">Any status</option>
                      {reportStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                    <select
                      aria-label="Filter by severity"
                      className="queue-select"
                      onChange={(event) => setSeverityFilter(event.target.value)}
                      value={severityFilter}
                    >
                      <option value="all">Any severity</option>
                      {['Low', 'Moderate', 'High', 'Very High', 'Critical'].map((severity) => (
                        <option key={severity} value={severity}>{severity}</option>
                      ))}
                    </select>
                    <label className="search-field">
                      <Icon name="search" />
                      <input
                        aria-label="Search reports"
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search reports or location"
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
                  issues={filteredIssues}
                  loading={dashboard.loading}
                  filtered={Boolean(selectedReportScope || search.trim() || queueFilter !== 'all' || statusFilter !== 'all' || severityFilter !== 'all')}
                  onOpenIssue={setSelectedIssue}
                  priorityLabel={priorityLabel}
                />
              </section>

            </>
          )}

          <footer className="dashboard-footer">
            <span><strong>NagarSeva</strong> · Government administration portal</span>
            <span>Authorized access only</span>
          </footer>
        </div>
      </main>
      {selectedIssueRecord && (
        <IssueDetailDrawer
          admin={admin}
          issue={selectedIssueRecord}
          onClose={() => setSelectedIssue(null)}
          onUpdated={(updatedIssue) => {
            if (updatedIssue) setSelectedIssue((current) => ({ ...current, ...updatedIssue }))
            setRefreshToken((value) => value + 1)
          }}
        />
      )}
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
