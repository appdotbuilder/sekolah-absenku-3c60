import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, guruTable, kelasTable, siswaTable, absensiTable } from '../db/schema';
import { type AttendanceFilter } from '../schema';
import { generateAttendanceReport } from '../handlers/reports';

describe('generateAttendanceReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test data
  const createTestData = async () => {
    // Create users
    const adminUser = await db.insert(usersTable)
      .values({
        username: 'admin',
        password_hash: 'hashed_password',
        role: 'admin'
      })
      .returning()
      .execute();

    const guruUser = await db.insert(usersTable)
      .values({
        username: '12345678',
        password_hash: 'hashed_password',
        role: 'guru'
      })
      .returning()
      .execute();

    const siswaUser1 = await db.insert(usersTable)
      .values({
        username: '1001',
        password_hash: 'hashed_password',
        role: 'siswa'
      })
      .returning()
      .execute();

    const siswaUser2 = await db.insert(usersTable)
      .values({
        username: '1002',
        password_hash: 'hashed_password',
        role: 'siswa'
      })
      .returning()
      .execute();

    // Create guru
    const guru = await db.insert(guruTable)
      .values({
        user_id: guruUser[0].id,
        nip: '12345678',
        nama: 'Pak Guru'
      })
      .returning()
      .execute();

    // Create kelas
    const kelas1 = await db.insert(kelasTable)
      .values({
        nama_kelas: 'X-A',
        wali_kelas_id: guru[0].id
      })
      .returning()
      .execute();

    const kelas2 = await db.insert(kelasTable)
      .values({
        nama_kelas: 'X-B',
        wali_kelas_id: guru[0].id
      })
      .returning()
      .execute();

    // Create siswa
    const siswa1 = await db.insert(siswaTable)
      .values({
        user_id: siswaUser1[0].id,
        nisn: '1001',
        nama: 'Siswa Satu',
        kelas_id: kelas1[0].id
      })
      .returning()
      .execute();

    const siswa2 = await db.insert(siswaTable)
      .values({
        user_id: siswaUser2[0].id,
        nisn: '1002',
        nama: 'Siswa Dua',
        kelas_id: kelas2[0].id
      })
      .returning()
      .execute();

    // Create attendance records
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // Convert dates to string format for PostgreSQL date columns
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

    // Siswa 1 attendance - good attendance
    await db.insert(absensiTable)
      .values([
        {
          siswa_id: siswa1[0].id,
          guru_id: guru[0].id,
          kelas_id: kelas1[0].id,
          status: 'hadir',
          tanggal: todayStr,
          waktu_masuk: '07:00:00'
        },
        {
          siswa_id: siswa1[0].id,
          guru_id: guru[0].id,
          kelas_id: kelas1[0].id,
          status: 'hadir',
          tanggal: yesterdayStr,
          waktu_masuk: '07:05:00'
        },
        {
          siswa_id: siswa1[0].id,
          guru_id: guru[0].id,
          kelas_id: kelas1[0].id,
          status: 'izin',
          tanggal: twoDaysAgoStr,
          keterangan: 'Sakit'
        }
      ])
      .execute();

    // Siswa 2 attendance - mixed attendance
    await db.insert(absensiTable)
      .values([
        {
          siswa_id: siswa2[0].id,
          guru_id: guru[0].id,
          kelas_id: kelas2[0].id,
          status: 'hadir',
          tanggal: todayStr,
          waktu_masuk: '07:10:00'
        },
        {
          siswa_id: siswa2[0].id,
          guru_id: guru[0].id,
          kelas_id: kelas2[0].id,
          status: 'alpha',
          tanggal: yesterdayStr
        },
        {
          siswa_id: siswa2[0].id,
          guru_id: guru[0].id,
          kelas_id: kelas2[0].id,
          status: 'sakit',
          tanggal: twoDaysAgoStr,
          keterangan: 'Demam'
        }
      ])
      .execute();

    return {
      guru: guru[0],
      kelas1: kelas1[0],
      kelas2: kelas2[0],
      siswa1: siswa1[0],
      siswa2: siswa2[0],
      dates: { today, yesterday, twoDaysAgo }
    };
  };

  it('should generate attendance report for all students', async () => {
    const testData = await createTestData();
    
    const filter: AttendanceFilter = {};
    const result = await generateAttendanceReport(filter);

    // Should return data for all students
    expect(result.data).toHaveLength(2);
    expect(result.summary.total_siswa).toBe(2);

    // Check first student data
    const siswa1Data = result.data.find(d => d.siswa_id === testData.siswa1.id);
    expect(siswa1Data).toBeDefined();
    expect(siswa1Data!.siswa_nama).toBe('Siswa Satu');
    expect(siswa1Data!.nisn).toBe('1001');
    expect(siswa1Data!.kelas).toBe('X-A');
    expect(siswa1Data!.total_hadir).toBe(2);
    expect(siswa1Data!.total_izin).toBe(1);
    expect(siswa1Data!.total_sakit).toBe(0);
    expect(siswa1Data!.total_alpha).toBe(0);
    expect(siswa1Data!.persentase_kehadiran).toBe(66.67); // 2/3 * 100

    // Check second student data
    const siswa2Data = result.data.find(d => d.siswa_id === testData.siswa2.id);
    expect(siswa2Data).toBeDefined();
    expect(siswa2Data!.siswa_nama).toBe('Siswa Dua');
    expect(siswa2Data!.nisn).toBe('1002');
    expect(siswa2Data!.kelas).toBe('X-B');
    expect(siswa2Data!.total_hadir).toBe(1);
    expect(siswa2Data!.total_izin).toBe(0);
    expect(siswa2Data!.total_sakit).toBe(1);
    expect(siswa2Data!.total_alpha).toBe(1);
    expect(siswa2Data!.persentase_kehadiran).toBe(33.33); // 1/3 * 100

    // Check summary
    expect(result.summary.rata_rata_kehadiran).toBe(50); // (66.67 + 33.33) / 2
    expect(result.summary.periode.start).toBeInstanceOf(Date);
    expect(result.summary.periode.end).toBeInstanceOf(Date);
  });

  it('should filter by specific student', async () => {
    const testData = await createTestData();
    
    const filter: AttendanceFilter = {
      siswa_id: testData.siswa1.id
    };
    const result = await generateAttendanceReport(filter);

    expect(result.data).toHaveLength(1);
    expect(result.data[0].siswa_id).toBe(testData.siswa1.id);
    expect(result.data[0].siswa_nama).toBe('Siswa Satu');
    expect(result.summary.total_siswa).toBe(1);
  });

  it('should filter by specific kelas', async () => {
    const testData = await createTestData();
    
    const filter: AttendanceFilter = {
      kelas_id: testData.kelas1.id
    };
    const result = await generateAttendanceReport(filter);

    expect(result.data).toHaveLength(1);
    expect(result.data[0].kelas).toBe('X-A');
    expect(result.data[0].siswa_id).toBe(testData.siswa1.id);
    expect(result.summary.total_siswa).toBe(1);
  });

  it('should filter by date range', async () => {
    const testData = await createTestData();
    
    // Filter for today only
    const filter: AttendanceFilter = {
      tanggal_mulai: testData.dates.today,
      tanggal_selesai: testData.dates.today
    };
    const result = await generateAttendanceReport(filter);

    expect(result.data).toHaveLength(2);
    
    // Both students should have 1 attendance record for today
    result.data.forEach(student => {
      expect(student.total_hadir + student.total_izin + student.total_sakit + student.total_alpha).toBe(1);
      expect(student.persentase_kehadiran).toBe(100); // All records for today are 'hadir'
    });

    expect(result.summary.rata_rata_kehadiran).toBe(100);
    expect(result.summary.periode.start).toEqual(testData.dates.today);
    expect(result.summary.periode.end).toEqual(testData.dates.today);
  });

  it('should filter by attendance status', async () => {
    const testData = await createTestData();
    
    const filter: AttendanceFilter = {
      status: 'hadir'
    };
    const result = await generateAttendanceReport(filter);

    expect(result.data).toHaveLength(2);
    
    // Only 'hadir' records should be counted
    result.data.forEach(student => {
      expect(student.total_izin).toBe(0);
      expect(student.total_sakit).toBe(0);
      expect(student.total_alpha).toBe(0);
    });

    const siswa1Data = result.data.find(d => d.siswa_id === testData.siswa1.id);
    const siswa2Data = result.data.find(d => d.siswa_id === testData.siswa2.id);
    
    expect(siswa1Data!.total_hadir).toBe(2); // Siswa 1 has 2 'hadir' records
    expect(siswa2Data!.total_hadir).toBe(1); // Siswa 2 has 1 'hadir' record
  });

  it('should handle multiple filters correctly', async () => {
    const testData = await createTestData();
    
    const filter: AttendanceFilter = {
      kelas_id: testData.kelas1.id,
      tanggal_mulai: testData.dates.yesterday,
      tanggal_selesai: testData.dates.today,
      status: 'hadir'
    };
    const result = await generateAttendanceReport(filter);

    expect(result.data).toHaveLength(1);
    expect(result.data[0].siswa_id).toBe(testData.siswa1.id);
    expect(result.data[0].total_hadir).toBe(2); // 2 'hadir' records in the date range
    expect(result.data[0].total_izin).toBe(0);
    expect(result.data[0].total_sakit).toBe(0);
    expect(result.data[0].total_alpha).toBe(0);
  });

  it('should handle no matching students', async () => {
    await createTestData();
    
    const filter: AttendanceFilter = {
      siswa_id: 999 // Non-existent student ID
    };
    const result = await generateAttendanceReport(filter);

    expect(result.data).toHaveLength(0);
    expect(result.summary.total_siswa).toBe(0);
    expect(result.summary.rata_rata_kehadiran).toBe(0);
  });

  it('should handle student with no attendance records', async () => {
    // Create a student without attendance records
    const adminUser = await db.insert(usersTable)
      .values({
        username: 'admin',
        password_hash: 'hashed_password',
        role: 'admin'
      })
      .returning()
      .execute();

    const siswaUser = await db.insert(usersTable)
      .values({
        username: '1003',
        password_hash: 'hashed_password',
        role: 'siswa'
      })
      .returning()
      .execute();

    const kelas = await db.insert(kelasTable)
      .values({
        nama_kelas: 'XI-A'
      })
      .returning()
      .execute();

    const siswa = await db.insert(siswaTable)
      .values({
        user_id: siswaUser[0].id,
        nisn: '1003',
        nama: 'Siswa Tanpa Absensi',
        kelas_id: kelas[0].id
      })
      .returning()
      .execute();

    const filter: AttendanceFilter = {
      siswa_id: siswa[0].id
    };
    const result = await generateAttendanceReport(filter);

    expect(result.data).toHaveLength(1);
    expect(result.data[0].siswa_id).toBe(siswa[0].id);
    expect(result.data[0].total_hadir).toBe(0);
    expect(result.data[0].total_izin).toBe(0);
    expect(result.data[0].total_sakit).toBe(0);
    expect(result.data[0].total_alpha).toBe(0);
    expect(result.data[0].persentase_kehadiran).toBe(0);
  });

  it('should calculate percentages correctly with rounding', async () => {
    const testData = await createTestData();
    
    // Create additional attendance records for more precise percentage calculation
    const threeDaysAgo = new Date(testData.dates.today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const fourDaysAgo = new Date(threeDaysAgo.getTime() - 24 * 60 * 60 * 1000);
    const fiveDaysAgo = new Date(threeDaysAgo.getTime() - 2 * 24 * 60 * 60 * 1000);

    // Convert dates to string format for PostgreSQL date columns
    const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];
    const fourDaysAgoStr = fourDaysAgo.toISOString().split('T')[0];
    const fiveDaysAgoStr = fiveDaysAgo.toISOString().split('T')[0];

    await db.insert(absensiTable)
      .values([
        {
          siswa_id: testData.siswa1.id,
          guru_id: testData.guru.id,
          kelas_id: testData.kelas1.id,
          status: 'hadir',
          tanggal: threeDaysAgoStr,
          waktu_masuk: '07:00:00'
        },
        {
          siswa_id: testData.siswa1.id,
          guru_id: testData.guru.id,
          kelas_id: testData.kelas1.id,
          status: 'alpha',
          tanggal: fourDaysAgoStr
        },
        {
          siswa_id: testData.siswa1.id,
          guru_id: testData.guru.id,
          kelas_id: testData.kelas1.id,
          status: 'alpha',
          tanggal: fiveDaysAgoStr
        }
      ])
      .execute();

    const filter: AttendanceFilter = {
      siswa_id: testData.siswa1.id
    };
    const result = await generateAttendanceReport(filter);

    expect(result.data).toHaveLength(1);
    const studentData = result.data[0];
    
    // Total: 3 hadir, 1 izin, 2 alpha = 6 total
    // Percentage: 3/6 * 100 = 50%
    expect(studentData.total_hadir).toBe(3);
    expect(studentData.total_izin).toBe(1);
    expect(studentData.total_alpha).toBe(2);
    expect(studentData.persentase_kehadiran).toBe(50);
  });
});