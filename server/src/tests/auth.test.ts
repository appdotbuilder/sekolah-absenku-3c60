import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, guruTable, siswaTable, kelasTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { login, getCurrentUser, changePassword } from '../handlers/auth';
import { eq } from 'drizzle-orm';

// Test users data
const adminPassword = 'admin123';
const guruPassword = 'guru123';
const siswaPassword = 'siswa123';

describe('auth handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should login admin successfully', async () => {
    // Create admin user
    const adminPasswordHash = await Bun.password.hash(adminPassword);
    const adminResult = await db.insert(usersTable)
      .values({
        username: 'admin',
        password_hash: adminPasswordHash,
        role: 'admin'
      })
      .returning()
      .execute();

    const adminInput: LoginInput = {
      username: 'admin',
      password: adminPassword,
      role: 'admin'
    };

    const result = await login(adminInput);

    expect(result).toBeDefined();
    expect(result?.username).toBe('admin');
    expect(result?.role).toBe('admin');
    expect(result?.id).toBe(adminResult[0].id);
    expect((result as any)?.password_hash).toBeUndefined(); // Password should not be returned
  });

  it('should login guru with NIP successfully', async () => {
    // Create guru user
    const guruPasswordHash = await Bun.password.hash(guruPassword);
    const userResult = await db.insert(usersTable)
      .values({
        username: 'guru_user',
        password_hash: guruPasswordHash,
        role: 'guru'
      })
      .returning()
      .execute();

    // Create guru profile
    await db.insert(guruTable)
      .values({
        user_id: userResult[0].id,
        nip: '123456789',
        nama: 'Guru Test'
      })
      .execute();

    const guruInput: LoginInput = {
      username: '123456789', // Using NIP as username
      password: guruPassword,
      role: 'guru'
    };

    const result = await login(guruInput);

    expect(result).toBeDefined();
    expect(result?.role).toBe('guru');
    expect(result?.id).toBe(userResult[0].id);
    expect((result as any)?.password_hash).toBeUndefined();
  });

  it('should login siswa with NISN successfully', async () => {
    // Create prerequisite kelas
    const kelasResult = await db.insert(kelasTable)
      .values({
        nama_kelas: 'X-1'
      })
      .returning()
      .execute();

    // Create siswa user
    const siswaPasswordHash = await Bun.password.hash(siswaPassword);
    const userResult = await db.insert(usersTable)
      .values({
        username: 'siswa_user',
        password_hash: siswaPasswordHash,
        role: 'siswa'
      })
      .returning()
      .execute();

    // Create siswa profile
    await db.insert(siswaTable)
      .values({
        user_id: userResult[0].id,
        nisn: '1234567890',
        nama: 'Siswa Test',
        kelas_id: kelasResult[0].id
      })
      .execute();

    const siswaInput: LoginInput = {
      username: '1234567890', // Using NISN as username
      password: siswaPassword,
      role: 'siswa'
    };

    const result = await login(siswaInput);

    expect(result).toBeDefined();
    expect(result?.role).toBe('siswa');
    expect(result?.id).toBe(userResult[0].id);
    expect((result as any)?.password_hash).toBeUndefined();
  });

  it('should return null for invalid username', async () => {
    const invalidInput: LoginInput = {
      username: 'nonexistent',
      password: 'password',
      role: 'admin'
    };

    const result = await login(invalidInput);
    expect(result).toBeNull();
  });

  it('should return null for invalid password', async () => {
    // Create admin user
    const adminPasswordHash = await Bun.password.hash(adminPassword);
    await db.insert(usersTable)
      .values({
        username: 'admin',
        password_hash: adminPasswordHash,
        role: 'admin'
      })
      .execute();

    const invalidInput: LoginInput = {
      username: 'admin',
      password: 'wrongpassword',
      role: 'admin'
    };

    const result = await login(invalidInput);
    expect(result).toBeNull();
  });

  it('should return null for mismatched role', async () => {
    // Create admin user
    const adminPasswordHash = await Bun.password.hash(adminPassword);
    await db.insert(usersTable)
      .values({
        username: 'admin',
        password_hash: adminPasswordHash,
        role: 'admin'
      })
      .execute();

    // Try to login as guru with admin username
    const mismatchedInput: LoginInput = {
      username: 'admin',
      password: adminPassword,
      role: 'guru'
    };

    const result = await login(mismatchedInput);
    expect(result).toBeNull();
  });

  it('should get current user successfully', async () => {
    // Create user
    const passwordHash = await Bun.password.hash('password123');
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password_hash: passwordHash,
        role: 'admin'
      })
      .returning()
      .execute();

    const result = await getCurrentUser(userResult[0].id);

    expect(result).toBeDefined();
    expect(result?.id).toBe(userResult[0].id);
    expect(result?.username).toBe('testuser');
    expect(result?.role).toBe('admin');
    expect((result as any)?.password_hash).toBeUndefined(); // Password should not be returned
  });

  it('should return null for non-existent user ID', async () => {
    const result = await getCurrentUser(999);
    expect(result).toBeNull();
  });

  it('should change password successfully', async () => {
    const currentPassword = 'oldpassword123';
    const newPassword = 'newpassword123';

    // Create user
    const currentPasswordHash = await Bun.password.hash(currentPassword);
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password_hash: currentPasswordHash,
        role: 'admin'
      })
      .returning()
      .execute();

    const result = await changePassword(userResult[0].id, currentPassword, newPassword);
    expect(result).toBe(true);

    // Verify password was actually changed
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userResult[0].id))
      .execute();

    const updatedUser = updatedUsers[0];
    expect(updatedUser).toBeDefined();

    // Verify new password works
    const newPasswordValid = await Bun.password.verify(newPassword, updatedUser.password_hash);
    expect(newPasswordValid).toBe(true);

    // Verify old password no longer works
    const oldPasswordValid = await Bun.password.verify(currentPassword, updatedUser.password_hash);
    expect(oldPasswordValid).toBe(false);
  });

  it('should return false for wrong current password', async () => {
    const actualPassword = 'correctpassword';
    const wrongCurrentPassword = 'wrongcurrentpassword';
    const newPassword = 'newpassword123';

    // Create user
    const passwordHash = await Bun.password.hash(actualPassword);
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password_hash: passwordHash,
        role: 'admin'
      })
      .returning()
      .execute();

    const result = await changePassword(userResult[0].id, wrongCurrentPassword, newPassword);
    expect(result).toBe(false);

    // Verify password was not changed
    const unchangedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userResult[0].id))
      .execute();

    const unchangedUser = unchangedUsers[0];
    const originalPasswordValid = await Bun.password.verify(actualPassword, unchangedUser.password_hash);
    expect(originalPasswordValid).toBe(true);
  });

  it('should return false for non-existent user on password change', async () => {
    const result = await changePassword(999, 'currentpass', 'newpass');
    expect(result).toBe(false);
  });

  it('should handle guru login with non-existent NIP', async () => {
    const guruInput: LoginInput = {
      username: '999999999', // Non-existent NIP
      password: 'password',
      role: 'guru'
    };

    const result = await login(guruInput);
    expect(result).toBeNull();
  });

  it('should handle siswa login with non-existent NISN', async () => {
    const siswaInput: LoginInput = {
      username: '9999999999', // Non-existent NISN
      password: 'password',
      role: 'siswa'
    };

    const result = await login(siswaInput);
    expect(result).toBeNull();
  });
});