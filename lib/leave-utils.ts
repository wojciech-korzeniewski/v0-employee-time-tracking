/**
 * Leave accrual helpers: effective total days for upfront vs monthly accrual.
 */

export type ContractForYear = {
  start_date: string
  end_date: string | null
}

/** Number of full calendar months worked in the given year up to asOf (for monthly accrual). */
export function getMonthsWorkedInYear(
  contract: ContractForYear | null,
  year: number,
  asOf?: string
): number {
  if (!contract?.start_date) return 0
  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`
  const upTo = asOf && asOf <= yearEnd && asOf >= yearStart ? asOf : yearEnd
  const start = contract.start_date > yearStart ? contract.start_date : yearStart
  if (start > upTo) return 0
  const endRaw = contract.end_date && contract.end_date < upTo ? contract.end_date : upTo
  const end = endRaw > upTo ? upTo : endRaw

  const [sY, sM] = start.split("-").map(Number)
  const [eY, eM] = end.split("-").map(Number)
  const months = (eY - sY) * 12 + (eM - sM) + 1
  return Math.max(0, months)
}

const DAYS_PER_MONTH_PRECISION = 10

/**
 * Effective total days for the allowance in the given year.
 * - upfront: use total_days from allowance.
 * - monthly: months_worked * (annual_days / 12); annual_days from allowance or leave_type.days_per_year.
 */
export function getEffectiveTotalDays(
  total_days: number,
  accrual_type: string,
  annual_daysOverride: number | null,
  days_per_year: number | null,
  monthsWorked: number
): number {
  if (accrual_type === "monthly") {
    const annual = annual_daysOverride ?? days_per_year ?? 0
    if (annual <= 0) return 0
    const perMonth = annual / 12
    const accrued = monthsWorked * perMonth
    return Math.round(accrued * DAYS_PER_MONTH_PRECISION) / DAYS_PER_MONTH_PRECISION
  }
  return Number(total_days)
}

export type AllowanceRow = {
  total_days: number
  annual_days?: number | null
  leave_type_name?: string
  accrual_type?: string
  days_per_year?: number | null
  [k: string]: unknown
}

export type ContractRow = { start_date: string; end_date: string | null } | null

/**
 * Enrich allowances with effective_total_days (and months_worked for monthly).
 * Pass allowances from DB with joined leave_type (accrual_type, days_per_year) and la.annual_days.
 * asOf: YYYY-MM-DD (default today) – count months only up to this date for monthly accrual.
 */
export function withEffectiveTotals(
  allowances: AllowanceRow[],
  contract: ContractRow,
  year: number,
  asOf?: string
): (AllowanceRow & { effective_total_days: number; months_worked?: number })[] {
  const monthsWorked = getMonthsWorkedInYear(contract ?? undefined, year, asOf)
  return allowances.map((a) => {
    const effective_total_days = getEffectiveTotalDays(
      Number(a.total_days),
      (a.accrual_type as string) ?? "upfront",
      a.annual_days != null ? Number(a.annual_days) : null,
      a.days_per_year != null ? Number(a.days_per_year) : null,
      monthsWorked
    )
    const row = { ...a, effective_total_days }
    if ((a.accrual_type as string) === "monthly") (row as any).months_worked = monthsWorked
    return row
  })
}
