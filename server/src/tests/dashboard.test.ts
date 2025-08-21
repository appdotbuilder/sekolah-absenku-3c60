import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, guruTable, kelasTable, siswaTable, absensiTable } from '../db/schema';
import { getDashboardStats, getDashboardStatsGuru, getDashboardStatsSiswa } from '../handlers/dashboard';

describe('Dashboard Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('getDashboardStats', () => {
    it('should return empty stats for empty database', async () => {
      const result = await getDashboardStats();

      expect(result.total_siswa).toBe(0);
      expect(result.total_guru).toBe(0);
      expect(result.total_kelas).toBe(0);
      expect(result.absensi_hari_ini.hadir).toBe(0);
      expect(result.absensi_hari_ini.izin).toBe(0);
      expect(result.absensi_hari_ini.sakit).toBe(0);
      expect(result.absensi_hari_ini.alpha).toBe(0);
      expect(result.absensi_hari_ini.pending).toBe(0);
      expect(result.persentase_kehadiran).toBe(0);
    });

    it('should return correct counts with data', async () => {
      // Create test users
      const [adminUser] = await db.insert(usersTable).values({
        username: 'admin',
        password_hash: 'hash123',
        role: 'admin'
      }).returning();

      const [guruUser] = await db.insert(usersTable).values({
        username: 'guru123',
        password_hash: 'hash123',
        role: 'guru'
      }).returning();

      const [siswaUser1] = await db.insert(usersTable).values({
        username: 'siswa123',
        password_hash: 'hash123',
        role: 'siswa'
      }).returning();

      const [siswaUser2] = await db.insert(usersTable).values({
        username: 'siswa456',
        password_hash: 'hash123',
        role: 'siswa'
      }).returning();

      // Create guru
      const [guru] = await db.insert(guruTable).values({
        user_id: guruUser.id,
        nip: '123456789',
        nama: 'Guru Test'
      }).returning();

      // Create kelas
      const [kelas] = await db.insert(kelasTable).values({
        nama_kelas: 'X-A',
        wali_kelas_id: guru.id
      }).returning();

      // Create siswa
      const [siswa1] = await db.insert(siswaTable).values({
        user_id: siswaUser1.id,
        nisn: '1234567890',
        nama: 'Siswa Test 1',
        kelas_id: kelas.id
      }).returning();

      const [siswa2] = await db.insert(siswaTable).values({
        user_id: siswaUser2.id,
        nisn: '1234567891',
        nama: 'Siswa Test 2',
        kelas_id: kelas.id
      }).returning();

      // Create today's attendance records
      const today = new Date().toISOString().split('T')[0];

      await db.insert(absensiTable).values([
        {
          siswa_id: siswa1.id,
          kelas_id: kelas.id,
          status: 'hadir',
          tanggal: today
        },
        {
          siswa_id: siswa2.id,
          kelas_id: kelas.id,
          status: 'izin',
          tanggal: today
        }
      ]);

      const result = await getDashboardStats();

      expect(result.total_siswa).toBe(2);
      expect(result.total_guru).toBe(1);
      expect(result.total_kelas).toBe(1);
      expect(result.absensi_hari_ini.hadir).toBe(1);
      expect(result.absensi_hari_ini.izin).toBe(1);
      expect(result.absensi_hari_ini.sakit).toBe(0);
      expect(result.absensi_hari_ini.alpha).toBe(0);
      expect(result.absensi_hari_ini.pending).toBe(0);
      expect(result.persentase_kehadiran).toBe(50); // 1 hadir out of 2 total
    });

    it('should calculate monthly attendance percentage correctly', async () => {
      // Create test data
      const [guruUser] = await db.insert(usersTable).values({
        username: 'guru123',
        password_hash: 'hash123',
        role: 'guru'
      }).returning();

      const [siswaUser] = await db.insert(usersTable).values({
        username: 'siswa123',
        password_hash: 'hash123',
        role: 'siswa'
      }).returning();

      const [guru] = await db.insert(guruTable).values({
        user_id: guruUser.id,
        nip: '123456789',
        nama: 'Guru Test'
      }).returning();

      const [kelas] = await db.insert(kelasTable).values({
        nama_kelas: 'X-A',
        wali_kelas_id: guru.id
      }).returning();

      const [siswa] = await db.insert(siswaTable).values({
        user_id: siswaUser.id,
        nisn: '1234567890',
        nama: 'Siswa Test',
        kelas_id: kelas.id
      }).returning();

      // Create attendance records for this month (3 hadir, 1 izin, 1 sakit)
      const today = new Date();
      const dates = [];
      for (let i = 0; i < 5; i++) {
        const date = new Date(today.getFullYear(), today.getMonth(), i + 1);
        dates.push(date.toISOString().split('T')[0]);
      }

      await db.insert(absensiTable).values([
        { siswa_id: siswa.id, kelas_id: kelas.id, status: 'hadir', tanggal: dates[0] },
        { siswa_id: siswa.id, kelas_id: kelas.id, status: 'hadir', tanggal: dates[1] },
        { siswa_id: siswa.id, kelas_id: kelas.id, status: 'hadir', tanggal: dates[2] },
        { siswa_id: siswa.id, kelas_id: kelas.id, status: 'izin', tanggal: dates[3] },
        { siswa_id: siswa.id, kelas_id: kelas.id, status: 'sakit', tanggal: dates[4] }
      ]);

      const result = await getDashboardStats();

      expect(result.persentase_kehadiran).toBe(60); // 3 hadir out of 5 total = 60%
    });
  });

  describe('getDashboardStatsGuru', () => {
    it('should return empty stats for guru with no managed classes', async () => {
      // Create guru
      const [guruUser] = await db.insert(usersTable).values({
        username: 'guru123',
        password_hash: 'hash123',
        role: 'guru'
      }).returning();

      const [guru] = await db.insert(guruTable).values({
        user_id: guruUser.id,
        nip: '123456789',
        nama: 'Guru Test'
      }).returning();

      const result = await getDashboardStatsGuru(guru.id);

      expect(result.total_siswa).toBe(0);
      expect(result.total_guru).toBe(1);
      expect(result.total_kelas).toBe(0);
      expect(result.absensi_hari_ini.hadir).toBe(0);
      expect(result.persentase_kehadiran).toBe(0);
    });

    it('should return stats only for managed classes', async () => {
      // Create users
      const [guruUser1] = await db.insert(usersTable).values({
        username: 'guru1',
        password_hash: 'hash123',
        role: 'guru'
      }).returning();

      const [guruUser2] = await db.insert(usersTable).values({
        username: 'guru2',
        password_hash: 'hash123',
        role: 'guru'
      }).returning();

      const [siswaUser1] = await db.insert(usersTable).values({
        username: 'siswa1',
        password_hash: 'hash123',
        role: 'siswa'
      }).returning();

      const [siswaUser2] = await db.insert(usersTable).values({
        username: 'siswa2',
        password_hash: 'hash123',
        role: 'siswa'
      }).returning();

      const [siswaUser3] = await db.insert(usersTable).values({
        username: 'siswa3',
        password_hash: 'hash123',
        role: 'siswa'
      }).returning();

      // Create gurus
      const [guru1] = await db.insert(guruTable).values({
        user_id: guruUser1.id,
        nip: '123456789',
        nama: 'Guru Test 1'
      }).returning();

      const [guru2] = await db.insert(guruTable).values({
        user_id: guruUser2.id,
        nip: '123456790',
        nama: 'Guru Test 2'
      }).returning();

      // Create classes - guru1 manages 1 class, guru2 manages another
      const [kelas1] = await db.insert(kelasTable).values({
        nama_kelas: 'X-A',
        wali_kelas_id: guru1.id
      }).returning();

      const [kelas2] = await db.insert(kelasTable).values({
        nama_kelas: 'X-B',
        wali_kelas_id: guru2.id
      }).returning();

      // Create siswa - 2 in guru1's class, 1 in guru2's class
      const [siswa1] = await db.insert(siswaTable).values({
        user_id: siswaUser1.id,
        nisn: '1234567890',
        nama: 'Siswa Test 1',
        kelas_id: kelas1.id
      }).returning();

      const [siswa2] = await db.insert(siswaTable).values({
        user_id: siswaUser2.id,
        nisn: '1234567891',
        nama: 'Siswa Test 2',
        kelas_id: kelas1.id
      }).returning();

      const [siswa3] = await db.insert(siswaTable).values({
        user_id: siswaUser3.id,
        nisn: '1234567892',
        nama: 'Siswa Test 3',
        kelas_id: kelas2.id
      }).returning();

      // Create today's attendance - only for guru1's class
      const today = new Date().toISOString().split('T')[0];

      await db.insert(absensiTable).values([
        {
          siswa_id: siswa1.id,
          kelas_id: kelas1.id,
          status: 'hadir',
          tanggal: today
        },
        {
          siswa_id: siswa2.id,
          kelas_id: kelas1.id,
          status: 'izin',
          tanggal: today
        },
        {
          siswa_id: siswa3.id,
          kelas_id: kelas2.id,
          status: 'hadir',
          tanggal: today
        }
      ]);

      const result = await getDashboardStatsGuru(guru1.id);

      // Should only show stats for guru1's managed class
      expect(result.total_siswa).toBe(2); // Only siswa in kelas1
      expect(result.total_guru).toBe(1);
      expect(result.total_kelas).toBe(1); // Only kelas1
      expect(result.absensi_hari_ini.hadir).toBe(1); // Only siswa1's attendance
      expect(result.absensi_hari_ini.izin).toBe(1); // Only siswa2's attendance
      expect(result.absensi_hari_ini.sakit).toBe(0);
    });
  });

  describe('getDashboardStatsSiswa', () => {
    it('should return empty stats for siswa with no attendance records', async () => {
      // Create siswa
      const [siswaUser] = await db.insert(usersTable).values({
        username: 'siswa123',
        password_hash: 'hash123',
        role: 'siswa'
      }).returning();

      const [guruUser] = await db.insert(usersTable).values({
        username: 'guru123',
        password_hash: 'hash123',
        role: 'guru'
      }).returning();

      const [guru] = await db.insert(guruTable).values({
        user_id: guruUser.id,
        nip: '123456789',
        nama: 'Guru Test'
      }).returning();

      const [kelas] = await db.insert(kelasTable).values({
        nama_kelas: 'X-A',
        wali_kelas_id: guru.id
      }).returning();

      const [siswa] = await db.insert(siswaTable).values({
        user_id: siswaUser.id,
        nisn: '1234567890',
        nama: 'Siswa Test',
        kelas_id: kelas.id
      }).returning();

      const result = await getDashboardStatsSiswa(siswa.id);

      expect(result.total_hadir).toBe(0);
      expect(result.total_izin).toBe(0);
      expect(result.total_sakit).toBe(0);
      expect(result.total_alpha).toBe(0);
      expect(result.persentase_kehadiran).toBe(0);
      expect(result.absensi_bulan_ini).toBe(0);
      expect(result.status_hari_ini).toBe('belum_absen');
    });

    it('should calculate attendance stats correctly', async () => {
      // Create test data
      const [siswaUser] = await db.insert(usersTable).values({
        username: 'siswa123',
        password_hash: 'hash123',
        role: 'siswa'
      }).returning();

      const [guruUser] = await db.insert(usersTable).values({
        username: 'guru123',
        password_hash: 'hash123',
        role: 'guru'
      }).returning();

      const [guru] = await db.insert(guruTable).values({
        user_id: guruUser.id,
        nip: '123456789',
        nama: 'Guru Test'
      }).returning();

      const [kelas] = await db.insert(kelasTable).values({
        nama_kelas: 'X-A',
        wali_kelas_id: guru.id
      }).returning();

      const [siswa] = await db.insert(siswaTable).values({
        user_id: siswaUser.id,
        nisn: '1234567890',
        nama: 'Siswa Test',
        kelas_id: kelas.id
      }).returning();

      // Create attendance records: 3 hadir, 1 izin, 1 sakit, 2 alpha
      const dates = [];
      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
      }

      await db.insert(absensiTable).values([
        { siswa_id: siswa.id, kelas_id: kelas.id, status: 'hadir', tanggal: dates[0] }, // today
        { siswa_id: siswa.id, kelas_id: kelas.id, status: 'hadir', tanggal: dates[1] },
        { siswa_id: siswa.id, kelas_id: kelas.id, status: 'hadir', tanggal: dates[2] },
        { siswa_id: siswa.id, kelas_id: kelas.id, status: 'izin', tanggal: dates[3] },
        { siswa_id: siswa.id, kelas_id: kelas.id, status: 'sakit', tanggal: dates[4] },
        { siswa_id: siswa.id, kelas_id: kelas.id, status: 'alpha', tanggal: dates[5] },
        { siswa_id: siswa.id, kelas_id: kelas.id, status: 'alpha', tanggal: dates[6] }
      ]);

      const result = await getDashboardStatsSiswa(siswa.id);

      expect(result.total_hadir).toBe(3);
      expect(result.total_izin).toBe(1);
      expect(result.total_sakit).toBe(1);
      expect(result.total_alpha).toBe(2);
      expect(result.persentase_kehadiran).toBe(43); // 3 hadir out of 7 total = 43% (rounded)
      expect(result.status_hari_ini).toBe('hadir'); // Today's record
    });

    it('should count monthly attendance correctly', async () => {
      // Create test data
      const [siswaUser] = await db.insert(usersTable).values({
        username: 'siswa123',
        password_hash: 'hash123',
        role: 'siswa'
      }).returning();

      const [guruUser] = await db.insert(usersTable).values({
        username: 'guru123',
        password_hash: 'hash123',
        role: 'guru'
      }).returning();

      const [guru] = await db.insert(guruTable).values({
        user_id: guruUser.id,
        nip: '123456789',
        nama: 'Guru Test'
      }).returning();

      const [kelas] = await db.insert(kelasTable).values({
        nama_kelas: 'X-A',
        wali_kelas_id: guru.id
      }).returning();

      const [siswa] = await db.insert(siswaTable).values({
        user_id: siswaUser.id,
        nisn: '1234567890',
        nama: 'Siswa Test',
        kelas_id: kelas.id
      }).returning();

      // Create records: 2 this month, 1 last month
      const thisMonth = new Date();
      const lastMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() - 1, 15);
      
      const thisMonthDate1 = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 5).toISOString().split('T')[0];
      const thisMonthDate2 = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 10).toISOString().split('T')[0];
      const lastMonthDate = lastMonth.toISOString().split('T')[0];

      await db.insert(absensiTable).values([
        { siswa_id: siswa.id, kelas_id: kelas.id, status: 'hadir', tanggal: thisMonthDate1 },
        { siswa_id: siswa.id, kelas_id: kelas.id, status: 'izin', tanggal: thisMonthDate2 },
        { siswa_id: siswa.id, kelas_id: kelas.id, status: 'hadir', tanggal: lastMonthDate }
      ]);

      const result = await getDashboardStatsSiswa(siswa.id);

      expect(result.absensi_bulan_ini).toBe(2); // Only this month's records
      expect(result.total_hadir).toBe(2); // Total hadir across all months
      expect(result.total_izin).toBe(1); // Total izin across all months
    });

    it('should handle today status correctly when no attendance today', async () => {
      // Create test data
      const [siswaUser] = await db.insert(usersTable).values({
        username: 'siswa123',
        password_hash: 'hash123',
        role: 'siswa'
      }).returning();

      const [guruUser] = await db.insert(usersTable).values({
        username: 'guru123',
        password_hash: 'hash123',
        role: 'guru'
      }).returning();

      const [guru] = await db.insert(guruTable).values({
        user_id: guruUser.id,
        nip: '123456789',
        nama: 'Guru Test'
      }).returning();

      const [kelas] = await db.insert(kelasTable).values({
        nama_kelas: 'X-A',
        wali_kelas_id: guru.id
      }).returning();

      const [siswa] = await db.insert(siswaTable).values({
        user_id: siswaUser.id,
        nisn: '1234567890',
        nama: 'Siswa Test',
        kelas_id: kelas.id
      }).returning();

      // Create attendance for yesterday only
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      await db.insert(absensiTable).values({
        siswa_id: siswa.id,
        kelas_id: kelas.id,
        status: 'hadir',
        tanggal: yesterdayStr
      });

      const result = await getDashboardStatsSiswa(siswa.id);

      expect(result.status_hari_ini).toBe('belum_absen');
      expect(result.total_hadir).toBe(1); // Yesterday's record
    });
  });
});