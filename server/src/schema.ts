import { z } from 'zod';

// User roles enum
export const userRoleSchema = z.enum(['administrator', 'teacher', 'student']);
export type UserRole = z.infer<typeof userRoleSchema>;

// Attendance status enum
export const attendanceStatusSchema = z.enum(['present', 'leave', 'sick', 'absent']);
export type AttendanceStatus = z.infer<typeof attendanceStatusSchema>;

// Leave request status enum
export const leaveRequestStatusSchema = z.enum(['pending', 'approved', 'rejected']);
export type LeaveRequestStatus = z.infer<typeof leaveRequestStatusSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(), // NIS/NISN for students, email/username for admin/teachers
  password_hash: z.string(),
  full_name: z.string(),
  email: z.string().nullable(),
  role: userRoleSchema,
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Class schema
export const classSchema = z.object({
  id: z.number(),
  name: z.string(),
  grade_level: z.string(),
  homeroom_teacher_id: z.number().nullable(),
  created_at: z.coerce.date()
});

export type Class = z.infer<typeof classSchema>;

// Student schema
export const studentSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  nis_nisn: z.string(), // Unique student identifier
  class_id: z.number(),
  created_at: z.coerce.date()
});

export type Student = z.infer<typeof studentSchema>;

// Teacher class assignment schema
export const teacherClassAssignmentSchema = z.object({
  id: z.number(),
  teacher_id: z.number(),
  class_id: z.number(),
  is_homeroom: z.boolean(),
  assigned_at: z.coerce.date()
});

export type TeacherClassAssignment = z.infer<typeof teacherClassAssignmentSchema>;

// Attendance record schema
export const attendanceRecordSchema = z.object({
  id: z.number(),
  student_id: z.number(),
  class_id: z.number(),
  date: z.coerce.date(),
  status: attendanceStatusSchema,
  check_in_time: z.coerce.date().nullable(),
  check_out_time: z.coerce.date().nullable(),
  notes: z.string().nullable(),
  recorded_by: z.number(), // Teacher who recorded the attendance
  created_at: z.coerce.date()
});

export type AttendanceRecord = z.infer<typeof attendanceRecordSchema>;

// Leave request schema
export const leaveRequestSchema = z.object({
  id: z.number(),
  student_id: z.number(),
  request_date: z.coerce.date(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  reason: z.string(),
  status: leaveRequestStatusSchema,
  approved_by: z.number().nullable(),
  approved_at: z.coerce.date().nullable(),
  created_at: z.coerce.date()
});

export type LeaveRequest = z.infer<typeof leaveRequestSchema>;

// Input schemas for user management
export const createUserInputSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(6),
  full_name: z.string().min(1),
  email: z.string().email().nullable(),
  role: userRoleSchema
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const updateUserInputSchema = z.object({
  id: z.number(),
  username: z.string().min(1).optional(),
  password: z.string().min(6).optional(),
  full_name: z.string().min(1).optional(),
  email: z.string().email().nullable().optional(),
  role: userRoleSchema.optional(),
  is_active: z.boolean().optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Input schemas for class management
export const createClassInputSchema = z.object({
  name: z.string().min(1),
  grade_level: z.string().min(1),
  homeroom_teacher_id: z.number().nullable()
});

export type CreateClassInput = z.infer<typeof createClassInputSchema>;

export const updateClassInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  grade_level: z.string().min(1).optional(),
  homeroom_teacher_id: z.number().nullable().optional()
});

export type UpdateClassInput = z.infer<typeof updateClassInputSchema>;

// Input schemas for student management
export const createStudentInputSchema = z.object({
  user_id: z.number(),
  nis_nisn: z.string().min(1),
  class_id: z.number()
});

export type CreateStudentInput = z.infer<typeof createStudentInputSchema>;

export const updateStudentInputSchema = z.object({
  id: z.number(),
  nis_nisn: z.string().min(1).optional(),
  class_id: z.number().optional()
});

export type UpdateStudentInput = z.infer<typeof updateStudentInputSchema>;

// Input schemas for teacher class assignments
export const assignTeacherToClassInputSchema = z.object({
  teacher_id: z.number(),
  class_id: z.number(),
  is_homeroom: z.boolean()
});

export type AssignTeacherToClassInput = z.infer<typeof assignTeacherToClassInputSchema>;

// Input schemas for attendance management
export const recordAttendanceInputSchema = z.object({
  student_id: z.number(),
  class_id: z.number(),
  date: z.string(), // ISO date string
  status: attendanceStatusSchema,
  check_in_time: z.string().nullable(), // ISO datetime string
  check_out_time: z.string().nullable(), // ISO datetime string
  notes: z.string().nullable(),
  recorded_by: z.number()
});

export type RecordAttendanceInput = z.infer<typeof recordAttendanceInputSchema>;

export const updateAttendanceInputSchema = z.object({
  id: z.number(),
  status: attendanceStatusSchema.optional(),
  check_in_time: z.string().nullable().optional(),
  check_out_time: z.string().nullable().optional(),
  notes: z.string().nullable().optional()
});

export type UpdateAttendanceInput = z.infer<typeof updateAttendanceInputSchema>;

// Input schemas for leave requests
export const createLeaveRequestInputSchema = z.object({
  student_id: z.number(),
  start_date: z.string(), // ISO date string
  end_date: z.string(), // ISO date string
  reason: z.string().min(1)
});

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestInputSchema>;

export const approveLeaveRequestInputSchema = z.object({
  id: z.number(),
  approved_by: z.number(),
  status: z.enum(['approved', 'rejected'])
});

export type ApproveLeaveRequestInput = z.infer<typeof approveLeaveRequestInputSchema>;

// Input schemas for reporting
export const attendanceReportFilterSchema = z.object({
  class_id: z.number().optional(),
  student_id: z.number().optional(),
  start_date: z.string().optional(), // ISO date string
  end_date: z.string().optional(), // ISO date string
  status: attendanceStatusSchema.optional()
});

export type AttendanceReportFilter = z.infer<typeof attendanceReportFilterSchema>;

export const exportFormatSchema = z.enum(['pdf', 'excel']);
export type ExportFormat = z.infer<typeof exportFormatSchema>;

// Login schema
export const loginInputSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Authentication context
export const authContextSchema = z.object({
  user_id: z.number(),
  username: z.string(),
  role: userRoleSchema,
  full_name: z.string()
});

export type AuthContext = z.infer<typeof authContextSchema>;