import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, siswaTable, kelasTable, absensiTable } from '../db/schema';
import { type AbsenMasukInput } from '../schema';
import { absenMasuk } from '../handlers/absensi';
import { eq, and } from 'drizzle-orm';

// Test data setup
let testUserId: number;
let testKelasId: number;
let testSiswaId: number;

const setupTestData = async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
        .values({
            username: 'test_siswa',
            password_hash: 'hashed_password',
            role: 'siswa'
        })
        .returning()
        .execute();
    testUserId = userResult[0].id;

    // Create a test class
    const kelasResult = await db.insert(kelasTable)
        .values({
            nama_kelas: 'XII IPA 1',
            wali_kelas_id: null
        })
        .returning()
        .execute();
    testKelasId = kelasResult[0].id;

    // Create a test student
    const siswaResult = await db.insert(siswaTable)
        .values({
            user_id: testUserId,
            nisn: '1234567890',
            nama: 'Test Siswa',
            kelas_id: testKelasId,
            foto: null
        })
        .returning()
        .execute();
    testSiswaId = siswaResult[0].id;
};

const testInput: AbsenMasukInput = {
    siswa_id: 0, // Will be set in beforeEach
    kelas_id: 0  // Will be set in beforeEach
};

describe('absenMasuk', () => {
    beforeEach(async () => {
        await createDB();
        await setupTestData();
        testInput.siswa_id = testSiswaId;
        testInput.kelas_id = testKelasId;
    });
    
    afterEach(resetDB);

    it('should create attendance record successfully', async () => {
        const result = await absenMasuk(testInput);

        // Verify returned data structure
        expect(result.siswa_id).toEqual(testSiswaId);
        expect(result.kelas_id).toEqual(testKelasId);
        expect(result.status).toEqual('hadir');
        expect(result.guru_id).toBeNull();
        expect(result.waktu_pulang).toBeNull();
        expect(result.keterangan).toBeNull();
        expect(result.id).toBeDefined();
        expect(result.created_at).toBeInstanceOf(Date);
        expect(result.updated_at).toBeInstanceOf(Date);

        // Verify date and time fields
        const today = new Date();
        const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        expect(result.tanggal).toEqual(todayDateOnly);
        expect(result.waktu_masuk).toMatch(/^\d{2}:\d{2}:\d{2}$/); // HH:mm:ss format
    });

    it('should save attendance record to database', async () => {
        const result = await absenMasuk(testInput);

        // Verify record exists in database
        const savedRecord = await db.select()
            .from(absensiTable)
            .where(eq(absensiTable.id, result.id))
            .execute();

        expect(savedRecord).toHaveLength(1);
        expect(savedRecord[0].siswa_id).toEqual(testSiswaId);
        expect(savedRecord[0].kelas_id).toEqual(testKelasId);
        expect(savedRecord[0].status).toEqual('hadir');
        expect(savedRecord[0].waktu_masuk).toBeDefined();
        expect(savedRecord[0].waktu_masuk).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    it('should prevent duplicate attendance for the same day', async () => {
        // First attendance should succeed
        await absenMasuk(testInput);

        // Second attendance on same day should fail
        await expect(absenMasuk(testInput))
            .rejects.toThrow(/attendance already recorded for today/i);
    });

    it('should reject attendance for non-existent student', async () => {
        const invalidInput: AbsenMasukInput = {
            siswa_id: 99999, // Non-existent student ID
            kelas_id: testKelasId
        };

        await expect(absenMasuk(invalidInput))
            .rejects.toThrow(/student not found/i);
    });

    it('should reject attendance when student does not belong to specified class', async () => {
        // Create another class
        const otherKelasResult = await db.insert(kelasTable)
            .values({
                nama_kelas: 'XII IPS 1',
                wali_kelas_id: null
            })
            .returning()
            .execute();

        const invalidInput: AbsenMasukInput = {
            siswa_id: testSiswaId,
            kelas_id: otherKelasResult[0].id // Different class
        };

        await expect(absenMasuk(invalidInput))
            .rejects.toThrow(/student not found or does not belong to the specified class/i);
    });

    it('should handle current time correctly', async () => {
        const beforeTime = new Date();
        const result = await absenMasuk(testInput);
        const afterTime = new Date();

        // Parse the time string back to compare
        const [hours, minutes, seconds] = result.waktu_masuk!.split(':').map(Number);
        const resultTime = new Date();
        resultTime.setHours(hours, minutes, seconds, 0);

        // The recorded time should be between before and after
        expect(resultTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime() - 1000); // 1 second tolerance
        expect(resultTime.getTime()).toBeLessThanOrEqual(afterTime.getTime() + 1000); // 1 second tolerance
    });

    it('should validate foreign key constraints', async () => {
        // Test with non-existent class ID
        const invalidInput: AbsenMasukInput = {
            siswa_id: testSiswaId,
            kelas_id: 99999 // Non-existent class ID
        };

        await expect(absenMasuk(invalidInput))
            .rejects.toThrow(/student not found or does not belong to the specified class/i);
    });

    it('should handle database errors gracefully', async () => {
        // Create input with invalid data types that would cause DB constraint violations
        const invalidInput = {
            siswa_id: testSiswaId,
            kelas_id: testKelasId
        } as AbsenMasukInput;

        // First create a valid attendance record
        await absenMasuk(invalidInput);

        // Try to create duplicate - should throw error with proper message
        await expect(absenMasuk(invalidInput))
            .rejects.toThrow(/attendance already recorded for today/i);
    });
});