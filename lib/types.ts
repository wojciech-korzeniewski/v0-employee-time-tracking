export type User = {
  id: number
  login: string
  role: "employee" | "manager" | "hr"
  full_name: string
  email: string | null
  phone: string | null
  address: string | null
  birth_date: string | null
  pesel: string | null
  nip: string | null
  bank_account: string | null
  manager_id: number | null
  manager_name?: string | null
  created_at: string
}

export type Contract = {
  id: number
  user_id: number
  contract_type: "UoP" | "B2B" | "UoZ" | "Zlecenie"
  salary_type: "hourly" | "monthly"
  salary_amount: number
  start_date: string
  end_date: string | null
  is_active: boolean
  created_at: string
}

export type LeaveType = {
  id: number
  name: string
  is_paid: boolean
  days_per_year: number | null
  carries_over: boolean
  max_carryover_days: number
}

export type LeaveAllowance = {
  id: number
  user_id: number
  leave_type_id: number
  leave_type_name?: string
  year: number
  total_days: number
  used_days: number
  carried_over_days: number
  remaining?: number
}

export type LeaveRequest = {
  id: number
  user_id: number
  user_name?: string
  leave_type_id: number
  leave_type_name?: string
  start_date: string
  end_date: string
  days_count: number
  status: "pending" | "approved" | "rejected"
  note: string | null
  manager_note: string | null
  approved_by: number | null
  approved_at: string | null
  created_at: string
}

export type ScheduleEntry = {
  id: number
  user_id: number
  work_date: string
  start_time: string
  end_time: string
  break_minutes: number
  note: string | null
  created_at: string
}
