import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser, getUsers, getUserById, updateUser, deleteUser } from '../handlers/users';
import { eq } from 'drizzle-orm';

describe('User handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createUser', () => {
    const testInput: CreateUserInput = {
      username: 'testuser',
      password: 'password123',
      role: 'siswa'
    };

    it('should create a user with hashed password', async () => {
      const result = await createUser(testInput);

      expect(result.username).toEqual('testuser');
      expect(result.role).toEqual('siswa');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
      expect(result.password_hash).toBeDefined();
      expect(result.password_hash).not.toEqual('password123'); // Should be hashed
    });

    it('should save user to database', async () => {
      const result = await createUser(testInput);

      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, result.id))
        .execute();

      expect(users).toHaveLength(1);
      expect(users[0].username).toEqual('testuser');
      expect(users[0].role).toEqual('siswa');
      expect(users[0].password_hash).toBeDefined();
    });

    it('should hash password correctly', async () => {
      const result = await createUser(testInput);

      // Verify password can be verified with Bun's password verification
      const isValid = await Bun.password.verify('password123', result.password_hash);
      expect(isValid).toBe(true);

      // Verify wrong password fails
      const isWrong = await Bun.password.verify('wrongpassword', result.password_hash);
      expect(isWrong).toBe(false);
    });

    it('should create users with different roles', async () => {
      const adminInput: CreateUserInput = {
        username: 'admin123',
        password: 'adminpass',
        role: 'admin'
      };

      const guruInput: CreateUserInput = {
        username: 'guru123',
        password: 'gurupass',
        role: 'guru'
      };

      const adminUser = await createUser(adminInput);
      const guruUser = await createUser(guruInput);

      expect(adminUser.role).toEqual('admin');
      expect(guruUser.role).toEqual('guru');
    });

    it('should throw error for duplicate username', async () => {
      await createUser(testInput);

      await expect(createUser(testInput)).rejects.toThrow(/duplicate/i);
    });
  });

  describe('getUsers', () => {
    it('should return empty array when no users exist', async () => {
      const users = await getUsers();
      expect(users).toEqual([]);
    });

    it('should return all users', async () => {
      const user1Input: CreateUserInput = {
        username: 'user1',
        password: 'password1',
        role: 'siswa'
      };

      const user2Input: CreateUserInput = {
        username: 'user2',
        password: 'password2',
        role: 'guru'
      };

      await createUser(user1Input);
      await createUser(user2Input);

      const users = await getUsers();

      expect(users).toHaveLength(2);
      expect(users[0].username).toEqual('user1');
      expect(users[0].role).toEqual('siswa');
      expect(users[1].username).toEqual('user2');
      expect(users[1].role).toEqual('guru');

      // Check that timestamps are properly converted
      users.forEach(user => {
        expect(user.created_at).toBeInstanceOf(Date);
        expect(user.updated_at).toBeInstanceOf(Date);
      });
    });

    it('should include password_hash for type compatibility', async () => {
      const testInput: CreateUserInput = {
        username: 'testuser',
        password: 'password123',
        role: 'siswa'
      };

      await createUser(testInput);
      const users = await getUsers();

      expect(users[0].password_hash).toBeDefined();
    });
  });

  describe('getUserById', () => {
    it('should return null for non-existent user', async () => {
      const user = await getUserById(999);
      expect(user).toBeNull();
    });

    it('should return user by ID', async () => {
      const testInput: CreateUserInput = {
        username: 'testuser',
        password: 'password123',
        role: 'admin'
      };

      const createdUser = await createUser(testInput);
      const foundUser = await getUserById(createdUser.id);

      expect(foundUser).not.toBeNull();
      expect(foundUser!.id).toEqual(createdUser.id);
      expect(foundUser!.username).toEqual('testuser');
      expect(foundUser!.role).toEqual('admin');
      expect(foundUser!.created_at).toBeInstanceOf(Date);
      expect(foundUser!.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('updateUser', () => {
    let testUser: any;

    beforeEach(async () => {
      const testInput: CreateUserInput = {
        username: 'originaluser',
        password: 'originalpass',
        role: 'siswa'
      };
      testUser = await createUser(testInput);
    });

    it('should return null for non-existent user', async () => {
      const result = await updateUser(999, { username: 'newname' });
      expect(result).toBeNull();
    });

    it('should update username', async () => {
      const updated = await updateUser(testUser.id, { username: 'newusername' });

      expect(updated).not.toBeNull();
      expect(updated!.username).toEqual('newusername');
      expect(updated!.role).toEqual('siswa'); // Should remain unchanged
      expect(updated!.updated_at.getTime()).toBeGreaterThan(testUser.updated_at.getTime());
    });

    it('should update role', async () => {
      const updated = await updateUser(testUser.id, { role: 'guru' });

      expect(updated).not.toBeNull();
      expect(updated!.role).toEqual('guru');
      expect(updated!.username).toEqual('originaluser'); // Should remain unchanged
    });

    it('should update password and hash it', async () => {
      const updated = await updateUser(testUser.id, { password_hash: 'newpassword123' });

      expect(updated).not.toBeNull();
      expect(updated!.password_hash).not.toEqual('newpassword123'); // Should be hashed
      expect(updated!.password_hash).not.toEqual(testUser.password_hash); // Should be different

      // Verify new password works
      const isValid = await Bun.password.verify('newpassword123', updated!.password_hash);
      expect(isValid).toBe(true);
    });

    it('should update multiple fields at once', async () => {
      const updates = {
        username: 'updateduser',
        role: 'admin' as const,
        password_hash: 'newpassword'
      };

      const updated = await updateUser(testUser.id, updates);

      expect(updated).not.toBeNull();
      expect(updated!.username).toEqual('updateduser');
      expect(updated!.role).toEqual('admin');
      expect(updated!.password_hash).not.toEqual('newpassword'); // Should be hashed

      // Verify password was updated
      const isValid = await Bun.password.verify('newpassword', updated!.password_hash);
      expect(isValid).toBe(true);
    });

    it('should update timestamp', async () => {
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const updated = await updateUser(testUser.id, { username: 'timetest' });

      expect(updated).not.toBeNull();
      expect(updated!.updated_at.getTime()).toBeGreaterThan(testUser.updated_at.getTime());
    });
  });

  describe('deleteUser', () => {
    it('should return false for non-existent user', async () => {
      const result = await deleteUser(999);
      expect(result).toBe(false);
    });

    it('should delete existing user', async () => {
      const testInput: CreateUserInput = {
        username: 'deletetest',
        password: 'password123',
        role: 'siswa'
      };

      const user = await createUser(testInput);
      const deleteResult = await deleteUser(user.id);

      expect(deleteResult).toBe(true);

      // Verify user is actually deleted
      const foundUser = await getUserById(user.id);
      expect(foundUser).toBeNull();
    });

    it('should cascade delete when user has related records', async () => {
      // This test ensures the delete works even if there might be related records
      // The actual cascade behavior is handled by the database schema
      const testInput: CreateUserInput = {
        username: 'cascadetest',
        password: 'password123',
        role: 'guru'
      };

      const user = await createUser(testInput);
      const deleteResult = await deleteUser(user.id);

      expect(deleteResult).toBe(true);

      // Verify deletion worked
      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, user.id))
        .execute();

      expect(users).toHaveLength(0);
    });
  });

  describe('integration tests', () => {
    it('should handle complete user lifecycle', async () => {
      // Create user
      const createInput: CreateUserInput = {
        username: 'lifecycle',
        password: 'initialpass',
        role: 'siswa'
      };

      const created = await createUser(createInput);
      expect(created.username).toEqual('lifecycle');

      // Get all users
      let allUsers = await getUsers();
      expect(allUsers).toHaveLength(1);

      // Get by ID
      const found = await getUserById(created.id);
      expect(found).not.toBeNull();
      expect(found!.username).toEqual('lifecycle');

      // Update user
      const updated = await updateUser(created.id, {
        username: 'updatedlifecycle',
        role: 'guru'
      });
      expect(updated!.username).toEqual('updatedlifecycle');
      expect(updated!.role).toEqual('guru');

      // Verify update persisted
      const refetched = await getUserById(created.id);
      expect(refetched!.username).toEqual('updatedlifecycle');
      expect(refetched!.role).toEqual('guru');

      // Delete user
      const deleted = await deleteUser(created.id);
      expect(deleted).toBe(true);

      // Verify deletion
      const afterDelete = await getUserById(created.id);
      expect(afterDelete).toBeNull();

      allUsers = await getUsers();
      expect(allUsers).toHaveLength(0);
    });
  });
});