// ─── Core domain types ──────────────────────────────────────────────────────

export type AttendanceStatus = 'present' | 'late' | 'absent'
export type SkillStatus = 'mastered' | 'in_progress' | 'not_started'
export type PaymentStatus = 'paid' | 'pending' | 'overdue'
export type MediaType = 'photo' | 'video'
export type UserRole = 'admin' | 'teacher' | 'parent'
export type EnrollmentType = '5_day' | '3_day' | '1_day'
export type SignEventType = 'sign_in' | 'sign_out'

// ─── School ─────────────────────────────────────────────────────────────────

export interface School {
  id: string
  name: string
  location: string | null
  created_at: string
}

// ─── Student ────────────────────────────────────────────────────────────────

export interface Student {
  id: string
  first_name: string
  last_name: string
  full_name: string
  grade: number
  date_of_birth: string
  enrolled_at: string
  avatar_url: string | null
  classes: string[]
  parent_id: string
  school_id: string | null
  enrollment_type: EnrollmentType
  enrolled_days: number[]  // 0=Sun, 1=Mon, ... 5=Fri, 6=Sat
  notes: string | null
  room_number: string | null
  needs_escort: boolean | null
  created_at: string
  updated_at: string
  school?: School
}

export interface StudentWithProgress extends Student {
  overall_progress: number
  attendance_rate: number
  skills_mastered: number
  skills_total: number
}

// ─── Class / Subject ────────────────────────────────────────────────────────

export interface Class {
  id: string
  name: string
  day_of_week: number // 0=Sun … 6=Sat
  start_time: string  // "15:30"
  end_time: string    // "16:30"
  color: string       // tailwind color key
  student_ids: string[]
  teacher_id: string
  created_at: string
}

// ─── Attendance ──────────────────────────────────────────────────────────────

export interface AttendanceRecord {
  id: string
  student_id: string
  class_id: string | null
  date: string        // ISO date "2026-04-03"
  status: AttendanceStatus
  sign_in_time: string | null
  sign_out_time: string | null
  note: string | null
  created_at: string
  updated_at: string
  student?: Student
  class?: Class
}

// ─── Sign Events (detailed sign-in/out log) ─────────────────────────────────

export interface SignEvent {
  id: string
  student_id: string
  event_type: SignEventType
  timestamp: string
  recorded_by: string | null
  notified_at: string | null
  notification_error: string | null
  created_at: string
  student?: Pick<Student, 'id' | 'full_name'>
}

// ─── Progress / Skills ──────────────────────────────────────────────────────

export interface Skill {
  id: string
  name: string
  subject: string
  grade_level: number
  order: number
}

export interface StudentSkill {
  id: string
  student_id: string
  skill_id: string
  status: SkillStatus
  mastered_at: string | null
  updated_at: string
  skill?: Skill
}

export interface TeacherNote {
  id: string
  student_id: string
  teacher_id: string
  content: string
  created_at: string
  updated_at: string
}

// ─── Media ──────────────────────────────────────────────────────────────────

export interface MediaItem {
  id: string
  student_id: string | null   // null = group/class photo
  class_id: string | null
  type: MediaType
  url: string
  thumbnail_url: string | null
  caption: string | null
  duration_seconds: number | null
  uploaded_by: string
  created_at: string
  student?: Pick<Student, 'id' | 'full_name'>
  class?: Pick<Class, 'id' | 'name'>
}

// ─── Payments ────────────────────────────────────────────────────────────────

export interface PaymentRecord {
  id: string
  parent_id: string
  student_id: string
  amount_cents: number
  currency: string
  status: PaymentStatus
  due_date: string
  paid_at: string | null
  stripe_payment_intent_id: string | null
  invoice_url: string | null
  created_at: string
  student?: Pick<Student, 'id' | 'full_name'>
}

// ─── Announcements ──────────────────────────────────────────────────────────

export interface Announcement {
  id: string
  title: string
  body: string
  author_id: string
  school_id: string | null  // null = all schools
  pinned: boolean
  created_at: string
  updated_at: string
  school?: School
}

// ─── Curriculum ─────────────────────────────────────────────────────────────

export interface CurriculumItem {
  day: string           // 'Monday', 'Tuesday', etc.
  subject: string
  activity: string
  materials?: string
}

export interface Curriculum {
  id: string
  school_id: string
  title: string
  description: string | null
  week_of: string       // ISO date of Monday
  content: CurriculumItem[]
  created_by: string | null
  created_at: string
  updated_at: string
  school?: School
}

// ─── Users / Auth ────────────────────────────────────────────────────────────

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url: string | null
  created_at: string
}

// ─── API response helpers ────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  per_page: number
}
