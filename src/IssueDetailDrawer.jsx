import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'
import './IssueDetailDrawer.css'

const statusFlow = ['Reported', 'Viewed', 'Processing', 'Completed']
const activePriorityStatuses = ['Reported', 'Viewed', 'Processing']
const imageTypes = ['image/jpeg', 'image/png', 'image/webp']
const maxImageSize = 10 * 1024 * 1024

function formatDateTime(value) {
  if (!value) return 'Not recorded'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not recorded'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatConfidence(value) {
  if (value === null || value === undefined || value === '') return 'Not available'
  const confidence = Number(value)
  return Number.isFinite(confidence) ? `${Math.round(confidence * 100)}%` : 'Not available'
}

function decodePath(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function getStorageReference(value, fallbackBucket) {
  if (typeof value !== 'string' || !value.trim()) return null
  const source = value.trim()

  if (/^https?:\/\//i.test(source)) {
    try {
      const url = new URL(source)
      const marker = '/storage/v1/object/'
      const markerIndex = url.pathname.indexOf(marker)
      if (markerIndex === -1 || url.origin !== new URL(supabase.supabaseUrl).origin) return null

      const parts = url.pathname.slice(markerIndex + marker.length).split('/').filter(Boolean)
      const bucketIndex = ['public', 'sign', 'authenticated'].includes(parts[0]) ? 1 : 0
      const bucket = parts[bucketIndex]
      const path = parts.slice(bucketIndex + 1).map(decodePath).join('/')
      const allowedBuckets = ['user-reports', 'govt-resolution', 'Report', 'report']
      return allowedBuckets.includes(bucket) && path ? { bucket, path } : null
    } catch {
      return null
    }
  }

  const parts = source.replace(/^\/+/, '').split('/')
  const path = parts[0] === fallbackBucket ? parts.slice(1).join('/') : parts.join('/')
  return path ? { bucket: fallbackBucket, path } : null
}

async function signImages(values, bucket) {
  const images = Array.isArray(values) ? values : []
  return Promise.all(images.map(async (value, index) => {
    const reference = getStorageReference(value, bucket)
    if (!reference) return { key: `${index}-${value}`, src: '', error: 'Invalid image reference' }

    try {
      const { data, error } = await supabase.storage
        .from(reference.bucket)
        .createSignedUrl(reference.path, 60 * 60)
      return {
        key: `${index}-${value}`,
        src: data?.signedUrl || '',
        error: error?.message || '',
      }
    } catch (error) {
      return { key: `${index}-${value}`, src: '', error: error.message }
    }
  }))
}

function getPriorityDetails(breakdown, level) {
  if (!breakdown || typeof breakdown !== 'object') return null
  const levelKeys = level === 'district'
    ? ['district', 'district_level', 'district_score', 'priority_score_district', 'districtScore']
    : ['state', 'state_level', 'state_score', 'priority_score_state', 'stateScore']
  const section = !Array.isArray(breakdown)
    ? levelKeys.map((key) => breakdown[key]).find((value) => value && typeof value === 'object') || breakdown
    : breakdown
  const explanation = section.explanation || section.summary || section.reason || ''
  const factorSource = Array.isArray(section)
    ? section
    : section.factors || section.factor_breakdown || section.components || section.items
  const factors = Array.isArray(factorSource) ? factorSource : []
  const excluded = new Set(['explanation', 'summary', 'reason', 'factors', 'factor_breakdown', 'components', 'items'])
  const otherValues = !Array.isArray(section) && !Array.isArray(factorSource)
    ? Object.entries(section).filter(([key]) => !excluded.has(key))
    : []
  return { explanation, factors: Array.isArray(factors) ? factors : [], otherValues }
}

function Field({ label, children }) {
  return (
    <div className="detail-field">
      <span>{label}</span>
      <strong>{children === null || children === undefined || children === '' ? 'Not recorded' : children}</strong>
    </div>
  )
}

function ImageGallery({ images, label }) {
  if (!images.length) return <p className="detail-muted">No {label.toLowerCase()} uploaded.</p>
  return (
    <div className="detail-image-grid">
      {images.map((image) => (
        <a
          className="detail-image-card"
          href={image.src || undefined}
          key={image.key}
          rel="noreferrer"
          target="_blank"
        >
          {image.src
            ? <img alt={label} loading="lazy" src={image.src} />
            : <span className="image-unavailable">Image unavailable: {image.error || 'No accessible image URL'}</span>}
        </a>
      ))}
    </div>
  )
}

function PriorityBreakdown({ value, level }) {
  const details = getPriorityDetails(value, level)
  if (!details) return <p className="detail-muted">No stored priority explanation is available yet.</p>

  return (
    <div className="priority-breakdown">
      {details.explanation && <p className="priority-explanation">{details.explanation}</p>}
      {details.factors.length > 0 && (
        <div className="factor-list">
          {details.factors.map((factor, index) => (
            <article className="factor-row" key={`${factor.factor || factor.name || 'factor'}-${index}`}>
              <div>
                <strong>{factor.factor || factor.name || factor.label || `Factor ${index + 1}`}</strong>
                {factor.explanation && <p>{factor.explanation}</p>}
              </div>
              <span>
                {factor.points_contributed ?? factor.points ?? factor.contribution ?? '—'}
                {factor.weight != null && <small> · weight {factor.weight}</small>}
              </span>
            </article>
          ))}
        </div>
      )}
      {details.otherValues.map(([key, item]) => (
        <div className="breakdown-value" key={key}>
          <span>{key.replaceAll('_', ' ')}</span>
          <strong>{typeof item === 'object' ? JSON.stringify(item) : String(item)}</strong>
        </div>
      ))}
      {!details.explanation && !details.factors.length && !details.otherValues.length && (
        <p className="detail-muted">No stored priority explanation is available yet.</p>
      )}
    </div>
  )
}

function IssueDetailDrawer({ admin, issue, onClose, onUpdated }) {
  const [detail, setDetail] = useState({
    loading: true,
    error: '',
    profileError: '',
    districtError: '',
    reports: [],
    profiles: [],
    districts: [],
    resolutionPhotos: [],
  })
  const record = issue
  const [authorityRemarks, setAuthorityRemarks] = useState(issue.authority_remarks || '')
  const [resolutionNote, setResolutionNote] = useState(issue.resolution_note || '')
  const [proofFiles, setProofFiles] = useState([])
  const [resolutionExpanded, setResolutionExpanded] = useState(false)
  const [citizenResponseExpanded, setCitizenResponseExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [priorityRanking, setPriorityRanking] = useState({
    reportId: issue.report_id,
    loading: true,
    error: '',
    rank: null,
    total: null,
  })
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState('')
  const isDistrict = admin.role === 'districtadmin'
  const priorityLevel = isDistrict ? 'district' : 'state'
  const priorityScore = isDistrict ? record.priority_score_district : record.priority_score_state
  const priorityConfidence = isDistrict ? record.priority_confidence_district : record.priority_confidence_state
  const priorityColumn = isDistrict ? 'priority_score_district' : 'priority_score_state'
  const priorityDetails = useMemo(
    () => getPriorityDetails(record.priority_breakdown, priorityLevel),
    [priorityLevel, record.priority_breakdown],
  )
  const isActivePriority = activePriorityStatuses.includes(record.status)
  const priorityRankIsCurrent = priorityRanking.reportId === record.report_id
  const citizenFeedbackLabel = record.citizen_feedback === 'fixed'
    ? 'Work Completed'
    : record.citizen_feedback === 'not_fixed'
      ? 'Work Not Completed'
      : record.citizen_feedback == null
        ? 'No feedback submitted'
        : `Unrecognized feedback: ${record.citizen_feedback}`
  const citizenVerificationStatus = record.citizen_verification || 'Pending'
  const citizenVerificationTone = citizenVerificationStatus === 'Work Completed'
    ? 'positive'
    : citizenVerificationStatus === 'Work Not Completed'
      ? 'negative'
      : 'pending'
  const citizenFeedbackTone = record.citizen_feedback === 'fixed'
    ? 'positive'
    : record.citizen_feedback === 'not_fixed'
      ? 'negative'
      : 'pending'

  useEffect(() => {
    let active = true

    async function loadPriorityRanking() {
      if (!activePriorityStatuses.includes(record.status) || priorityScore == null) return

      setPriorityRanking({
        reportId: record.report_id,
        loading: true,
        error: '',
        rank: null,
        total: null,
      })

      try {
        const countOptions = { count: 'exact', head: true }
        const [higherPriority, totalPriority] = await Promise.all([
          supabase.from('GovtReport')
            .select('report_id', countOptions)
            .in('status', activePriorityStatuses)
            .not(priorityColumn, 'is', null)
            .gt(priorityColumn, priorityScore),
          supabase.from('GovtReport')
            .select('report_id', countOptions)
            .in('status', activePriorityStatuses)
            .not(priorityColumn, 'is', null),
        ])
        const failedQuery = [higherPriority, totalPriority].find((result) => result.error)
        if (failedQuery) {
          if (active) {
            setPriorityRanking({
              reportId: record.report_id,
              loading: false,
              error: `Could not calculate focus rank: ${failedQuery.error.message}`,
              rank: null,
              total: null,
            })
          }
          return
        }

        if (active) {
          setPriorityRanking({
            reportId: record.report_id,
            loading: false,
            error: '',
            rank: (higherPriority.count || 0) + 1,
            total: totalPriority.count || 0,
          })
        }
      } catch (error) {
        if (active) {
          setPriorityRanking({
            reportId: record.report_id,
            loading: false,
            error: `Could not calculate focus rank: ${error.message}`,
            rank: null,
            total: null,
          })
        }
      }
    }

    loadPriorityRanking()
    return () => { active = false }
  }, [priorityColumn, priorityScore, record.report_id, record.status])

  const reporterProfiles = useMemo(
    () => new Map(detail.profiles.map((profile) => [profile.id, profile])),
    [detail.profiles],
  )
  const reporterEntries = useMemo(() => {
    const entries = new Map()
    detail.reports.forEach((report) => {
      const key = report.user_id || report.id
      if (!entries.has(key)) {
        entries.set(key, {
          report,
          profile: reporterProfiles.get(report.user_id),
        })
      }
    })
    return [...entries.entries()].map(([key, entry]) => ({ key, ...entry }))
  }, [detail.reports, reporterProfiles])
  const citizenDistricts = useMemo(
    () => new Map(detail.districts.map((district) => [district.id, district.name])),
    [detail.districts],
  )
  const reportType = detail.reports.find((report) => report.id === record.report_id)?.['Issue Type']
  const statusIndex = statusFlow.indexOf(record.status)
  const nextStatus = statusFlow[statusIndex + 1]
  const completionNeedsNote = nextStatus === 'Completed' && !resolutionNote.trim()
  const mapsUrl = record.latitude != null && record.longitude != null
    && Number.isFinite(Number(record.latitude)) && Number.isFinite(Number(record.longitude))
    ? `https://www.google.com/maps?q=${record.latitude},${record.longitude}`
    : ''

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    if (!notice) return
    const timeoutId = window.setTimeout(() => setNotice(''), 6000)
    return () => window.clearTimeout(timeoutId)
  }, [notice])

  useEffect(() => {
    let active = true

    async function loadDetails() {
      setDetail((current) => ({ ...current, loading: true, error: '' }))
      const reportId = issue.report_id
      const { data: reports, error } = await supabase
        .from('UserReport')
        .select('id,user_id,"Issue Type","Description","MoreDetail",image_urls,latitude,longitude,location_address,district_id,created_at,complaint_number,citizen_feedback,issue_id')
        .or(`id.eq.${reportId},issue_id.eq.${reportId}`)
        .order('created_at', { ascending: true })

      if (error) {
        if (active) setDetail((current) => ({ ...current, loading: false, error: `Could not load citizen reports: ${error.message}` }))
        return
      }

      const userIds = [...new Set((reports || []).map((report) => report.user_id).filter(Boolean))]
      const profilesResult = userIds.length
        ? await supabase.from('profiles').select('id,full_name,email,phone_number,address,district_id,state,pincode').in('id', userIds)
        : { data: [], error: null }
      const districtIds = [...new Set((profilesResult.data || []).map((profile) => profile.district_id).filter(Boolean))]
      const districtsResult = districtIds.length
        ? await supabase.from('districts').select('id,name').in('id', districtIds)
        : { data: [], error: null }
      const reportsWithPhotos = await Promise.all((reports || []).map(async (report) => ({
        ...report,
        photos: await signImages(report.image_urls, 'user-reports'),
      })))
      const resolutionPhotos = await signImages(issue.resolution_image_urls, 'govt-resolution')

      if (active) {
        setDetail({
          loading: false,
          error: '',
          profileError: profilesResult.error?.message || '',
          districtError: districtsResult.error?.message || '',
          reports: reportsWithPhotos,
          profiles: profilesResult.data || [],
          districts: districtsResult.data || [],
          resolutionPhotos,
        })
      }
    }

    loadDetails().catch((error) => {
      if (active) setDetail((current) => ({ ...current, loading: false, error: `Could not load report details: ${error.message}` }))
    })

    return () => { active = false }
  }, [issue])

  async function persistUpdate(values) {
    const result = await supabase
      .from('GovtReport')
      .update(values)
      .eq('report_id', record.report_id)
      .select('*')
      .single()
    if (!result.error && result.data) {
      onUpdated(result.data)
    }
    return result
  }

  async function handleSaveResolutionDetails(event) {
    event.preventDefault()
    setActionError('')
    setNotice('')
    setSaving(true)
    try {
      const savedResolutionNote = resolutionNote.trim()
      const update = {
        authority_remarks: authorityRemarks.trim() || null,
        resolution_note: savedResolutionNote || null,
      }
      if (savedResolutionNote) {
        update.status = 'Completed'
        update.resolved_at = record.resolved_at || new Date().toISOString()
      }
      const { data, error } = await persistUpdate(update)
      if (error) setActionError(`Could not save resolution details: ${error.message}`)
      else if (data) {
        const statusNotice = savedResolutionNote
          ? 'Resolution saved. The report is marked Completed and its updated status is visible in the citizen app.'
          : record.status === 'Completed'
            ? 'Resolution details saved. The report remains Completed in the citizen app.'
            : 'Details saved. Add a resolution note to mark the report Completed and update its citizen-facing status.'
        setNotice(statusNotice)
      }
    } catch (error) {
      setActionError(`Could not save resolution details: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleAdvanceStatus() {
    if (!nextStatus) return
    setActionError('')
    setNotice('')
    if (nextStatus === 'Completed' && !resolutionNote.trim()) {
      setActionError('Add a resolution note before marking this complaint completed.')
      return
    }

    setSaving(true)
    try {
      const update = { status: nextStatus }
      if (nextStatus === 'Completed') {
        update.resolution_note = resolutionNote.trim()
        update.authority_remarks = authorityRemarks.trim() || null
        update.resolved_at = new Date().toISOString()
      }
      const { data, error } = await persistUpdate(update)
      if (error) setActionError(`Could not update complaint status: ${error.message}`)
      else if (data) setNotice(`Complaint status updated to ${nextStatus}. The citizen app will show the updated status.`)
    } catch (error) {
      setActionError(`Could not update complaint status: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleUploadPhotos() {
    setActionError('')
    setNotice('')
    const invalidFile = proofFiles.find((file) => !imageTypes.includes(file.type) || file.size > maxImageSize)
    if (invalidFile) {
      setActionError(`${invalidFile.name} must be a JPEG, PNG or WebP image under 10 MB.`)
      return
    }
    if (!proofFiles.length) {
      setActionError('Choose at least one resolution photo to upload.')
      return
    }

    setUploading(true)
    const uploadedPaths = []
    try {
      for (const [index, file] of proofFiles.entries()) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
        const uniqueName = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${index}`
        const path = `GovtReport/${record.report_id}/${uniqueName}-${safeName}`
        const { data, error } = await supabase.storage
          .from('govt-resolution')
          .upload(path, file, { contentType: file.type, upsert: false })
        if (error) {
          if (uploadedPaths.length) {
            const { error: cleanupError } = await supabase.storage.from('govt-resolution').remove(uploadedPaths)
            setActionError(cleanupError
              ? `Could not upload ${file.name}: ${error.message}. Some uploaded files also could not be removed: ${cleanupError.message}`
              : `Could not upload ${file.name}: ${error.message}`)
          } else {
            setActionError(`Could not upload ${file.name}: ${error.message}`)
          }
          return
        }
        uploadedPaths.push(data.path)
      }

      const nextPaths = [...(record.resolution_image_urls || []), ...uploadedPaths]
      const { data, error } = await persistUpdate({ resolution_image_urls: nextPaths })
      if (error) {
        const { error: cleanupError } = await supabase.storage.from('govt-resolution').remove(uploadedPaths)
        setActionError(cleanupError
          ? `Photos uploaded but could not be saved to the complaint: ${error.message}. Uploaded files could not be removed: ${cleanupError.message}`
          : `Could not save uploaded photos to the complaint: ${error.message}`)
        return
      }
      if (!data) return

      const resolutionPhotos = await signImages(data.resolution_image_urls, 'govt-resolution')
      setDetail((current) => ({ ...current, resolutionPhotos }))
      setProofFiles([])
      setNotice('Resolution photos uploaded and attached to this complaint.')
    } catch (error) {
      setActionError(`Could not upload resolution photos: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="issue-drawer-layer">
      <button aria-label="Close complaint details" className="issue-drawer-backdrop" onClick={onClose} type="button" />
      <aside aria-labelledby="issue-drawer-title" aria-modal="true" className="issue-drawer" role="dialog">
        <header className="issue-drawer-header">
          <button aria-label="Back to complaints" autoFocus className="drawer-close" onClick={onClose} type="button">← Back</button>
          <div className="drawer-header-title-row">
            <h2 id="issue-drawer-title">{detail.reports.find((report) => report.id === record.report_id)?.complaint_number || record.report_id.slice(0, 8).toUpperCase()}</h2>
            <p>{reportType || 'Public infrastructure report'}</p>
          </div>
        </header>
        {notice && (
          <div aria-live="polite" className="drawer-save-toast" role="status">
            <span aria-hidden="true" className="drawer-save-toast-icon">✓</span>
            <div className="drawer-save-toast-copy">
              <strong>Saved successfully</strong>
              <p>{notice}</p>
            </div>
            <button aria-label="Dismiss message" className="drawer-save-toast-close" onClick={() => setNotice('')} type="button">×</button>
          </div>
        )}

        <div className="issue-drawer-content">
          <section className="drawer-section government-handling-intro-section">
            <div className="drawer-section-heading">
              <div><span className="drawer-eyebrow">GOVERNMENT HANDLING</span><h3>Case progress</h3></div>
            </div>
            <div className="drawer-status-card case-status-section">
              {(detail.error || actionError || detail.profileError || detail.districtError) && (
                <div className="detail-alert-stack">
                  {detail.error && <div className="detail-alert detail-alert-error" role="alert">{detail.error}</div>}
                  {actionError && <div className="detail-alert detail-alert-error" role="alert">{actionError}</div>}
                  {(detail.profileError || detail.districtError) && (
                    <div className="detail-alert detail-alert-warning" role="status">
                      Some citizen information could not be loaded: {[detail.profileError, detail.districtError].filter(Boolean).join(' ')}
                    </div>
                  )}
                </div>
              )}
              <div className="drawer-section-heading">
                <div><span className="drawer-eyebrow">CURRENT STATUS</span><h3>{record.status}</h3></div>
                <span className={`status-tag status-${(record.status || '').toLowerCase()}`}>{record.status}</span>
              </div>
              <ol className="status-stepper">
                {statusFlow.map((status, index) => (
                  <li className={index < statusIndex ? 'step-done' : index === statusIndex ? 'step-current' : ''} key={status}>
                    <span>{index < statusIndex ? '✓' : index + 1}</span>
                    <small>{status}</small>
                  </li>
                ))}
              </ol>
              {nextStatus && (
                <button
                  className="drawer-primary-button"
                  disabled={saving || uploading || completionNeedsNote}
                  onClick={handleAdvanceStatus}
                  type="button"
                >
                  {nextStatus === 'Viewed' ? 'Mark as viewed' : nextStatus === 'Processing' ? 'Start processing' : 'Mark completed'}
                </button>
              )}
              {nextStatus === 'Completed' && !resolutionNote.trim() && (
                <p className="drawer-help">A resolution note is required before completion.</p>
              )}
              {record.status === 'Completed' && <p className="drawer-help">Completed {formatDateTime(record.resolved_at)}.</p>}
            </div>
          </section>

          <section className="drawer-section citizen-information-section">
            <div className="drawer-section-heading">
              <div><span className="drawer-eyebrow">CITIZEN INFORMATION</span><h3>Person reporting the problem</h3></div>
            </div>
            {detail.loading ? <div className="drawer-loading"><span className="loading-spinner" /> Loading reports…</div> : null}
            {!detail.loading && !detail.reports.length && <p className="detail-muted">No linked citizen submissions are visible in this scope.</p>}
            {!detail.loading && reporterEntries.map(({ key, report, profile }) => {
              const reporterName = profile?.full_name || 'Citizen reporter'
              const reporterInitials = reporterName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'CR'
              const citizenDistrictId = profile?.district_id ?? report.district_id
              return (
                <article className="citizen-info-card" key={key}>
                  <div className="citizen-info-heading">
                    <span aria-hidden="true" className="reporter-avatar">{reporterInitials}</span>
                    <div>
                      <span className="reporter-kicker">CITIZEN NAME</span>
                      <strong>{reporterName}</strong>
                      <span>Reported {formatDateTime(report.created_at)}</span>
                    </div>
                  </div>
                  <div className="citizen-facts-grid">
                    <Field label="Email">{profile?.email || 'Not provided'}</Field>
                    <Field label="Phone">{profile?.phone_number || 'Not provided'}</Field>
                    <Field label="Address">{profile?.address || 'Not provided'}</Field>
                    <Field label="District">
                      {citizenDistrictId == null
                        ? 'Not provided'
                        : citizenDistricts.get(citizenDistrictId) || (detail.districtError ? 'District name unavailable' : 'Not recorded')}
                    </Field>
                    <Field label="State / Union territory">{profile?.state || 'Not provided'}</Field>
                    <Field label="PIN code">{profile?.pincode || 'Not provided'}</Field>
                  </div>
                </article>
              )
            })}
          </section>

          <section className="drawer-section citizen-submissions-section">
            <div className="drawer-section-heading">
              <div><span className="drawer-eyebrow">CITIZEN SUBMISSION</span><h3>Problem report</h3></div>
            </div>
            {detail.loading && <div className="drawer-loading"><span className="loading-spinner" /> Loading reports…</div>}
            {!detail.loading && !detail.reports.length && <p className="detail-muted">No linked citizen reports are available for this complaint.</p>}
            {!detail.loading && detail.reports.map((report) => {
              const profile = reporterProfiles.get(report.user_id)
              const reportPhotos = report.photos || []
              return (
                <article className={`citizen-report-card${report.id === record.report_id ? ' primary-citizen-report' : ''}`} key={report.id}>
                  <div className="citizen-report-heading">
                    <div className="report-reference">
                      <span className="reporter-kicker">{report.id === record.report_id ? 'ORIGINAL COMPLAINT' : 'RELATED COMPLAINT'}</span>
                      <strong>{report.complaint_number || report.id.slice(0, 8).toUpperCase()}</strong>
                      <span>Submitted by {profile?.full_name || 'Citizen reporter'} · {formatDateTime(report.created_at)}</span>
                    </div>
                  </div>
                  <div className="citizen-description">
                    <div className="citizen-issue-type">
                      <span>Issue type</span>
                      <strong>{report['Issue Type'] || 'Not specified'}</strong>
                    </div>
                    <div className="citizen-text-field">
                      <strong>Description</strong>
                      <p>{report['Description'] || 'No description provided.'}</p>
                    </div>
                    <div className="citizen-text-field">
                      <strong>More details</strong>
                      <p>{report['MoreDetail'] || 'No additional details provided.'}</p>
                    </div>
                  </div>
                  <div className="citizen-location"><span>Citizen-provided location</span><strong>{report.location_address || 'Address not provided'}</strong></div>
                  <div className="citizen-evidence-heading">
                    <strong>Photos attached to the report</strong>
                    <span>{reportPhotos.length} photo{reportPhotos.length === 1 ? '' : 's'}</span>
                  </div>
                  <ImageGallery images={reportPhotos} label="Citizen evidence" />
                </article>
              )
            })}
          </section>

          <section className="drawer-section official-record-section">
            <div className="drawer-section-heading"><div><span className="drawer-eyebrow">GOVERNMENT RECORD</span><h3>Case administration</h3></div></div>
            <div className="detail-grid">
              <Field label="Department">{issue.department?.name || 'Not assigned'}</Field>
              <Field label="District">{issue.district?.name || 'Not recorded'}</Field>
              <Field label="Reporter count">{record.reporter_count ?? 0}</Field>
              <Field label="Last updated">{formatDateTime(record.updated_at)}</Field>
            </div>
          </section>

          <section className="drawer-section verified-location-section">
            <div className="drawer-section-heading"><div><span className="drawer-eyebrow">VERIFIED LOCATION</span><h3>Location</h3></div></div>
            <div className="location-panel">
              <div>
                <strong>{record.location || 'Location not verified'}</strong>
                <span>{record.latitude != null && record.longitude != null ? `${record.latitude}, ${record.longitude}` : 'Coordinates not recorded'}</span>
              </div>
              {mapsUrl && <a href={mapsUrl} rel="noreferrer" target="_blank">Open map</a>}
            </div>
          </section>

          <section className="drawer-section ai-assessment-section">
            <div className="drawer-section-heading"><div><span className="drawer-eyebrow">AI-ASSISTED REVIEW</span><h3>Priority score</h3></div></div>
            <article className="assessment-card priority-assessment priority-assessment-wide">
              <div className="priority-focus-row">
                <div className="priority-rank-summary" aria-live="polite">
                  <span>Focus rank</span>
                  <strong>
                    {!isActivePriority
                      ? 'Not active'
                      : priorityScore == null
                        ? '—'
                        : priorityRanking.error && priorityRankIsCurrent
                          ? 'Unavailable'
                          : priorityRanking.loading || !priorityRankIsCurrent
                            ? 'Calculating…'
                            : `#${priorityRanking.rank}`}
                  </strong>
                  <small>
                    {priorityRanking.error && priorityRankIsCurrent
                      ? 'Could not load active queue ranking'
                      : !isActivePriority
                        ? 'This report is not in the active work queue'
                        : priorityScore == null
                          ? 'A focus rank will appear when AI assessment is available'
                          : priorityRankIsCurrent && priorityRanking.rank != null
                            ? `of ${priorityRanking.total} active scored reports in your authorized scope`
                            : 'of active scored reports in your authorized scope'}
                  </small>
                </div>
                <div className="priority-confidence-summary">
                  <span>Model confidence</span>
                  <strong>{formatConfidence(priorityConfidence)}</strong>
                </div>
              </div>
            </article>
            {priorityRanking.error && priorityRankIsCurrent && (
              <div className="detail-alert detail-alert-error" role="alert">{priorityRanking.error}</div>
            )}
            <details className="priority-explanation-card">
              <summary>Why did AI give this priority?</summary>
              <div className="priority-explanation-content">
                <PriorityBreakdown level={priorityLevel} value={record.priority_breakdown} />
                <p className="detail-muted">
                  Calculated {formatDateTime(record.priority_calculated_at)}
                  {priorityDetails?.explanation ? ' · Stored explanation' : ' · Explanation may not be available yet'}
                </p>
              </div>
            </details>
          </section>

          <section className="drawer-section resolution-outcome-section">
            <div className="drawer-section-heading outcome-card-heading">
              <div>
                <span className="drawer-eyebrow">CASE OUTCOME</span>
                <h3>Resolution and citizen response</h3>
              </div>
            </div>
            <div className="outcome-accordion-list">
              <div className="outcome-accordion-item">
                <button
                  aria-controls="resolution-details-content"
                  aria-expanded={resolutionExpanded}
                  className="outcome-accordion-toggle"
                  onClick={() => setResolutionExpanded((expanded) => !expanded)}
                  type="button"
                >
                  <span className="outcome-option-label">
                    <span className="drawer-eyebrow">OFFICER RESPONSE</span>
                    <span aria-level="4" className="outcome-option-title" role="heading">Resolution and remarks</span>
                  </span>
                  <span className="outcome-accordion-meta">
                    <span className={`outcome-status-chip${record.status === 'Completed' ? ' complete' : ''}`}>{record.status}</span>
                    <svg aria-hidden="true" className={`outcome-accordion-chevron${resolutionExpanded ? ' expanded' : ''}`} viewBox="0 0 24 24">
                      <path d="m7 10 5 5 5-5" />
                    </svg>
                  </span>
                </button>
                <div className="outcome-accordion-content" hidden={!resolutionExpanded} id="resolution-details-content">
                  <form className="case-notes-form" id="resolution-details-form" onSubmit={handleSaveResolutionDetails}>
                    <label>
                      Resolution note
                      <textarea
                        onChange={(event) => setResolutionNote(event.target.value)}
                        placeholder="Describe the work completed and outcome for the citizen."
                        rows={4}
                        value={resolutionNote}
                      />
                    </label>
                    <label>
                      Internal authority remarks
                      <textarea
                        onChange={(event) => setAuthorityRemarks(event.target.value)}
                        placeholder="Add follow-up or coordination notes for authorized officials."
                        rows={3}
                        value={authorityRemarks}
                      />
                    </label>
                  </form>

                  <div className="resolution-photo-section">
                    <div className="resolution-photo-heading">
                      <div>
                        <strong>Resolution evidence</strong>
                        <span>Add photos that document the completed repair or response.</span>
                      </div>
                      <span className="resolution-photo-count">{detail.resolutionPhotos.length} uploaded</span>
                    </div>
                    <ImageGallery images={detail.resolutionPhotos} label="Resolution evidence" />
                    <div className="resolution-photo-upload-row">
                      <label className="proof-file-picker">
                        <span aria-hidden="true" className="proof-file-icon">+</span>
                        <span className="proof-file-copy">
                          <strong>Choose resolution photos</strong>
                          <small>JPEG, PNG or WebP · up to 10 MB each</small>
                        </span>
                        <input
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          onChange={(event) => setProofFiles(Array.from(event.target.files || []))}
                          type="file"
                        />
                      </label>
                      <div className="resolution-upload-actions">
                        {proofFiles.length > 0 && (
                          <span
                            aria-live="polite"
                            className="selected-files"
                            title={proofFiles.map((file) => file.name).join(', ')}
                          >
                            {proofFiles.length === 1
                              ? `Image selected: ${proofFiles[0].name}`
                              : `${proofFiles.length} images selected`}
                          </span>
                        )}
                        <button
                          className="drawer-primary-button"
                          disabled={uploading || saving || proofFiles.length === 0}
                          onClick={handleUploadPhotos}
                          type="button"
                        >
                          {uploading ? 'Uploading…' : 'Upload photos'}
                        </button>
                      </div>
                    </div>
                  </div>
                  <button className="drawer-secondary-button save-resolution-details-button" disabled={saving || uploading} form="resolution-details-form" type="submit">
                    {saving ? 'Saving…' : 'Save resolution details'}
                  </button>
                </div>
              </div>
              <div className="outcome-accordion-item">
                <button
                  aria-controls="citizen-response-content"
                  aria-expanded={citizenResponseExpanded}
                  className="outcome-accordion-toggle"
                  onClick={() => setCitizenResponseExpanded((expanded) => !expanded)}
                  type="button"
                >
                  <span className="outcome-option-label">
                    <span className="drawer-eyebrow">CITIZEN FOLLOW-UP</span>
                    <span aria-level="4" className="outcome-option-title" role="heading">Citizen verification and feedback</span>
                  </span>
                  <span className="outcome-accordion-meta">
                    <span className={`outcome-status-chip citizen-${citizenVerificationTone}`}>{citizenVerificationStatus}</span>
                    <svg aria-hidden="true" className={`outcome-accordion-chevron${citizenResponseExpanded ? ' expanded' : ''}`} viewBox="0 0 24 24">
                      <path d="m7 10 5 5 5-5" />
                    </svg>
                  </span>
                </button>
                <div className="outcome-accordion-content" hidden={!citizenResponseExpanded} id="citizen-response-content">
                  <div className="citizen-response-grid">
                    <article className={`citizen-response-card response-${citizenVerificationTone}`}>
                      <span aria-hidden="true" className="citizen-response-icon" />
                      <div className="citizen-response-copy">
                        <span>Verification status</span>
                        <strong>{citizenVerificationStatus}</strong>
                      </div>
                    </article>
                    <article className={`citizen-response-card response-${citizenFeedbackTone}`}>
                      <span aria-hidden="true" className="citizen-response-icon" />
                      <div className="citizen-response-copy">
                        <span>Citizen feedback</span>
                        <strong>{citizenFeedbackLabel}</strong>
                      </div>
                    </article>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </aside>
    </div>
  )
}

export default IssueDetailDrawer
