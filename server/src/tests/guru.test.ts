import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, guruTable } from '../db/schema';
import { type CreateGuruInput, type UpdateGuruInput, type UpdateProfileInput } from '../schema';
import { 
  createGuru, 
  getGuru, 
  getGuruById, 
  getGuruByUserId, 
  updateGuru, 
  updateGuruProfile, 
  deleteGuru 
} from '../handlers/guru';
import { eq } from 'drizzle-orm';

describe('Guru Handler', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test user
  async function createTestUser(role: 'guru' | 'admin' = 'guru', usernameOverride?: string) {
    const username = usernameOverride || `${role}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const result = await db.insert(usersTable)
      .values({
        username: username,
        password_hash: 'hashed_password_123',
        role: role
      })
      .returning()
      .execute();
    return result[0];
  }

  describe('createGuru', () => {
    it('should create a guru with valid user_id', async () => {
      const user = await createTestUser('guru');
      
      const input: CreateGuruInput = {
        user_id: user.id,
        nip: '123456789',
        nama: 'Test Guru',
        foto: 'photo.jpg'
      };

      const result = await createGuru(input);

      expect(result.user_id).toEqual(user.id);
      expect(result.nip).toEqual('123456789');
      expect(result.nama).toEqual('Test Guru');
      expect(result.foto).toEqual('photo.jpg');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should create a guru without foto (nullable)', async () => {
      const user = await createTestUser('guru');
      
      const input: CreateGuruInput = {
        user_id: user.id,
        nip: '123456789',
        nama: 'Test Guru'
      };

      const result = await createGuru(input);

      expect(result.foto).toBeNull();
      expect(result.nama).toEqual('Test Guru');
    });

    it('should throw error for non-existent user_id', async () => {
      const input: CreateGuruInput = {
        user_id: 999,
        nip: '123456789',
        nama: 'Test Guru'
      };

      await expect(createGuru(input)).rejects.toThrow(/user not found/i);
    });

    it('should throw error for non-guru user', async () => {
      const user = await createTestUser('admin');
      
      const input: CreateGuruInput = {
        user_id: user.id,
        nip: '123456789',
        nama: 'Test Guru'
      };

      await expect(createGuru(input)).rejects.toThrow(/user is not a guru/i);
    });

    it('should save guru to database', async () => {
      const user = await createTestUser('guru');
      
      const input: CreateGuruInput = {
        user_id: user.id,
        nip: '123456789',
        nama: 'Test Guru',
        foto: 'photo.jpg'
      };

      const result = await createGuru(input);

      const savedGuru = await db.select()
        .from(guruTable)
        .where(eq(guruTable.id, result.id))
        .execute();

      expect(savedGuru).toHaveLength(1);
      expect(savedGuru[0].nip).toEqual('123456789');
      expect(savedGuru[0].nama).toEqual('Test Guru');
      expect(savedGuru[0].user_id).toEqual(user.id);
    });
  });

  describe('getGuru', () => {
    it('should return empty array when no guru exist', async () => {
      const result = await getGuru();
      expect(result).toEqual([]);
    });

    it('should return all guru records', async () => {
      const user1 = await createTestUser('guru');
      const user2 = await createTestUser('guru');

      await createGuru({
        user_id: user1.id,
        nip: '123456789',
        nama: 'Guru One'
      });

      await createGuru({
        user_id: user2.id,
        nip: '987654321',
        nama: 'Guru Two'
      });

      const result = await getGuru();

      expect(result).toHaveLength(2);
      expect(result[0].nama).toEqual('Guru One');
      expect(result[1].nama).toEqual('Guru Two');
    });
  });

  describe('getGuruById', () => {
    it('should return guru by valid ID', async () => {
      const user = await createTestUser('guru');
      const createdGuru = await createGuru({
        user_id: user.id,
        nip: '123456789',
        nama: 'Test Guru'
      });

      const result = await getGuruById(createdGuru.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(createdGuru.id);
      expect(result!.nama).toEqual('Test Guru');
      expect(result!.nip).toEqual('123456789');
    });

    it('should return null for non-existent ID', async () => {
      const result = await getGuruById(999);
      expect(result).toBeNull();
    });
  });

  describe('getGuruByUserId', () => {
    it('should return guru by valid user_id', async () => {
      const user = await createTestUser('guru');
      await createGuru({
        user_id: user.id,
        nip: '123456789',
        nama: 'Test Guru'
      });

      const result = await getGuruByUserId(user.id);

      expect(result).not.toBeNull();
      expect(result!.user_id).toEqual(user.id);
      expect(result!.nama).toEqual('Test Guru');
    });

    it('should return null for non-existent user_id', async () => {
      const result = await getGuruByUserId(999);
      expect(result).toBeNull();
    });
  });

  describe('updateGuru', () => {
    it('should update guru with all fields', async () => {
      const user = await createTestUser('guru');
      const createdGuru = await createGuru({
        user_id: user.id,
        nip: '123456789',
        nama: 'Original Name'
      });

      const input: UpdateGuruInput = {
        id: createdGuru.id,
        nip: '987654321',
        nama: 'Updated Name',
        foto: 'updated.jpg'
      };

      const result = await updateGuru(input);

      expect(result).not.toBeNull();
      expect(result!.nip).toEqual('987654321');
      expect(result!.nama).toEqual('Updated Name');
      expect(result!.foto).toEqual('updated.jpg');
      expect(result!.updated_at.getTime()).toBeGreaterThan(result!.created_at.getTime());
    });

    it('should update guru with partial fields', async () => {
      const user = await createTestUser('guru');
      const createdGuru = await createGuru({
        user_id: user.id,
        nip: '123456789',
        nama: 'Original Name',
        foto: 'original.jpg'
      });

      const input: UpdateGuruInput = {
        id: createdGuru.id,
        nama: 'Updated Name Only'
      };

      const result = await updateGuru(input);

      expect(result).not.toBeNull();
      expect(result!.nip).toEqual('123456789'); // Should remain unchanged
      expect(result!.nama).toEqual('Updated Name Only');
      expect(result!.foto).toEqual('original.jpg'); // Should remain unchanged
    });

    it('should return null for non-existent guru ID', async () => {
      const input: UpdateGuruInput = {
        id: 999,
        nama: 'Updated Name'
      };

      const result = await updateGuru(input);
      expect(result).toBeNull();
    });

    it('should update foto to null', async () => {
      const user = await createTestUser('guru');
      const createdGuru = await createGuru({
        user_id: user.id,
        nip: '123456789',
        nama: 'Test Guru',
        foto: 'original.jpg'
      });

      const input: UpdateGuruInput = {
        id: createdGuru.id,
        foto: null
      };

      const result = await updateGuru(input);

      expect(result).not.toBeNull();
      expect(result!.foto).toBeNull();
    });
  });

  describe('updateGuruProfile', () => {
    it('should update guru profile by user_id', async () => {
      const user = await createTestUser('guru');
      await createGuru({
        user_id: user.id,
        nip: '123456789',
        nama: 'Original Name'
      });

      const input: UpdateProfileInput = {
        user_id: user.id,
        nama: 'Updated Profile Name',
        foto: 'profile.jpg'
      };

      const result = await updateGuruProfile(input);

      expect(result).not.toBeNull();
      expect(result!.nama).toEqual('Updated Profile Name');
      expect(result!.foto).toEqual('profile.jpg');
      expect(result!.nip).toEqual('123456789'); // Should remain unchanged
    });

    it('should update guru profile with partial fields', async () => {
      const user = await createTestUser('guru');
      await createGuru({
        user_id: user.id,
        nip: '123456789',
        nama: 'Original Name',
        foto: 'original.jpg'
      });

      const input: UpdateProfileInput = {
        user_id: user.id,
        nama: 'Updated Name Only'
      };

      const result = await updateGuruProfile(input);

      expect(result).not.toBeNull();
      expect(result!.nama).toEqual('Updated Name Only');
      expect(result!.foto).toEqual('original.jpg'); // Should remain unchanged
    });

    it('should throw error for non-existent user_id', async () => {
      const input: UpdateProfileInput = {
        user_id: 999,
        nama: 'Updated Name'
      };

      await expect(updateGuruProfile(input)).rejects.toThrow(/guru not found for this user/i);
    });
  });

  describe('deleteGuru', () => {
    it('should delete existing guru', async () => {
      const user = await createTestUser('guru');
      const createdGuru = await createGuru({
        user_id: user.id,
        nip: '123456789',
        nama: 'Test Guru'
      });

      const result = await deleteGuru(createdGuru.id);

      expect(result).toBe(true);

      // Verify guru is deleted
      const deletedGuru = await getGuruById(createdGuru.id);
      expect(deletedGuru).toBeNull();
    });

    it('should return false for non-existent guru ID', async () => {
      const result = await deleteGuru(999);
      expect(result).toBe(false);
    });

    it('should delete guru from database', async () => {
      const user = await createTestUser('guru');
      const createdGuru = await createGuru({
        user_id: user.id,
        nip: '123456789',
        nama: 'Test Guru'
      });

      await deleteGuru(createdGuru.id);

      const remainingGuru = await db.select()
        .from(guruTable)
        .where(eq(guruTable.id, createdGuru.id))
        .execute();

      expect(remainingGuru).toHaveLength(0);
    });
  });
});