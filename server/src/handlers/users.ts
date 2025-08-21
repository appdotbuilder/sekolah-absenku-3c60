import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type UpdateUserInput, type User, type UserRole } from '../schema';
import { eq } from 'drizzle-orm';

export async function createUser(input: CreateUserInput): Promise<User> {
  try {
    // Hash password (placeholder implementation - in production use bcrypt)
    const password_hash = `hashed_${input.password}`;
    
    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        username: input.username,
        password_hash,
        full_name: input.full_name,
        email: input.email,
        role: input.role,
        is_active: true
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
}

export async function updateUser(input: UpdateUserInput): Promise<User> {
  try {
    // Build update object with only provided fields
    const updateData: any = {};
    
    if (input.username !== undefined) {
      updateData.username = input.username;
    }
    if (input.password !== undefined) {
      // Hash password (placeholder implementation - in production use bcrypt)
      updateData.password_hash = `hashed_${input.password}`;
    }
    if (input.full_name !== undefined) {
      updateData.full_name = input.full_name;
    }
    if (input.email !== undefined) {
      updateData.email = input.email;
    }
    if (input.role !== undefined) {
      updateData.role = input.role;
    }
    if (input.is_active !== undefined) {
      updateData.is_active = input.is_active;
    }
    
    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    // Update user record
    const result = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`User with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
}

export async function deleteUser(id: number): Promise<{ success: boolean }> {
  try {
    // Soft delete by marking as inactive to preserve data integrity
    const result = await db.update(usersTable)
      .set({ 
        is_active: false,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`User with id ${id} not found`);
    }

    return { success: true };
  } catch (error) {
    console.error('User deletion failed:', error);
    throw error;
  }
}

export async function getAllUsers(): Promise<User[]> {
  try {
    // Retrieve all users (excluding password hashes would be done at API level)
    const users = await db.select()
      .from(usersTable)
      .execute();

    return users;
  } catch (error) {
    console.error('Failed to retrieve users:', error);
    throw error;
  }
}

export async function getUsersByRole(role: UserRole): Promise<User[]> {
  try {
    // Filter users by role
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.role, role))
      .execute();

    return users;
  } catch (error) {
    console.error('Failed to retrieve users by role:', error);
    throw error;
  }
}

export async function getUserById(id: number): Promise<User | null> {
  try {
    // Retrieve specific user by ID
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .execute();

    return users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error('Failed to retrieve user by ID:', error);
    throw error;
  }
}