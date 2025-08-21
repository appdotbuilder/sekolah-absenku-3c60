import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Schema imports
import {
  loginInputSchema,
  createUserInputSchema,
  updateUserInputSchema,
  createClassInputSchema,
  updateClassInputSchema,
  createStudentInputSchema,
  updateStudentInputSchema,
  assignTeacherToClassInputSchema,
  recordAttendanceInputSchema,
  updateAttendanceInputSchema,
  createLeaveRequestInputSchema,
  approveLeaveRequestInputSchema,
  attendanceReportFilterSchema,
  exportFormatSchema
} from './schema';

// Handler imports
import { login, logout, getCurrentUser } from './handlers/auth';
import { 
  createUser, 
  updateUser, 
  deleteUser, 
  getAllUsers, 
  getUsersByRole, 
  getUserById 
} from './handlers/users';
import { 
  createClass, 
  updateClass, 
  deleteClass, 
  getAllClasses, 
  getClassById, 
  getClassesByTeacher 
} from './handlers/classes';
import { 
  createStudent, 
  updateStudent, 
  deleteStudent, 
  getAllStudents, 
  getStudentsByClass, 
  getStudentById, 
  getStudentByNisNisn 
} from './handlers/students';
import { 
  assignTeacherToClass, 
  removeTeacherFromClass, 
  getTeacherAssignments, 
  getClassAssignments, 
  updateTeacherAssignment 
} from './handlers/teacher_assignments';
import { 
  recordAttendance, 
  updateAttendance, 
  getAttendanceByClass, 
  getAttendanceByStudent, 
  getAttendanceReport, 
  bulkRecordAttendance, 
  getAttendanceStats 
} from './handlers/attendance';
import { 
  createLeaveRequest, 
  approveLeaveRequest, 
  getLeaveRequestsByStatus, 
  getLeaveRequestsByStudent, 
  getAllLeaveRequests, 
  deleteLeaveRequest, 
  getPendingLeaveRequests 
} from './handlers/leave_requests';
import { 
  generateAttendanceReport, 
  exportAttendanceReportToPDF, 
  exportAttendanceReportToExcel, 
  getAttendanceSummaryReport, 
  exportReport 
} from './handlers/reports';
import { z } from 'zod';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  auth: router({
    login: publicProcedure
      .input(loginInputSchema)
      .mutation(({ input }) => login(input)),
    
    logout: publicProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(({ input }) => logout(input.userId)),
    
    getCurrentUser: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(({ input }) => getCurrentUser(input.userId))
  }),

  // User management routes (Admin only)
  users: router({
    create: publicProcedure
      .input(createUserInputSchema)
      .mutation(({ input }) => createUser(input)),
    
    update: publicProcedure
      .input(updateUserInputSchema)
      .mutation(({ input }) => updateUser(input)),
    
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteUser(input.id)),
    
    getAll: publicProcedure
      .query(() => getAllUsers()),
    
    getByRole: publicProcedure
      .input(z.object({ role: z.enum(['administrator', 'teacher', 'student']) }))
      .query(({ input }) => getUsersByRole(input.role)),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getUserById(input.id))
  }),

  // Class management routes
  classes: router({
    create: publicProcedure
      .input(createClassInputSchema)
      .mutation(({ input }) => createClass(input)),
    
    update: publicProcedure
      .input(updateClassInputSchema)
      .mutation(({ input }) => updateClass(input)),
    
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteClass(input.id)),
    
    getAll: publicProcedure
      .query(() => getAllClasses()),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getClassById(input.id)),
    
    getByTeacher: publicProcedure
      .input(z.object({ teacherId: z.number() }))
      .query(({ input }) => getClassesByTeacher(input.teacherId))
  }),

  // Student management routes
  students: router({
    create: publicProcedure
      .input(createStudentInputSchema)
      .mutation(({ input }) => createStudent(input)),
    
    update: publicProcedure
      .input(updateStudentInputSchema)
      .mutation(({ input }) => updateStudent(input)),
    
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteStudent(input.id)),
    
    getAll: publicProcedure
      .query(() => getAllStudents()),
    
    getByClass: publicProcedure
      .input(z.object({ classId: z.number() }))
      .query(({ input }) => getStudentsByClass(input.classId)),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getStudentById(input.id)),
    
    getByNisNisn: publicProcedure
      .input(z.object({ nisNisn: z.string() }))
      .query(({ input }) => getStudentByNisNisn(input.nisNisn))
  }),

  // Teacher assignment routes
  teacherAssignments: router({
    assign: publicProcedure
      .input(assignTeacherToClassInputSchema)
      .mutation(({ input }) => assignTeacherToClass(input)),
    
    remove: publicProcedure
      .input(z.object({ teacherId: z.number(), classId: z.number() }))
      .mutation(({ input }) => removeTeacherFromClass(input.teacherId, input.classId)),
    
    getByTeacher: publicProcedure
      .input(z.object({ teacherId: z.number() }))
      .query(({ input }) => getTeacherAssignments(input.teacherId)),
    
    getByClass: publicProcedure
      .input(z.object({ classId: z.number() }))
      .query(({ input }) => getClassAssignments(input.classId)),
    
    update: publicProcedure
      .input(z.object({ teacherId: z.number(), classId: z.number(), isHomeroom: z.boolean() }))
      .mutation(({ input }) => updateTeacherAssignment(input.teacherId, input.classId, input.isHomeroom))
  }),

  // Attendance management routes
  attendance: router({
    record: publicProcedure
      .input(recordAttendanceInputSchema)
      .mutation(({ input }) => recordAttendance(input)),
    
    update: publicProcedure
      .input(updateAttendanceInputSchema)
      .mutation(({ input }) => updateAttendance(input)),
    
    bulkRecord: publicProcedure
      .input(z.array(recordAttendanceInputSchema))
      .mutation(({ input }) => bulkRecordAttendance(input)),
    
    getByClass: publicProcedure
      .input(z.object({ classId: z.number(), date: z.string() }))
      .query(({ input }) => getAttendanceByClass(input.classId, input.date)),
    
    getByStudent: publicProcedure
      .input(z.object({ 
        studentId: z.number(), 
        startDate: z.string().optional(), 
        endDate: z.string().optional() 
      }))
      .query(({ input }) => getAttendanceByStudent(input.studentId, input.startDate, input.endDate)),
    
    getReport: publicProcedure
      .input(attendanceReportFilterSchema)
      .query(({ input }) => getAttendanceReport(input)),
    
    getStats: publicProcedure
      .input(z.object({ 
        classId: z.number().optional(), 
        startDate: z.string().optional(), 
        endDate: z.string().optional() 
      }))
      .query(({ input }) => getAttendanceStats(input.classId, input.startDate, input.endDate))
  }),

  // Leave request routes
  leaveRequests: router({
    create: publicProcedure
      .input(createLeaveRequestInputSchema)
      .mutation(({ input }) => createLeaveRequest(input)),
    
    approve: publicProcedure
      .input(approveLeaveRequestInputSchema)
      .mutation(({ input }) => approveLeaveRequest(input)),
    
    getByStatus: publicProcedure
      .input(z.object({ status: z.enum(['pending', 'approved', 'rejected']) }))
      .query(({ input }) => getLeaveRequestsByStatus(input.status)),
    
    getByStudent: publicProcedure
      .input(z.object({ studentId: z.number() }))
      .query(({ input }) => getLeaveRequestsByStudent(input.studentId)),
    
    getAll: publicProcedure
      .query(() => getAllLeaveRequests()),
    
    getPending: publicProcedure
      .query(() => getPendingLeaveRequests()),
    
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteLeaveRequest(input.id))
  }),

  // Reporting routes
  reports: router({
    generate: publicProcedure
      .input(attendanceReportFilterSchema)
      .query(({ input }) => generateAttendanceReport(input)),
    
    exportPDF: publicProcedure
      .input(z.object({ 
        filters: attendanceReportFilterSchema, 
        filename: z.string().optional() 
      }))
      .mutation(({ input }) => exportAttendanceReportToPDF(input.filters, input.filename)),
    
    exportExcel: publicProcedure
      .input(z.object({ 
        filters: attendanceReportFilterSchema, 
        filename: z.string().optional() 
      }))
      .mutation(({ input }) => exportAttendanceReportToExcel(input.filters, input.filename)),
    
    getSummary: publicProcedure
      .input(attendanceReportFilterSchema)
      .query(({ input }) => getAttendanceSummaryReport(input)),
    
    export: publicProcedure
      .input(z.object({ 
        filters: attendanceReportFilterSchema, 
        format: exportFormatSchema,
        filename: z.string().optional() 
      }))
      .mutation(({ input }) => exportReport(input.filters, input.format, input.filename))
  })
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC Attendance Management Server listening at port: ${port}`);
}

start();