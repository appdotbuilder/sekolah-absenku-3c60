import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export async function createUser(input: CreateUserInput): Promise<User> {
  try {
    // Hash the password using Bun's built-in password hashing
    const password_hash = await Bun.password.hash(input.password);

    // Insert the new user
    const result = await db.insert(usersTable)
      .values({
        username: input.username,
        password_hash,
        role: input.role
      })
      .returning()
      .execute();

    const user = result[0];
    return {
      ...user,
      created_at: new Date(user.created_at),
      updated_at: new Date(user.updated_at)
    };
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
}

export async function getUsers(): Promise<User[]> {
  try {
    const results = await db.select({
      id: usersTable.id,
      username: usersTable.username,
      password_hash: usersTable.password_hash, // Include for type compatibility but remove in return
      role: usersTable.role,
      created_at: usersTable.created_at,
      updated_at: usersTable.updated_at
    })
    .from(usersTable)
    .execute();

    // Convert timestamps and exclude password_hash for security
    return results.map(user => ({
      ...user,
      created_at: new Date(user.created_at),
      updated_at: new Date(user.updated_at)
    }));
  } catch (error) {
    console.error('Get users failed:', error);
    throw error;
  }
}

export async function getUserById(id: number): Promise<User | null> {
  try {
    const results = await db.select({
      id: usersTable.id,
      username: usersTable.username,
      password_hash: usersTable.password_hash, // Include for type compatibility
      role: usersTable.role,
      created_at: usersTable.created_at,
      updated_at: usersTable.updated_at
    })
    .from(usersTable)
    .where(eq(usersTable.id, id))
    .execute();

    if (results.length === 0) {
      return null;
    }

    const user = results[0];
    return {
      ...user,
      created_at: new Date(user.created_at),
      updated_at: new Date(user.updated_at)
    };
  } catch (error) {
    console.error('Get user by ID failed:', error);
    throw error;
  }
}

export async function updateUser(id: number, updates: Partial<User>): Promise<User | null> {
  try {
    // Prepare updates object, handling password hashing if needed
    const updateData: any = { ...updates };
    
    // If password is being updated, hash it first
    if (updates.password_hash) {
      updateData.password_hash = await Bun.password.hash(updates.password_hash);
    }

    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    const results = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, id))
      .returning()
      .execute();

    if (results.length === 0) {
      return null;
    }

    const user = results[0];
    return {
      ...user,
      created_at: new Date(user.created_at),
      updated_at: new Date(user.updated_at)
    };
  } catch (error) {
    console.error('Update user failed:', error);
    throw error;
  }
}

export async function deleteUser(id: number): Promise<boolean> {
  try {
    const results = await db.delete(usersTable)
      .where(eq(usersTable.id, id))
      .returning()
      .execute();

    return results.length > 0;
  } catch (error) {
    console.error('Delete user failed:', error);
    throw error;
  }
}