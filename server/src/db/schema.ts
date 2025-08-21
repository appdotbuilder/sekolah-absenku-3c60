import { serial, text, pgTable, timestamp, integer, pgEnum, date, time } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'guru', 'siswa']);
export const absensiStatusEnum = pgEnum('absensi_status', ['hadir', 'izin', 'sakit', 'alpha', 'pending']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(), // Can be username/NIP/NISN based on role
  password_hash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Guru table
export const guruTable = pgTable('guru', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  nip: text('nip').notNull().unique(),
  nama: text('nama').notNull(),
  foto: text('foto'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Kelas table
export const kelasTable = pgTable('kelas', {
  id: serial('id').primaryKey(),
  nama_kelas: text('nama_kelas').notNull().unique(),
  wali_kelas_id: integer('wali_kelas_id').references(() => guruTable.id, { onDelete: 'set null' }), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Siswa table
export const siswaTable = pgTable('siswa', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  nisn: text('nisn').notNull().unique(),
  nama: text('nama').notNull(),
  kelas_id: integer('kelas_id').notNull().references(() => kelasTable.id, { onDelete: 'cascade' }),
  foto: text('foto'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Absensi table
export const absensiTable = pgTable('absensi', {
  id: serial('id').primaryKey(),
  siswa_id: integer('siswa_id').notNull().references(() => siswaTable.id, { onDelete: 'cascade' }),
  guru_id: integer('guru_id').references(() => guruTable.id, { onDelete: 'set null' }), // Nullable
  kelas_id: integer('kelas_id').notNull().references(() => kelasTable.id, { onDelete: 'cascade' }),
  status: absensiStatusEnum('status').notNull(),
  tanggal: date('tanggal').notNull(),
  waktu_masuk: time('waktu_masuk'), // Nullable by default
  waktu_pulang: time('waktu_pulang'), // Nullable by default
  keterangan: text('keterangan'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Define relations
export const usersRelations = relations(usersTable, ({ one }) => ({
  siswa: one(siswaTable, {
    fields: [usersTable.id],
    references: [siswaTable.user_id],
  }),
  guru: one(guruTable, {
    fields: [usersTable.id],
    references: [guruTable.user_id],
  }),
}));

export const guruRelations = relations(guruTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [guruTable.user_id],
    references: [usersTable.id],
  }),
  kelasWali: many(kelasTable),
  absensiVerified: many(absensiTable),
}));

export const kelasRelations = relations(kelasTable, ({ one, many }) => ({
  waliKelas: one(guruTable, {
    fields: [kelasTable.wali_kelas_id],
    references: [guruTable.id],
  }),
  siswa: many(siswaTable),
  absensi: many(absensiTable),
}));

export const siswaRelations = relations(siswaTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [siswaTable.user_id],
    references: [usersTable.id],
  }),
  kelas: one(kelasTable, {
    fields: [siswaTable.kelas_id],
    references: [kelasTable.id],
  }),
  absensi: many(absensiTable),
}));

export const absensiRelations = relations(absensiTable, ({ one }) => ({
  siswa: one(siswaTable, {
    fields: [absensiTable.siswa_id],
    references: [siswaTable.id],
  }),
  guru: one(guruTable, {
    fields: [absensiTable.guru_id],
    references: [guruTable.id],
  }),
  kelas: one(kelasTable, {
    fields: [absensiTable.kelas_id],
    references: [kelasTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Guru = typeof guruTable.$inferSelect;
export type NewGuru = typeof guruTable.$inferInsert;

export type Kelas = typeof kelasTable.$inferSelect;
export type NewKelas = typeof kelasTable.$inferInsert;

export type Siswa = typeof siswaTable.$inferSelect;
export type NewSiswa = typeof siswaTable.$inferInsert;

export type Absensi = typeof absensiTable.$inferSelect;
export type NewAbsensi = typeof absensiTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  users: usersTable,
  guru: guruTable,
  kelas: kelasTable,
  siswa: siswaTable,
  absensi: absensiTable,
};