'use client'

import { Schedule, scheduleToString, ScheduleType } from '@/utils/schedule'
import CronExpressionParser from 'cron-parser'

interface Props {
  value: Schedule
  onChange: (schedule: Schedule) => void
}

export function ScheduleEditor({ value, onChange }: Props) {
  const handleTypeChange = (type: ScheduleType) => {
    if (type === 'custom') {
      onChange({ type, cronString: '0 0 * * * *' })
    } else {
      onChange({ type, hour: new Date().getUTCHours(), minute: new Date().getUTCMinutes() })
    }
  }

  const cronString = value.cronString ?? scheduleToString(value)
  const nextRun = CronExpressionParser.parse(cronString).next()

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Distribution Schedule
        </label>
        <select
          value={value.type}
          onChange={(e) => handleTypeChange(e.target.value as ScheduleType)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="hourly">Hourly</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="custom">Custom Cron</option>
        </select>
      </div>

      {value.type === 'custom' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Cron Expression
          </label>
          <input
            type="text"
            value={value.cronString}
            onChange={(e) => onChange({ ...value, cronString: e.target.value })}
            placeholder="0 0 * * * *"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="mt-2 text-sm text-gray-400">
            Format: second minute hour day-of-month month day-of-week
          </p>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-400">
        Next run: {nextRun.toLocaleString()}
      </div>
    </div>
  )
} 