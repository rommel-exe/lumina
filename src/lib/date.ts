import { addMinutes, format, isToday, parseISO } from 'date-fns'

export const fmtDate = (isoDate: string) => format(parseISO(isoDate), 'MMM d, yyyy')

export const isDueToday = (isoDate?: string) => (isoDate ? isToday(parseISO(isoDate)) : false)

export const addPomodoroMinutes = (startedAt: string, minutes: number) =>
  addMinutes(parseISO(startedAt), minutes).toISOString()
