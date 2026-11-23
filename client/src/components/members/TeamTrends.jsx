import { Link } from 'react-router-dom'
import { TrendingUp, Timer, Target, CheckCircle2 } from 'lucide-react'
import Avatar from '../ui/Avatar'
import { useTrends } from '../../hooks/queries'

const WEEKS = 8
const fmtShort = (d) => new Date(d).toLocaleDateString([], { day: 'numeric', month: 'short' })
const rateTone = (r) => (r === null ? 'text-gray-400' : r >= 80 ? 'text-green-600' : r >= 50 ? 'text-amber-600' : 'text-red-600')
const show = (v, suffix = '') => (v === null || v === undefined ? '—' : `${v}${suffix}`)

// Weekly completed-task columns; `max` lets several rows share one scale
function WeekBars({ weekly, weeks, max, tall = false }) {
  const top = Math.max(1, max ?? Math.max(...weekly))
  return (
    <div className={`flex items-end gap-1 ${tall ? 'h-28' : 'h-8'}`}>
      {weekly.map((n, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full min-w-0"
          title={`${fmtShort(weeks[i].start)} – ${fmtShort(weeks[i].end)}: ${n} completed`}>
          {tall && n > 0 && <span className="text-[10px] text-gray-500 mb-0.5">{n}</span>}
          <div className={`w-full rounded-sm ${n ? 'bg-blue-500' : 'bg-gray-100'}`}
            style={{ height: n ? `${Math.max(8, (n / top) * 100)}%` : '3px' }} />
        </div>
      ))}
    </div>
  )
}

function Metric({ icon: Icon, label, value, tone = 'text-gray-900', hint }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
      <div>
        <p className={`text-lg font-semibold leading-tight ${tone}`}>{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
        {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
      </div>
    </div>
  )
}

// Completed per week, on-time rate and average days to finish over the last 8 weeks.
//   memberId → one person's trend (member dashboard); omitted → whole team (Members page)
export default function TeamTrends({ memberId }) {
  const { data, isPending, isError } = useTrends(memberId ? { weeks: WEEKS, member: memberId } : { weeks: WEEKS })

  if (isPending) return <div className="card h-64 animate-pulse bg-gray-100" />
  if (isError || !data) return null

  const single  = memberId ? data.members[0] : null
  const summary = single || data.team
  const rows = memberId ? [] : data.members
    .filter((m) => m.isActive || m.completed)
    .sort((a, b) => b.completed - a.completed || a.name.localeCompare(b.name))
  const rowMax = Math.max(1, ...rows.flatMap((m) => m.weekly))

  return (
    <div className="card p-5 space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-500" /> {memberId ? 'Trend' : 'Team trends'} · last {WEEKS} weeks
        </h3>
        <p className="text-xs text-gray-400">{fmtShort(data.weeks[0].start)} – {fmtShort(data.weeks[data.weeks.length - 1].end)}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="grid grid-cols-3 lg:grid-cols-1 gap-4">
          <Metric icon={CheckCircle2} label="Tasks completed" value={summary.completed} />
          <Metric icon={Target} label="Finished on time" value={show(summary.onTimeRate, '%')} tone={rateTone(summary.onTimeRate)}
            hint={summary.withDueDate ? `${summary.onTimeCount} of ${summary.withDueDate} with a due date` : 'No due dates yet'} />
          <Metric icon={Timer} label="Average days to finish" value={show(summary.avgDays)} hint="Start (or creation) → done" />
        </div>
        <div className="lg:col-span-2">
          <p className="text-xs text-gray-500 mb-2">Completed per week</p>
          <WeekBars weekly={summary.weekly} weeks={data.weeks} tall />
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>{fmtShort(data.weeks[0].start)}</span><span>This week</span>
          </div>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="overflow-x-auto -mx-5 border-t border-gray-100">
          <table className="w-full text-sm min-w-[36rem]">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-2.5 font-medium">Member</th>
                <th className="px-3 py-2.5 font-medium w-40">Weekly</th>
                <th className="px-3 py-2.5 font-medium text-right">Done</th>
                <th className="px-3 py-2.5 font-medium text-right">On time</th>
                <th className="px-5 py-2.5 font-medium text-right">Avg days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-5 py-2.5">
                    <Link to={`/members/${m.id}`} className="flex items-center gap-2 min-w-0 hover:text-blue-600">
                      <Avatar name={m.name} src={m.avatarUrl} size="sm" />
                      <span className="truncate text-gray-800">{m.name}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5"><WeekBars weekly={m.weekly} weeks={data.weeks} max={rowMax} /></td>
                  <td className="px-3 py-2.5 text-right font-medium text-gray-800">{m.completed}</td>
                  <td className={`px-3 py-2.5 text-right font-medium ${rateTone(m.onTimeRate)}`}>{show(m.onTimeRate, '%')}</td>
                  <td className="px-5 py-2.5 text-right text-gray-600">{show(m.avgDays)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
