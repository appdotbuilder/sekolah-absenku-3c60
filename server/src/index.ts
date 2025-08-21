import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  loginInputSchema,
  createUserInputSchema,
  createSiswaInputSchema,
  updateSiswaInputSchema,
  createGuruInputSchema,
  updateGuruInputSchema,
  createKelasInputSchema,
  updateKelasInputSchema,
  createAbsensiInputSchema,
  updateAbsensiInputSchema,
  absenMasukInputSchema,
  absenPulangInputSchema,
  pengajuanIzinInputSchema,
  verifikasiIzinInputSchema,
  attendanceFilterSchema,
  updateProfileInputSchema,
  changePasswordInputSchema
} from './schema';

// Import handlers
import { login, getCurrentUser, changePassword } from './handlers/auth';
import { 
  createUser, 
  getUsers, 
  getUserById, 
  updateUser, 
  deleteUser 
} from './handlers/users';
import { 
  createSiswa, 
  getSiswa, 
  getSiswaById, 
  getSiswaByUserId, 
  getSiswaByKelas,
  updateSiswa, 
  updateSiswaProfile,
  deleteSiswa 
} from './handlers/siswa';
import { 
  createGuru, 
  getGuru, 
  getGuruById, 
  getGuruByUserId,
  updateGuru, 
  updateGuruProfile,
  deleteGuru 
} from './handlers/guru';
import { 
  createKelas, 
  getKelas, 
  getKelasById, 
  getKelasByWaliKelas,
  updateKelas, 
  deleteKelas 
} from './handlers/kelas';
import {
  absenMasuk,
  absenPulang,
  pengajuanIzin,
  createAbsensi,
  verifikasiIzin,
  updateAbsensi,
  getAbsensiByFilter,
  getAbsensiHariIni,
  getAbsensiBySiswa,
  getPendingIzin,
  getAbsensiStats,
  deleteAbsensi
} from './handlers/absensi';
import { 
  getDashboardStats, 
  getDashboardStatsGuru, 
  getDashboardStatsSiswa 
} from './handlers/dashboard';
import {
  generateAttendanceReport,
  generateDailyReport,
  generateWeeklyReport,
  generateMonthlyReport,
  exportReportToPDF,
  exportReportToExcel
} from './handlers/reports';

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
    
    getCurrentUser: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(({ input }) => getCurrentUser(input.userId)),
    
    changePassword: publicProcedure
      .input(changePasswordInputSchema)
      .mutation(({ input }) => 
        changePassword(input.user_id, input.current_password, input.new_password)
      ),
  }),

  // User management routes (Admin)
  users: router({
    create: publicProcedure
      .input(createUserInputSchema)
      .mutation(({ input }) => createUser(input)),
    
    getAll: publicProcedure
      .query(() => getUsers()),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getUserById(input.id)),
    
    update: publicProcedure
      .input(z.object({ id: z.number(), updates: z.any() }))
      .mutation(({ input }) => updateUser(input.id, input.updates)),
    
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteUser(input.id)),
  }),

  // Siswa management routes
  siswa: router({
    create: publicProcedure
      .input(createSiswaInputSchema)
      .mutation(({ input }) => createSiswa(input)),
    
    getAll: publicProcedure
      .query(() => getSiswa()),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getSiswaById(input.id)),
    
    getByUserId: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(({ input }) => getSiswaByUserId(input.userId)),
    
    getByKelas: publicProcedure
      .input(z.object({ kelasId: z.number() }))
      .query(({ input }) => getSiswaByKelas(input.kelasId)),
    
    update: publicProcedure
      .input(updateSiswaInputSchema)
      .mutation(({ input }) => updateSiswa(input)),
    
    updateProfile: publicProcedure
      .input(updateProfileInputSchema)
      .mutation(({ input }) => updateSiswaProfile(input)),
    
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteSiswa(input.id)),
  }),

  // Guru management routes
  guru: router({
    create: publicProcedure
      .input(createGuruInputSchema)
      .mutation(({ input }) => createGuru(input)),
    
    getAll: publicProcedure
      .query(() => getGuru()),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getGuruById(input.id)),
    
    getByUserId: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(({ input }) => getGuruByUserId(input.userId)),
    
    update: publicProcedure
      .input(updateGuruInputSchema)
      .mutation(({ input }) => updateGuru(input)),
    
    updateProfile: publicProcedure
      .input(updateProfileInputSchema)
      .mutation(({ input }) => updateGuruProfile(input)),
    
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteGuru(input.id)),
  }),

  // Kelas management routes
  kelas: router({
    create: publicProcedure
      .input(createKelasInputSchema)
      .mutation(({ input }) => createKelas(input)),
    
    getAll: publicProcedure
      .query(() => getKelas()),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getKelasById(input.id)),
    
    getByWaliKelas: publicProcedure
      .input(z.object({ guruId: z.number() }))
      .query(({ input }) => getKelasByWaliKelas(input.guruId)),
    
    update: publicProcedure
      .input(updateKelasInputSchema)
      .mutation(({ input }) => updateKelas(input)),
    
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteKelas(input.id)),
  }),

  // Attendance routes
  absensi: router({
    // Student actions
    absenMasuk: publicProcedure
      .input(absenMasukInputSchema)
      .mutation(({ input }) => absenMasuk(input)),
    
    absenPulang: publicProcedure
      .input(absenPulangInputSchema)
      .mutation(({ input }) => absenPulang(input)),
    
    pengajuanIzin: publicProcedure
      .input(pengajuanIzinInputSchema)
      .mutation(({ input }) => pengajuanIzin(input)),

    // Teacher/Admin actions
    create: publicProcedure
      .input(createAbsensiInputSchema)
      .mutation(({ input }) => createAbsensi(input)),
    
    verifikasiIzin: publicProcedure
      .input(verifikasiIzinInputSchema)
      .mutation(({ input }) => verifikasiIzin(input)),
    
    update: publicProcedure
      .input(updateAbsensiInputSchema)
      .mutation(({ input }) => updateAbsensi(input)),

    // Queries
    getByFilter: publicProcedure
      .input(attendanceFilterSchema)
      .query(({ input }) => getAbsensiByFilter(input)),
    
    getHariIni: publicProcedure
      .input(z.object({ kelasId: z.number().optional() }))
      .query(({ input }) => getAbsensiHariIni(input.kelasId)),
    
    getBySiswa: publicProcedure
      .input(z.object({ siswaId: z.number(), limit: z.number().optional() }))
      .query(({ input }) => getAbsensiBySiswa(input.siswaId, input.limit)),
    
    getPendingIzin: publicProcedure
      .input(z.object({ kelasId: z.number().optional() }))
      .query(({ input }) => getPendingIzin(input.kelasId)),
    
    getStats: publicProcedure
      .input(z.object({ 
        kelasId: z.number().optional(),
        dateRange: z.object({ start: z.coerce.date(), end: z.coerce.date() }).optional()
      }))
      .query(({ input }) => getAbsensiStats(input.kelasId, input.dateRange)),
    
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteAbsensi(input.id)),
  }),

  // Dashboard routes
  dashboard: router({
    getStatsAdmin: publicProcedure
      .query(() => getDashboardStats()),
    
    getStatsGuru: publicProcedure
      .input(z.object({ guruId: z.number() }))
      .query(({ input }) => getDashboardStatsGuru(input.guruId)),
    
    getStatsSiswa: publicProcedure
      .input(z.object({ siswaId: z.number() }))
      .query(({ input }) => getDashboardStatsSiswa(input.siswaId)),
  }),

  // Reports routes
  reports: router({
    generateAttendance: publicProcedure
      .input(attendanceFilterSchema)
      .query(({ input }) => generateAttendanceReport(input)),
    
    generateDaily: publicProcedure
      .input(z.object({ date: z.coerce.date(), kelasId: z.number().optional() }))
      .query(({ input }) => generateDailyReport(input.date, input.kelasId)),
    
    generateWeekly: publicProcedure
      .input(z.object({ startDate: z.coerce.date(), kelasId: z.number().optional() }))
      .query(({ input }) => generateWeeklyReport(input.startDate, input.kelasId)),
    
    generateMonthly: publicProcedure
      .input(z.object({ year: z.number(), month: z.number(), kelasId: z.number().optional() }))
      .query(({ input }) => generateMonthlyReport(input.year, input.month, input.kelasId)),
    
    exportToPDF: publicProcedure
      .input(z.object({ 
        reportData: z.any(), 
        reportType: z.enum(['daily', 'weekly', 'monthly', 'custom']) 
      }))
      .mutation(({ input }) => exportReportToPDF(input.reportData, input.reportType)),
    
    exportToExcel: publicProcedure
      .input(z.object({ 
        reportData: z.any(), 
        reportType: z.enum(['daily', 'weekly', 'monthly', 'custom']) 
      }))
      .mutation(({ input }) => exportReportToExcel(input.reportData, input.reportType)),
  }),
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
  console.log(`TRPC server listening at port: ${port}`);
}

start();