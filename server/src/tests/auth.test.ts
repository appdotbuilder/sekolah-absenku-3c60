import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import crypto from 'crypto';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type CreateUserInput } from '../schema';
import { login, logout, getCurrentUser } from '../handlers/auth';
import { eq } from 'drizzle-orm';

// Password hashing helper functions
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

function createPasswordHash(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);
  return salt + hash;
}

// Test data
const testUserInput: CreateUserInput = {
  username: 'testuser',
  password: 'testpassword123',
  full_name: 'Test User',
  email: 'test@example.com',
  role: 'student'
};

const testTeacherInput: CreateUserInput = {
  username: 'teacher001',
  password: 'teacherpass456',
  full_name: 'Jane Teacher',
  email: 'jane@school.com',
  role: 'teacher'
};

const testAdminInput: CreateUserInput = {
  username: 'admin',
  password: 'adminpass789',
  full_name: 'Admin User',
  email: 'admin@school.com',
  role: 'administrator'
};

async function createTestUser(userData: CreateUserInput) {
  const passwordHash = createPasswordHash(userData.password);
  
  const result = await db.insert(usersTable)
    .values({
      username: userData.username,
      password_hash: passwordHash,
      full_name: userData.full_name,
      email: userData.email,
      role: userData.role,
      is_active: true
    })
    .returning()
    .execute();

  return result[0];
}

describe('Authentication Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      // Create test user
      const user = await createTestUser(testUserInput);
      
      const loginInput: LoginInput = {
        username: testUserInput.username,
        password: testUserInput.password
      };

      const result = await login(loginInput);

      expect(result.user_id).toBe(user.id);
      expect(result.username).toBe(testUserInput.username);
      expect(result.role).toBe(testUserInput.role);
      expect(result.full_name).toBe(testUserInput.full_name);
    });

    it('should login different user roles successfully', async () => {
      // Create teacher user
      const teacher = await createTestUser(testTeacherInput);
      
      const loginInput: LoginInput = {
        username: testTeacherInput.username,
        password: testTeacherInput.password
      };

      const result = await login(loginInput);

      expect(result.user_id).toBe(teacher.id);
      expect(result.username).toBe(testTeacherInput.username);
      expect(result.role).toBe('teacher');
      expect(result.full_name).toBe(testTeacherInput.full_name);
    });

    it('should throw error for non-existent username', async () => {
      const loginInput: LoginInput = {
        username: 'nonexistent',
        password: 'somepassword'
      };

      await expect(login(loginInput)).rejects.toThrow(/Invalid credentials/i);
    });

    it('should throw error for incorrect password', async () => {
      // Create test user
      await createTestUser(testUserInput);
      
      const loginInput: LoginInput = {
        username: testUserInput.username,
        password: 'wrongpassword'
      };

      await expect(login(loginInput)).rejects.toThrow(/Invalid credentials/i);
    });

    it('should throw error for inactive user', async () => {
      // Create inactive user
      const passwordHash = createPasswordHash(testUserInput.password);
      
      await db.insert(usersTable)
        .values({
          username: testUserInput.username,
          password_hash: passwordHash,
          full_name: testUserInput.full_name,
          email: testUserInput.email,
          role: testUserInput.role,
          is_active: false // Inactive user
        })
        .execute();

      const loginInput: LoginInput = {
        username: testUserInput.username,
        password: testUserInput.password
      };

      await expect(login(loginInput)).rejects.toThrow(/Account is deactivated/i);
    });

    it('should handle empty username', async () => {
      const loginInput: LoginInput = {
        username: '',
        password: 'somepassword'
      };

      await expect(login(loginInput)).rejects.toThrow(/Invalid credentials/i);
    });

    it('should handle administrator login', async () => {
      // Create admin user
      const admin = await createTestUser(testAdminInput);
      
      const loginInput: LoginInput = {
        username: testAdminInput.username,
        password: testAdminInput.password
      };

      const result = await login(loginInput);

      expect(result.user_id).toBe(admin.id);
      expect(result.username).toBe(testAdminInput.username);
      expect(result.role).toBe('administrator');
      expect(result.full_name).toBe(testAdminInput.full_name);
    });
  });

  describe('logout', () => {
    it('should logout successfully for existing user', async () => {
      // Create test user
      const user = await createTestUser(testUserInput);

      const result = await logout(user.id);

      expect(result.success).toBe(true);
    });

    it('should throw error for non-existent user ID', async () => {
      const nonExistentUserId = 99999;

      await expect(logout(nonExistentUserId)).rejects.toThrow(/User not found/i);
    });

    it('should logout successfully for different user roles', async () => {
      // Create teacher user
      const teacher = await createTestUser(testTeacherInput);

      const result = await logout(teacher.id);

      expect(result.success).toBe(true);
    });
  });

  describe('getCurrentUser', () => {
    it('should return user context for existing active user', async () => {
      // Create test user
      const user = await createTestUser(testUserInput);

      const result = await getCurrentUser(user.id);

      expect(result).not.toBeNull();
      expect(result!.user_id).toBe(user.id);
      expect(result!.username).toBe(testUserInput.username);
      expect(result!.role).toBe(testUserInput.role);
      expect(result!.full_name).toBe(testUserInput.full_name);
    });

    it('should return null for non-existent user ID', async () => {
      const nonExistentUserId = 99999;

      const result = await getCurrentUser(nonExistentUserId);

      expect(result).toBeNull();
    });

    it('should return null for inactive user', async () => {
      // Create inactive user
      const passwordHash = createPasswordHash(testUserInput.password);
      
      const insertResult = await db.insert(usersTable)
        .values({
          username: testUserInput.username,
          password_hash: passwordHash,
          full_name: testUserInput.full_name,
          email: testUserInput.email,
          role: testUserInput.role,
          is_active: false // Inactive user
        })
        .returning()
        .execute();

      const result = await getCurrentUser(insertResult[0].id);

      expect(result).toBeNull();
    });

    it('should return correct context for different user roles', async () => {
      // Create admin user
      const admin = await createTestUser(testAdminInput);

      const result = await getCurrentUser(admin.id);

      expect(result).not.toBeNull();
      expect(result!.user_id).toBe(admin.id);
      expect(result!.username).toBe(testAdminInput.username);
      expect(result!.role).toBe('administrator');
      expect(result!.full_name).toBe(testAdminInput.full_name);
    });

    it('should verify user still exists in database', async () => {
      // Create test user
      const user = await createTestUser(testUserInput);

      // Verify user exists in database
      const dbUsers = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, user.id))
        .execute();

      expect(dbUsers).toHaveLength(1);
      expect(dbUsers[0].username).toBe(testUserInput.username);

      // Get current user should work
      const result = await getCurrentUser(user.id);
      expect(result).not.toBeNull();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete login flow', async () => {
      // Create user
      const user = await createTestUser(testUserInput);

      // Login
      const loginInput: LoginInput = {
        username: testUserInput.username,
        password: testUserInput.password
      };

      const loginResult = await login(loginInput);
      expect(loginResult.user_id).toBe(user.id);

      // Get current user
      const currentUser = await getCurrentUser(loginResult.user_id);
      expect(currentUser).not.toBeNull();
      expect(currentUser!.user_id).toBe(user.id);

      // Logout
      const logoutResult = await logout(loginResult.user_id);
      expect(logoutResult.success).toBe(true);
    });

    it('should handle multiple users with different roles', async () => {
      // Create multiple users
      const student = await createTestUser(testUserInput);
      const teacher = await createTestUser(testTeacherInput);
      const admin = await createTestUser(testAdminInput);

      // Test each user login
      const studentLogin = await login({
        username: testUserInput.username,
        password: testUserInput.password
      });
      expect(studentLogin.role).toBe('student');

      const teacherLogin = await login({
        username: testTeacherInput.username,
        password: testTeacherInput.password
      });
      expect(teacherLogin.role).toBe('teacher');

      const adminLogin = await login({
        username: testAdminInput.username,
        password: testAdminInput.password
      });
      expect(adminLogin.role).toBe('administrator');
    });
  });
});