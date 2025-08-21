import { db } from '../db';
import { guruTable, usersTable } from '../db/schema';
import { type CreateGuruInput, type UpdateGuruInput, type Guru, type UpdateProfileInput } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function createGuru(input: CreateGuruInput): Promise<Guru> {
  try {
    // Verify that the user exists and has guru role
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    if (user[0].role !== 'guru') {
      throw new Error('User is not a guru');
    }

    // Insert guru record
    const result = await db.insert(guruTable)
      .values({
        user_id: input.user_id,
        nip: input.nip,
        nama: input.nama,
        foto: input.foto || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Guru creation failed:', error);
    throw error;
  }
}

export async function getGuru(): Promise<Guru[]> {
  try {
    const results = await db.select()
      .from(guruTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch guru records:', error);
    throw error;
  }
}

export async function getGuruById(id: number): Promise<Guru | null> {
  try {
    const results = await db.select()
      .from(guruTable)
      .where(eq(guruTable.id, id))
      .execute();

    return results[0] || null;
  } catch (error) {
    console.error('Failed to fetch guru by ID:', error);
    throw error;
  }
}

export async function getGuruByUserId(userId: number): Promise<Guru | null> {
  try {
    const results = await db.select()
      .from(guruTable)
      .where(eq(guruTable.user_id, userId))
      .execute();

    return results[0] || null;
  } catch (error) {
    console.error('Failed to fetch guru by user ID:', error);
    throw error;
  }
}

export async function updateGuru(input: UpdateGuruInput): Promise<Guru | null> {
  try {
    // Build update values object with only provided fields
    const updateValues: Partial<typeof guruTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.nip !== undefined) {
      updateValues.nip = input.nip;
    }
    if (input.nama !== undefined) {
      updateValues.nama = input.nama;
    }
    if (input.foto !== undefined) {
      updateValues.foto = input.foto;
    }

    const results = await db.update(guruTable)
      .set(updateValues)
      .where(eq(guruTable.id, input.id))
      .returning()
      .execute();

    return results[0] || null;
  } catch (error) {
    console.error('Guru update failed:', error);
    throw error;
  }
}

export async function updateGuruProfile(input: UpdateProfileInput): Promise<Guru | null> {
  try {
    // Find guru by user_id first
    const guru = await getGuruByUserId(input.user_id);
    if (!guru) {
      throw new Error('Guru not found for this user');
    }

    // Build update values object with only provided fields
    const updateValues: Partial<typeof guruTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.nama !== undefined) {
      updateValues.nama = input.nama;
    }
    if (input.foto !== undefined) {
      updateValues.foto = input.foto;
    }

    const results = await db.update(guruTable)
      .set(updateValues)
      .where(eq(guruTable.id, guru.id))
      .returning()
      .execute();

    return results[0] || null;
  } catch (error) {
    console.error('Guru profile update failed:', error);
    throw error;
  }
}

export async function deleteGuru(id: number): Promise<boolean> {
  try {
    const results = await db.delete(guruTable)
      .where(eq(guruTable.id, id))
      .returning()
      .execute();

    return results.length > 0;
  } catch (error) {
    console.error('Guru deletion failed:', error);
    throw error;
  }
}