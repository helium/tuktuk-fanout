export type ScheduleType = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom'

export type Schedule = {
  type: ScheduleType
  hour?: number
  minute?: number
  dayOfWeek?: number // 0-6 for Sunday-Saturday
  dayOfMonth?: number // 1-31
  cronString?: string
}

export const scheduleToString = (schedule: Schedule): string => {
  const now = new Date()
  const minute = schedule.minute ?? now.getUTCMinutes()
  const hour = schedule.hour ?? now.getUTCHours()

  switch (schedule.type) {
    case 'hourly':
      return `0 ${minute} * * * *`
    case 'daily':
      return `0 ${minute} ${hour} * * *`
    case 'weekly':
      return `0 ${minute} ${hour} * * ${schedule.dayOfWeek}`
    case 'monthly':
      return `0 ${minute} ${hour} ${schedule.dayOfMonth} * *`
    default:
      return schedule.cronString ?? '0 0 * * * *'
  }
}

export const parseSchedule = (cronString: string): Schedule => {
  const [, minute, hour, dayOfMonth, , dayOfWeek] = cronString.split(' ')

  if (hour === '*') {
    return { type: 'hourly', minute: parseInt(minute) }
  } else if (dayOfMonth === '*' && dayOfWeek === '*') {
    return { type: 'daily', hour: parseInt(hour), minute: parseInt(minute) }
  } else if (dayOfMonth === '*') {
    return {
      type: 'weekly',
      hour: parseInt(hour),
      minute: parseInt(minute),
      dayOfWeek: parseInt(dayOfWeek)
    }
  } else {
    return {
      type: 'monthly',
      hour: parseInt(hour),
      minute: parseInt(minute),
      dayOfMonth: parseInt(dayOfMonth)
    }
  }
} 