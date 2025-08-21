import crypto from 'crypto';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type AuthContext } from '../schema';
import { eq } from 'drizzle-orm';

// Simple password hashing using Node.js crypto
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

function verifyPassword(password: string, hash: string): boolean {
  // Extract salt from hash (first 32 chars)
  const salt = hash.substring(0, 32);
  const storedHash = hash.substring(32);
  const computedHash = hashPassword(password, salt);
  return computedHash === storedHash;
}

export async function login(input: LoginInput): Promise<AuthContext> {
  try {
    // Find user by username
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    const user = users[0];
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = verifyPassword(input.password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Return authentication context
    return {
      user_id: user.id,
      username: user.username,
      role: user.role,
      full_name: user.full_name
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

export async function logout(userId: number): Promise<{ success: boolean }> {
  try {
    // In a real application, this would invalidate sessions/tokens
    // For now, we'll just verify the user exists
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (!users[0]) {
      throw new Error('User not found');
    }

    // Session invalidation would happen here
    // This could involve clearing session storage, blacklisting tokens, etc.
    
    return { success: true };
  } catch (error) {
    console.error('Logout failed:', error);
    throw error;
  }
}

export async function getCurrentUser(userId: number): Promise<AuthContext | null> {
  try {
    // Retrieve user information by ID
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    const user = users[0];
    if (!user) {
      return null;
    }

    // Check if user is still active
    if (!user.is_active) {
      return null;
    }

    // Return authentication context
    return {
      user_id: user.id,
      username: user.username,
      role: user.role,
      full_name: user.full_name
    };
  } catch (error) {
    console.error('Get current user failed:', error);
    throw error;
  }
}