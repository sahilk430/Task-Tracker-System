// Calendar helpers in the team's time zone (APP_TIMEZONE, default Asia/Kolkata)
const timeZone = () => process.env.APP_TIMEZONE || 'Asia/Kolkata'

// 'YYYY-MM-DD' of `date` in the team's time zone
const dayKey = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: timeZone(), year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)

// Hour 0–23 of `date` in the team's time zone
const localHour = (date = new Date()) =>
  Number(new Intl.DateTimeFormat('en-GB', { timeZone: timeZone(), hour: '2-digit', hourCycle: 'h23' }).format(date))

module.exports = { dayKey, localHour, timeZone }
