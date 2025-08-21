import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  boolean, 
  integer,
  pgEnum,
  uniqueIndex
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['administrator', 'teacher', 'student']);
export const attendanceStatusEnum = pgEnum('attendance_status', ['present', 'leave', 'sick', 'absent']);
export const leaveRequestStatusEnum = pgEnum('leave_request_status', ['pending', 'approved', 'rejected']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  full_name: text('full_name').notNull(),
  email: text('email'),
  role: userRoleEnum('role').notNull(),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Classes table
export const classesTable = pgTable('classes', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  grade_level: text('grade_level').notNull(),
  homeroom_teacher_id: integer('homeroom_teacher_id').references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Students table
export const studentsTable = pgTable('students', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id).unique(),
  nis_nisn: text('nis_nisn').notNull().unique(),
  class_id: integer('class_id').notNull().references(() => classesTable.id),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Teacher class assignments table
export const teacherClassAssignmentsTable = pgTable('teacher_class_assignments', {
  id: serial('id').primaryKey(),
  teacher_id: integer('teacher_id').notNull().references(() => usersTable.id),
  class_id: integer('class_id').notNull().references(() => classesTable.id),
  is_homeroom: boolean('is_homeroom').notNull().default(false),
  assigned_at: timestamp('assigned_at').defaultNow().notNull()
}, (table) => ({
  uniqueTeacherClass: uniqueIndex('unique_teacher_class').on(table.teacher_id, table.class_id)
}));

// Attendance records table
export const attendanceRecordsTable = pgTable('attendance_records', {
  id: serial('id').primaryKey(),
  student_id: integer('student_id').notNull().references(() => studentsTable.id),
  class_id: integer('class_id').notNull().references(() => classesTable.id),
  date: timestamp('date', { mode: 'date' }).notNull(),
  status: attendanceStatusEnum('status').notNull(),
  check_in_time: timestamp('check_in_time'),
  check_out_time: timestamp('check_out_time'),
  notes: text('notes'),
  recorded_by: integer('recorded_by').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  uniqueStudentDate: uniqueIndex('unique_student_date').on(table.student_id, table.date)
}));

// Leave requests table
export const leaveRequestsTable = pgTable('leave_requests', {
  id: serial('id').primaryKey(),
  student_id: integer('student_id').notNull().references(() => studentsTable.id),
  request_date: timestamp('request_date').defaultNow().notNull(),
  start_date: timestamp('start_date', { mode: 'date' }).notNull(),
  end_date: timestamp('end_date', { mode: 'date' }).notNull(),
  reason: text('reason').notNull(),
  status: leaveRequestStatusEnum('status').notNull().default('pending'),
  approved_by: integer('approved_by').references(() => usersTable.id),
  approved_at: timestamp('approved_at'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ many, one }) => ({
  // Teacher relations
  homeroomClasses: many(classesTable),
  teacherClassAssignments: many(teacherClassAssignmentsTable),
  recordedAttendances: many(attendanceRecordsTable),
  approvedLeaveRequests: many(leaveRequestsTable),
  
  // Student relation
  studentProfile: one(studentsTable, {
    fields: [usersTable.id],
    references: [studentsTable.user_id]
  })
}));

export const classesRelations = relations(classesTable, ({ one, many }) => ({
  homeroomTeacher: one(usersTable, {
    fields: [classesTable.homeroom_teacher_id],
    references: [usersTable.id]
  }),
  students: many(studentsTable),
  teacherAssignments: many(teacherClassAssignmentsTable),
  attendanceRecords: many(attendanceRecordsTable)
}));

export const studentsRelations = relations(studentsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [studentsTable.user_id],
    references: [usersTable.id]
  }),
  class: one(classesTable, {
    fields: [studentsTable.class_id],
    references: [classesTable.id]
  }),
  attendanceRecords: many(attendanceRecordsTable),
  leaveRequests: many(leaveRequestsTable)
}));

export const teacherClassAssignmentsRelations = relations(teacherClassAssignmentsTable, ({ one }) => ({
  teacher: one(usersTable, {
    fields: [teacherClassAssignmentsTable.teacher_id],
    references: [usersTable.id]
  }),
  class: one(classesTable, {
    fields: [teacherClassAssignmentsTable.class_id],
    references: [classesTable.id]
  })
}));

export const attendanceRecordsRelations = relations(attendanceRecordsTable, ({ one }) => ({
  student: one(studentsTable, {
    fields: [attendanceRecordsTable.student_id],
    references: [studentsTable.id]
  }),
  class: one(classesTable, {
    fields: [attendanceRecordsTable.class_id],
    references: [classesTable.id]
  }),
  recordedBy: one(usersTable, {
    fields: [attendanceRecordsTable.recorded_by],
    references: [usersTable.id]
  })
}));

export const leaveRequestsRelations = relations(leaveRequestsTable, ({ one }) => ({
  student: one(studentsTable, {
    fields: [leaveRequestsTable.student_id],
    references: [studentsTable.id]
  }),
  approvedBy: one(usersTable, {
    fields: [leaveRequestsTable.approved_by],
    references: [usersTable.id]
  })
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Class = typeof classesTable.$inferSelect;
export type NewClass = typeof classesTable.$inferInsert;

export type Student = typeof studentsTable.$inferSelect;
export type NewStudent = typeof studentsTable.$inferInsert;

export type TeacherClassAssignment = typeof teacherClassAssignmentsTable.$inferSelect;
export type NewTeacherClassAssignment = typeof teacherClassAssignmentsTable.$inferInsert;

export type AttendanceRecord = typeof attendanceRecordsTable.$inferSelect;
export type NewAttendanceRecord = typeof attendanceRecordsTable.$inferInsert;

export type LeaveRequest = typeof leaveRequestsTable.$inferSelect;
export type NewLeaveRequest = typeof leaveRequestsTable.$inferInsert;

// Export all tables for relation queries
export const tables = {
  users: usersTable,
  classes: classesTable,
  students: studentsTable,
  teacherClassAssignments: teacherClassAssignmentsTable,
  attendanceRecords: attendanceRecordsTable,
  leaveRequests: leaveRequestsTable
};