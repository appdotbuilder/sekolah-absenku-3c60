import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, guruTable, kelasTable } from '../db/schema';
import { type CreateKelasInput, type UpdateKelasInput } from '../schema';
import { 
  createKelas, 
  getKelas, 
  getKelasById, 
  getKelasByWaliKelas, 
  updateKelas, 
  deleteKelas 
} from '../handlers/kelas';
import { eq } from 'drizzle-orm';

describe('Kelas Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test user and guru
  const createTestGuru = async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values({
        username: 'test_guru',
        password_hash: 'hashed_password',
        role: 'guru'
      })
      .returning()
      .execute();

    // Create guru
    const guruResult = await db.insert(guruTable)
      .values({
        user_id: userResult[0].id,
        nip: '123456789',
        nama: 'Test Guru'
      })
      .returning()
      .execute();

    return guruResult[0];
  };

  describe('createKelas', () => {
    it('should create a kelas without wali kelas', async () => {
      const input: CreateKelasInput = {
        nama_kelas: 'XII IPA 1'
      };

      const result = await createKelas(input);

      expect(result.nama_kelas).toEqual('XII IPA 1');
      expect(result.wali_kelas_id).toBeNull();
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should create a kelas with wali kelas', async () => {
      const guru = await createTestGuru();

      const input: CreateKelasInput = {
        nama_kelas: 'XII IPA 2',
        wali_kelas_id: guru.id
      };

      const result = await createKelas(input);

      expect(result.nama_kelas).toEqual('XII IPA 2');
      expect(result.wali_kelas_id).toEqual(guru.id);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save kelas to database', async () => {
      const input: CreateKelasInput = {
        nama_kelas: 'XI IPA 1'
      };

      const result = await createKelas(input);

      const kelasFromDb = await db.select()
        .from(kelasTable)
        .where(eq(kelasTable.id, result.id))
        .execute();

      expect(kelasFromDb).toHaveLength(1);
      expect(kelasFromDb[0].nama_kelas).toEqual('XI IPA 1');
      expect(kelasFromDb[0].wali_kelas_id).toBeNull();
    });

    it('should throw error when wali kelas not found', async () => {
      const input: CreateKelasInput = {
        nama_kelas: 'XII IPA 1',
        wali_kelas_id: 999 // Non-existent guru
      };

      await expect(createKelas(input)).rejects.toThrow(/wali kelas not found/i);
    });

    it('should handle database constraint errors', async () => {
      const input: CreateKelasInput = {
        nama_kelas: 'XII IPA 1'
      };

      await createKelas(input);

      // Try to create duplicate nama_kelas
      await expect(createKelas(input)).rejects.toThrow();
    });
  });

  describe('getKelas', () => {
    it('should return empty array when no kelas exist', async () => {
      const result = await getKelas();
      expect(result).toEqual([]);
    });

    it('should return all kelas records', async () => {
      const guru = await createTestGuru();

      // Create multiple kelas
      await createKelas({ nama_kelas: 'XII IPA 1' });
      await createKelas({ nama_kelas: 'XII IPA 2', wali_kelas_id: guru.id });
      await createKelas({ nama_kelas: 'XI IPS 1' });

      const result = await getKelas();

      expect(result).toHaveLength(3);
      expect(result.map(k => k.nama_kelas)).toContain('XII IPA 1');
      expect(result.map(k => k.nama_kelas)).toContain('XII IPA 2');
      expect(result.map(k => k.nama_kelas)).toContain('XI IPS 1');
    });
  });

  describe('getKelasById', () => {
    it('should return null for non-existent kelas', async () => {
      const result = await getKelasById(999);
      expect(result).toBeNull();
    });

    it('should return kelas by ID', async () => {
      const guru = await createTestGuru();
      const createdKelas = await createKelas({ 
        nama_kelas: 'XII IPA 1', 
        wali_kelas_id: guru.id 
      });

      const result = await getKelasById(createdKelas.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(createdKelas.id);
      expect(result!.nama_kelas).toEqual('XII IPA 1');
      expect(result!.wali_kelas_id).toEqual(guru.id);
    });
  });

  describe('getKelasByWaliKelas', () => {
    it('should return empty array for guru with no classes', async () => {
      const guru = await createTestGuru();
      const result = await getKelasByWaliKelas(guru.id);
      expect(result).toEqual([]);
    });

    it('should return all kelas managed by a guru', async () => {
      const guru = await createTestGuru();

      // Create kelas with this guru as wali kelas
      await createKelas({ nama_kelas: 'XII IPA 1', wali_kelas_id: guru.id });
      await createKelas({ nama_kelas: 'XII IPA 2', wali_kelas_id: guru.id });
      
      // Create kelas without wali kelas (should not be included)
      await createKelas({ nama_kelas: 'XI IPS 1' });

      const result = await getKelasByWaliKelas(guru.id);

      expect(result).toHaveLength(2);
      expect(result.map(k => k.nama_kelas)).toContain('XII IPA 1');
      expect(result.map(k => k.nama_kelas)).toContain('XII IPA 2');
      expect(result.every(k => k.wali_kelas_id === guru.id)).toBe(true);
    });
  });

  describe('updateKelas', () => {
    it('should return null for non-existent kelas', async () => {
      const input: UpdateKelasInput = {
        id: 999,
        nama_kelas: 'Updated Class'
      };

      const result = await updateKelas(input);
      expect(result).toBeNull();
    });

    it('should update nama_kelas only', async () => {
      const guru = await createTestGuru();
      const createdKelas = await createKelas({ 
        nama_kelas: 'XII IPA 1', 
        wali_kelas_id: guru.id 
      });

      const input: UpdateKelasInput = {
        id: createdKelas.id,
        nama_kelas: 'XII IPA 1 Updated'
      };

      const result = await updateKelas(input);

      expect(result).not.toBeNull();
      expect(result!.nama_kelas).toEqual('XII IPA 1 Updated');
      expect(result!.wali_kelas_id).toEqual(guru.id); // Should remain unchanged
      expect(result!.updated_at.getTime()).toBeGreaterThan(result!.created_at.getTime());
    });

    it('should update wali_kelas_id only', async () => {
      const guru1 = await createTestGuru();
      
      // Create second guru
      const userResult2 = await db.insert(usersTable)
        .values({
          username: 'test_guru_2',
          password_hash: 'hashed_password',
          role: 'guru'
        })
        .returning()
        .execute();

      const guru2 = await db.insert(guruTable)
        .values({
          user_id: userResult2[0].id,
          nip: '987654321',
          nama: 'Test Guru 2'
        })
        .returning()
        .execute();

      const createdKelas = await createKelas({ 
        nama_kelas: 'XII IPA 1', 
        wali_kelas_id: guru1.id 
      });

      const input: UpdateKelasInput = {
        id: createdKelas.id,
        wali_kelas_id: guru2[0].id
      };

      const result = await updateKelas(input);

      expect(result).not.toBeNull();
      expect(result!.nama_kelas).toEqual('XII IPA 1'); // Should remain unchanged
      expect(result!.wali_kelas_id).toEqual(guru2[0].id);
    });

    it('should update both fields', async () => {
      const guru = await createTestGuru();
      const createdKelas = await createKelas({ nama_kelas: 'XII IPA 1' });

      const input: UpdateKelasInput = {
        id: createdKelas.id,
        nama_kelas: 'XII IPA 1 Updated',
        wali_kelas_id: guru.id
      };

      const result = await updateKelas(input);

      expect(result).not.toBeNull();
      expect(result!.nama_kelas).toEqual('XII IPA 1 Updated');
      expect(result!.wali_kelas_id).toEqual(guru.id);
    });

    it('should set wali_kelas_id to null', async () => {
      const guru = await createTestGuru();
      const createdKelas = await createKelas({ 
        nama_kelas: 'XII IPA 1', 
        wali_kelas_id: guru.id 
      });

      const input: UpdateKelasInput = {
        id: createdKelas.id,
        wali_kelas_id: null
      };

      const result = await updateKelas(input);

      expect(result).not.toBeNull();
      expect(result!.wali_kelas_id).toBeNull();
    });

    it('should throw error when wali kelas not found', async () => {
      const createdKelas = await createKelas({ nama_kelas: 'XII IPA 1' });

      const input: UpdateKelasInput = {
        id: createdKelas.id,
        wali_kelas_id: 999 // Non-existent guru
      };

      await expect(updateKelas(input)).rejects.toThrow(/wali kelas not found/i);
    });
  });

  describe('deleteKelas', () => {
    it('should return false for non-existent kelas', async () => {
      const result = await deleteKelas(999);
      expect(result).toBe(false);
    });

    it('should delete existing kelas', async () => {
      const createdKelas = await createKelas({ nama_kelas: 'XII IPA 1' });

      const result = await deleteKelas(createdKelas.id);
      expect(result).toBe(true);

      // Verify kelas is deleted from database
      const kelasFromDb = await getKelasById(createdKelas.id);
      expect(kelasFromDb).toBeNull();
    });

    it('should delete kelas with wali kelas', async () => {
      const guru = await createTestGuru();
      const createdKelas = await createKelas({ 
        nama_kelas: 'XII IPA 1', 
        wali_kelas_id: guru.id 
      });

      const result = await deleteKelas(createdKelas.id);
      expect(result).toBe(true);

      // Verify kelas is deleted but guru remains
      const kelasFromDb = await getKelasById(createdKelas.id);
      expect(kelasFromDb).toBeNull();

      const guruFromDb = await db.select()
        .from(guruTable)
        .where(eq(guruTable.id, guru.id))
        .execute();
      expect(guruFromDb).toHaveLength(1);
    });
  });
});