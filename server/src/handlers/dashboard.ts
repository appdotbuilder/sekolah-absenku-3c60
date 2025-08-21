import { db } from '../db';
import { usersTable, guruTable, kelasTable, siswaTable, absensiTable } from '../db/schema';
import { type DashboardStats } from '../schema';
import { count, eq, and, gte, lte, sql, inArray } from 'drizzle-orm';

export async function getDashboardStats(): Promise<DashboardStats> {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        // Get total counts
        const [totalSiswaResult] = await db.select({ count: count() }).from(siswaTable);
        const [totalGuruResult] = await db.select({ count: count() }).from(guruTable);
        const [totalKelasResult] = await db.select({ count: count() }).from(kelasTable);

        // Get today's attendance by status
        const todayAttendance = await db.select({
            status: absensiTable.status,
            count: count()
        })
        .from(absensiTable)
        .where(eq(absensiTable.tanggal, todayStr))
        .groupBy(absensiTable.status);

        // Initialize attendance counts
        const absensiHariIni = {
            hadir: 0,
            izin: 0,
            sakit: 0,
            alpha: 0,
            pending: 0
        };

        // Fill in actual counts
        todayAttendance.forEach(item => {
            absensiHariIni[item.status] = item.count;
        });

        // Calculate attendance percentage for current month
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        const startDateStr = startOfMonth.toISOString().split('T')[0];
        const endDateStr = endOfMonth.toISOString().split('T')[0];

        const [monthlyAttendanceResult] = await db.select({
            total: count(),
            hadir: sql<number>`CAST(SUM(CASE WHEN ${absensiTable.status} = 'hadir' THEN 1 ELSE 0 END) AS INTEGER)`
        })
        .from(absensiTable)
        .where(and(
            gte(absensiTable.tanggal, startDateStr),
            lte(absensiTable.tanggal, endDateStr)
        ));

        const persentaseKehadiran = monthlyAttendanceResult.total > 0 
            ? Math.round((monthlyAttendanceResult.hadir / monthlyAttendanceResult.total) * 100)
            : 0;

        return {
            total_siswa: totalSiswaResult.count,
            total_guru: totalGuruResult.count,
            total_kelas: totalKelasResult.count,
            absensi_hari_ini: absensiHariIni,
            persentase_kehadiran: persentaseKehadiran
        };
    } catch (error) {
        console.error('Get dashboard stats failed:', error);
        throw error;
    }
}

export async function getDashboardStatsGuru(guruId: number): Promise<DashboardStats> {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        // Get classes managed by this guru
        const managedClasses = await db.select({ id: kelasTable.id })
            .from(kelasTable)
            .where(eq(kelasTable.wali_kelas_id, guruId));

        const managedClassIds = managedClasses.map(kelas => kelas.id);

        if (managedClassIds.length === 0) {
            return {
                total_siswa: 0,
                total_guru: 1,
                total_kelas: 0,
                absensi_hari_ini: {
                    hadir: 0,
                    izin: 0,
                    sakit: 0,
                    alpha: 0,
                    pending: 0
                },
                persentase_kehadiran: 0
            };
        }

        // Get total siswa in managed classes
        const [totalSiswaResult] = await db.select({ count: count() })
            .from(siswaTable)
            .where(inArray(siswaTable.kelas_id, managedClassIds));

        // Get today's attendance for managed classes
        const todayAttendance = await db.select({
            status: absensiTable.status,
            count: count()
        })
        .from(absensiTable)
        .where(and(
            eq(absensiTable.tanggal, todayStr),
            inArray(absensiTable.kelas_id, managedClassIds)
        ))
        .groupBy(absensiTable.status);

        // Initialize attendance counts
        const absensiHariIni = {
            hadir: 0,
            izin: 0,
            sakit: 0,
            alpha: 0,
            pending: 0
        };

        // Fill in actual counts
        todayAttendance.forEach(item => {
            absensiHariIni[item.status] = item.count;
        });

        // Calculate attendance percentage for current month in managed classes
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        const startDateStr = startOfMonth.toISOString().split('T')[0];
        const endDateStr = endOfMonth.toISOString().split('T')[0];

        const [monthlyAttendanceResult] = await db.select({
            total: count(),
            hadir: sql<number>`CAST(SUM(CASE WHEN ${absensiTable.status} = 'hadir' THEN 1 ELSE 0 END) AS INTEGER)`
        })
        .from(absensiTable)
        .where(and(
            gte(absensiTable.tanggal, startDateStr),
            lte(absensiTable.tanggal, endDateStr),
            inArray(absensiTable.kelas_id, managedClassIds)
        ));

        const persentaseKehadiran = monthlyAttendanceResult.total > 0 
            ? Math.round((monthlyAttendanceResult.hadir / monthlyAttendanceResult.total) * 100)
            : 0;

        return {
            total_siswa: totalSiswaResult.count,
            total_guru: 1, // Just the current guru
            total_kelas: managedClassIds.length,
            absensi_hari_ini: absensiHariIni,
            persentase_kehadiran: persentaseKehadiran
        };
    } catch (error) {
        console.error('Get guru dashboard stats failed:', error);
        throw error;
    }
}

export async function getDashboardStatsSiswa(siswaId: number): Promise<{
    total_hadir: number;
    total_izin: number;
    total_sakit: number;
    total_alpha: number;
    persentase_kehadiran: number;
    absensi_bulan_ini: number;
    status_hari_ini: 'hadir' | 'izin' | 'sakit' | 'alpha' | 'belum_absen';
}> {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        // Get overall attendance stats for this siswa
        const attendanceStats = await db.select({
            status: absensiTable.status,
            count: count()
        })
        .from(absensiTable)
        .where(eq(absensiTable.siswa_id, siswaId))
        .groupBy(absensiTable.status);

        // Initialize counts
        let totalHadir = 0;
        let totalIzin = 0;
        let totalSakit = 0;
        let totalAlpha = 0;

        // Fill in actual counts
        attendanceStats.forEach(item => {
            switch (item.status) {
                case 'hadir':
                    totalHadir = item.count;
                    break;
                case 'izin':
                    totalIzin = item.count;
                    break;
                case 'sakit':
                    totalSakit = item.count;
                    break;
                case 'alpha':
                    totalAlpha = item.count;
                    break;
            }
        });

        // Calculate attendance percentage (hadir / total attendance records)
        const totalRecords = totalHadir + totalIzin + totalSakit + totalAlpha;
        const persentaseKehadiran = totalRecords > 0 
            ? Math.round((totalHadir / totalRecords) * 100)
            : 0;

        // Get current month's attendance count
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        const startDateStr = startOfMonth.toISOString().split('T')[0];
        const endDateStr = endOfMonth.toISOString().split('T')[0];

        const [monthlyAttendanceResult] = await db.select({ count: count() })
            .from(absensiTable)
            .where(and(
                eq(absensiTable.siswa_id, siswaId),
                gte(absensiTable.tanggal, startDateStr),
                lte(absensiTable.tanggal, endDateStr)
            ));

        // Get today's attendance status
        const todayAttendance = await db.select({ status: absensiTable.status })
            .from(absensiTable)
            .where(and(
                eq(absensiTable.siswa_id, siswaId),
                eq(absensiTable.tanggal, todayStr)
            ))
            .limit(1);

        const statusHariIni: 'hadir' | 'izin' | 'sakit' | 'alpha' | 'belum_absen' = todayAttendance.length > 0 
            ? (todayAttendance[0].status === 'pending' ? 'belum_absen' : todayAttendance[0].status)
            : 'belum_absen';

        return {
            total_hadir: totalHadir,
            total_izin: totalIzin,
            total_sakit: totalSakit,
            total_alpha: totalAlpha,
            persentase_kehadiran: persentaseKehadiran,
            absensi_bulan_ini: monthlyAttendanceResult.count,
            status_hari_ini: statusHariIni
        };
    } catch (error) {
        console.error('Get siswa dashboard stats failed:', error);
        throw error;
    }
}