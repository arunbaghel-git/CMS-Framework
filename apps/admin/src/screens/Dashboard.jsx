import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PERMISSION } from '@cms/shared'

import Panel from '../components/admin/Panel.jsx'
import { api, errorMessage } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'
import './Dashboard.css'

/**
 * Dashboard — client, 24 Sep (A-54): _"only packages card, blog post card, tour card and
 * enquiry card in a row only 4, then Enquiries — last 7 days full width, nothing else"_.
 *
 * Reference (`admin-design-v2.html:341`) ke baaki hisse — Site healthy notice, Quoted value,
 * Sessions, Recent Enquiries, Quick Draft, Top Packages — **jaan-boojh kar nahi** hain.
 *
 * Saari ginti server pe (`/entries/stats`, `/enquiries/stats`) — list admin me laa kar nahi
 * gini jaati (R14). Card ka number list ke `All (N)` tab wala hi hai.
 */

/** Card ki type → reference ka look. Tour ka card reference me nahi tha; rang Sessions wale card ka. */
const ENTRY_CARDS = [
  { type: 'package', label: 'Packages', icon: '🧳', to: '/packages', tone: 'blue' },
  { type: 'post', label: 'Blog Posts', icon: '✎', to: '/posts', tone: 'green' },
  { type: 'tourPage', label: 'Tour Pages', icon: '🗺', to: '/tour', tone: 'purple' },
]

const ENTRY_STATS_URL = `/entries/stats?types=${ENTRY_CARDS.map((card) => card.type).join(',')}`

/** `2026-09-24` → `Thu` — taareekh pehle se site ke timezone ki hai, isliye yahan UTC. */
function weekday(date) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en', {
    weekday: 'short',
    timeZone: 'UTC',
  })
}

function longDate(date) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

const enquiryCount = (n) => (n === 1 ? '1 enquiry' : `${n} enquiries`)

function StatCard({ icon, tone, number, label, delta, deltaSuffix = '', deltaTitle, to }) {
  return (
    <Link className={`stat stat--${tone}`} to={to}>
      <div className="si" aria-hidden="true">
        {icon}
      </div>
      <div>
        <div className="n">{number ?? '—'}</div>
        <div className="l">
          {label}{' '}
          {delta > 0 && (
            <span className="d up" title={deltaTitle}>
              +{delta}
              {deltaSuffix}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

/** `url` me query pehle se — ek string, taaki effect har render pe dobara na chale. */
function useStats(url, enabled) {
  const [state, setState] = useState({ data: null, error: null })

  useEffect(() => {
    if (!enabled) return undefined
    let alive = true

    api
      .get(url)
      .then((res) => alive && setState({ data: res.data.data, error: null }))
      .catch((err) => alive && setState({ data: null, error: errorMessage(err) }))

    return () => {
      alive = false
    }
  }, [url, enabled])

  return state
}

export default function Dashboard() {
  const { can } = useAuth()
  const canEntries = can(PERMISSION.ENTRY_READ)
  const canEnquiries = can(PERMISSION.SUBMISSION_READ)

  const entries = useStats(ENTRY_STATS_URL, canEntries)
  const enquiryState = useStats('/enquiries/stats', canEnquiries)

  const stats = entries.data?.stats
  const week = enquiryState.data
  const max = Math.max(1, ...(week?.days ?? []).map((day) => day.count))
  const error = entries.error || enquiryState.error

  return (
    <>
      <div className="page-head">
        <h1>Dashboard</h1>
      </div>

      {error && (
        <div className="notice err">
          <span>{error}</span>
        </div>
      )}

      <div className="stats">
        {canEntries &&
          ENTRY_CARDS.map((card) => (
            <StatCard
              key={card.type}
              {...card}
              number={stats?.[card.type]?.all}
              delta={stats?.[card.type]?.recent}
              deltaTitle="Added in the last 30 days"
            />
          ))}

        {canEnquiries && (
          <StatCard
            icon="✉"
            tone="yellow"
            to="/enquiries"
            label="New Enquiries"
            number={week?.new}
            delta={week?.today}
            deltaSuffix=" today"
            deltaTitle="Received today"
          />
        )}
      </div>

      {canEnquiries && (
        <Panel
          title="Enquiries — last 7 days"
          className="dash-week"
          footer={
            <div className="panel-foot">
              <span className="muted">Total {enquiryCount(week?.total ?? 0)}</span>
              <Link to="/enquiries">View all →</Link>
            </div>
          }
        >
          <div className="bars">
            {(week?.days ?? []).map((day) => (
              <div
                key={day.date}
                className="bar"
                style={{ height: `${(day.count / max) * 100}%` }}
                title={`${longDate(day.date)} — ${enquiryCount(day.count)}`}
              >
                <span>{weekday(day.date)}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </>
  )
}
