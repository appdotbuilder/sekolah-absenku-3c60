import { db } from '../db';
import { usersTable, guruTable, siswaTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';
import { eq, or } from 'drizzle-orm';

// Helper type for User without password
type SafeUser = Omit<User, 'password_hash'>;

export async function login(input: LoginInput): Promise<SafeUser | null> {
  try {
    let user = null;

    // Handle different login patterns based on role
    if (input.role === 'admin') {
      // Admin login: match username directly
      const results = await db.select()
        .from(usersTable)
        .where(eq(usersTable.username, input.username))
        .execute();
      
      user = results[0] || null;
    } else if (input.role === 'guru') {
      // Guru login: match NIP in guru table, then get user
      const results = await db.select({
        id: usersTable.id,
        username: usersTable.username,
        password_hash: usersTable.password_hash,
        role: usersTable.role,
        created_at: usersTable.created_at,
        updated_at: usersTable.updated_at
      })
        .from(usersTable)
        .innerJoin(guruTable, eq(usersTable.id, guruTable.user_id))
        .where(eq(guruTable.nip, input.username))
        .execute();
      
      user = results[0] || null;
    } else if (input.role === 'siswa') {
      // Siswa login: match NISN in siswa table, then get user
      const results = await db.select({
        id: usersTable.id,
        username: usersTable.username,
        password_hash: usersTable.password_hash,
        role: usersTable.role,
        created_at: usersTable.created_at,
        updated_at: usersTable.updated_at
      })
        .from(usersTable)
        .innerJoin(siswaTable, eq(usersTable.id, siswaTable.user_id))
        .where(eq(siswaTable.nisn, input.username))
        .execute();
      
      user = results[0] || null;
    }

    // If user not found or role doesn't match
    if (!user || user.role !== input.role) {
      return null;
    }

    // Verify password hash
    const passwordValid = await Bun.password.verify(input.password, user.password_hash);
    if (!passwordValid) {
      return null;
    }

    // Return user without password hash
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword as SafeUser;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

export async function getCurrentUser(userId: number): Promise<SafeUser | null> {
  try {
    const results = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    const user = results[0] || null;
    if (!user) {
      return null;
    }

    // Return user without password hash
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword as SafeUser;
  } catch (error) {
    console.error('Get current user failed:', error);
    throw error;
  }
}

export async function changePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean> {
  try {
    // Get current user with password hash
    const results = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    const user = results[0];
    if (!user) {
      return false;
    }

    // Verify current password
    const currentPasswordValid = await Bun.password.verify(currentPassword, user.password_hash);
    if (!currentPasswordValid) {
      return false;
    }

    // Hash new password
    const newPasswordHash = await Bun.password.hash(newPassword);

    // Update password in database
    await db.update(usersTable)
      .set({
        password_hash: newPasswordHash,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, userId))
      .execute();

    return true;
  } catch (error) {
    console.error('Change password failed:', error);
    throw error;
  }
}