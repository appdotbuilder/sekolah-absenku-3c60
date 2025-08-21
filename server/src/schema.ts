import { z } from 'zod';

// Enums
export const userRoleEnum = z.enum(['admin', 'guru', 'siswa']);
export const absensiStatusEnum = z.enum(['hadir', 'izin', 'sakit', 'alpha', 'pending']);

// User schemas
export const userSchema = z.object({
  id: z.number(),
  username: z.string(), // Can be username/NIP/NISN based on role
  password_hash: z.string(),
  role: userRoleEnum,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

export const createUserInputSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: userRoleEnum
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const loginInputSchema = z.object({
  username: z.string().min(1, "Username/NIP/NISN is required"),
  password: z.string().min(1, "Password is required"),
  role: userRoleEnum
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Siswa schemas
export const siswaSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  nisn: z.string(),
  nama: z.string(),
  kelas_id: z.number(),
  foto: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Siswa = z.infer<typeof siswaSchema>;

export const createSiswaInputSchema = z.object({
  user_id: z.number(),
  nisn: z.string().min(1, "NISN is required"),
  nama: z.string().min(1, "Nama is required"),
  kelas_id: z.number(),
  foto: z.string().nullable().optional()
});

export type CreateSiswaInput = z.infer<typeof createSiswaInputSchema>;

export const updateSiswaInputSchema = z.object({
  id: z.number(),
  nisn: z.string().optional(),
  nama: z.string().optional(),
  kelas_id: z.number().optional(),
  foto: z.string().nullable().optional()
});

export type UpdateSiswaInput = z.infer<typeof updateSiswaInputSchema>;

// Guru schemas
export const guruSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  nip: z.string(),
  nama: z.string(),
  foto: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Guru = z.infer<typeof guruSchema>;

export const createGuruInputSchema = z.object({
  user_id: z.number(),
  nip: z.string().min(1, "NIP is required"),
  nama: z.string().min(1, "Nama is required"),
  foto: z.string().nullable().optional()
});

export type CreateGuruInput = z.infer<typeof createGuruInputSchema>;

export const updateGuruInputSchema = z.object({
  id: z.number(),
  nip: z.string().optional(),
  nama: z.string().optional(),
  foto: z.string().nullable().optional()
});

export type UpdateGuruInput = z.infer<typeof updateGuruInputSchema>;

// Kelas schemas
export const kelasSchema = z.object({
  id: z.number(),
  nama_kelas: z.string(),
  wali_kelas_id: z.number().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Kelas = z.infer<typeof kelasSchema>;

export const createKelasInputSchema = z.object({
  nama_kelas: z.string().min(1, "Nama kelas is required"),
  wali_kelas_id: z.number().nullable().optional()
});

export type CreateKelasInput = z.infer<typeof createKelasInputSchema>;

export const updateKelasInputSchema = z.object({
  id: z.number(),
  nama_kelas: z.string().optional(),
  wali_kelas_id: z.number().nullable().optional()
});

export type UpdateKelasInput = z.infer<typeof updateKelasInputSchema>;

// Absensi schemas
export const absensiSchema = z.object({
  id: z.number(),
  siswa_id: z.number(),
  guru_id: z.number().nullable(),
  kelas_id: z.number(),
  status: absensiStatusEnum,
  tanggal: z.coerce.date(),
  waktu_masuk: z.string().nullable(), // TIME type as string
  waktu_pulang: z.string().nullable(), // TIME type as string
  keterangan: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Absensi = z.infer<typeof absensiSchema>;

export const createAbsensiInputSchema = z.object({
  siswa_id: z.number(),
  guru_id: z.number().nullable().optional(),
  kelas_id: z.number(),
  status: absensiStatusEnum,
  tanggal: z.coerce.date(),
  waktu_masuk: z.string().nullable().optional(),
  waktu_pulang: z.string().nullable().optional(),
  keterangan: z.string().nullable().optional()
});

export type CreateAbsensiInput = z.infer<typeof createAbsensiInputSchema>;

export const updateAbsensiInputSchema = z.object({
  id: z.number(),
  status: absensiStatusEnum.optional(),
  waktu_masuk: z.string().nullable().optional(),
  waktu_pulang: z.string().nullable().optional(),
  keterangan: z.string().nullable().optional()
});

export type UpdateAbsensiInput = z.infer<typeof updateAbsensiInputSchema>;

// Absen masuk/pulang schemas for student actions
export const absenMasukInputSchema = z.object({
  siswa_id: z.number(),
  kelas_id: z.number()
});

export type AbsenMasukInput = z.infer<typeof absenMasukInputSchema>;

export const absenPulangInputSchema = z.object({
  absensi_id: z.number()
});

export type AbsenPulangInput = z.infer<typeof absenPulangInputSchema>;

// Izin/Sakit application schema
export const pengajuanIzinInputSchema = z.object({
  siswa_id: z.number(),
  kelas_id: z.number(),
  tanggal: z.coerce.date(),
  status: z.enum(['izin', 'sakit']),
  keterangan: z.string().min(1, "Keterangan is required")
});

export type PengajuanIzinInput = z.infer<typeof pengajuanIzinInputSchema>;

// Verifikasi izin/sakit schema
export const verifikasiIzinInputSchema = z.object({
  absensi_id: z.number(),
  guru_id: z.number(),
  status: z.enum(['izin', 'sakit', 'alpha']) // Admin/Guru can approve or reject (make it alpha)
});

export type VerifikasiIzinInput = z.infer<typeof verifikasiIzinInputSchema>;

// Filter schemas for reports and attendance lists
export const attendanceFilterSchema = z.object({
  kelas_id: z.number().optional(),
  siswa_id: z.number().optional(),
  tanggal_mulai: z.coerce.date().optional(),
  tanggal_selesai: z.coerce.date().optional(),
  status: absensiStatusEnum.optional()
});

export type AttendanceFilter = z.infer<typeof attendanceFilterSchema>;

// Dashboard statistics schema
export const dashboardStatsSchema = z.object({
  total_siswa: z.number(),
  total_guru: z.number(),
  total_kelas: z.number(),
  absensi_hari_ini: z.object({
    hadir: z.number(),
    izin: z.number(),
    sakit: z.number(),
    alpha: z.number(),
    pending: z.number()
  }),
  persentase_kehadiran: z.number()
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

// Update profile and password schemas
export const updateProfileInputSchema = z.object({
  user_id: z.number(),
  nama: z.string().optional(),
  foto: z.string().nullable().optional()
});

export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;

export const changePasswordInputSchema = z.object({
  user_id: z.number(),
  current_password: z.string().min(1, "Current password is required"),
  new_password: z.string().min(6, "New password must be at least 6 characters")
});

export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;