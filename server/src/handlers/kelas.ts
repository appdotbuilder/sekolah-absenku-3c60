import { db } from '../db';
import { kelasTable, guruTable } from '../db/schema';
import { type CreateKelasInput, type UpdateKelasInput, type Kelas } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function createKelas(input: CreateKelasInput): Promise<Kelas> {
  try {
    // Validate wali_kelas_id exists if provided
    if (input.wali_kelas_id !== null && input.wali_kelas_id !== undefined) {
      const waliKelas = await db.select()
        .from(guruTable)
        .where(eq(guruTable.id, input.wali_kelas_id))
        .execute();

      if (waliKelas.length === 0) {
        throw new Error('Wali kelas not found');
      }
    }

    // Insert kelas record
    const result = await db.insert(kelasTable)
      .values({
        nama_kelas: input.nama_kelas,
        wali_kelas_id: input.wali_kelas_id || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Kelas creation failed:', error);
    throw error;
  }
}

export async function getKelas(): Promise<Kelas[]> {
  try {
    const result = await db.select()
      .from(kelasTable)
      .execute();

    return result;
  } catch (error) {
    console.error('Get kelas failed:', error);
    throw error;
  }
}

export async function getKelasById(id: number): Promise<Kelas | null> {
  try {
    const result = await db.select()
      .from(kelasTable)
      .where(eq(kelasTable.id, id))
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Get kelas by ID failed:', error);
    throw error;
  }
}

export async function getKelasByWaliKelas(guruId: number): Promise<Kelas[]> {
  try {
    const result = await db.select()
      .from(kelasTable)
      .where(eq(kelasTable.wali_kelas_id, guruId))
      .execute();

    return result;
  } catch (error) {
    console.error('Get kelas by wali kelas failed:', error);
    throw error;
  }
}

export async function updateKelas(input: UpdateKelasInput): Promise<Kelas | null> {
  try {
    // Check if kelas exists
    const existingKelas = await getKelasById(input.id);
    if (!existingKelas) {
      return null;
    }

    // Validate wali_kelas_id exists if provided
    if (input.wali_kelas_id !== null && input.wali_kelas_id !== undefined) {
      const waliKelas = await db.select()
        .from(guruTable)
        .where(eq(guruTable.id, input.wali_kelas_id))
        .execute();

      if (waliKelas.length === 0) {
        throw new Error('Wali kelas not found');
      }
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.nama_kelas !== undefined) {
      updateData.nama_kelas = input.nama_kelas;
    }

    if (input.wali_kelas_id !== undefined) {
      updateData.wali_kelas_id = input.wali_kelas_id;
    }

    // Update kelas record
    const result = await db.update(kelasTable)
      .set(updateData)
      .where(eq(kelasTable.id, input.id))
      .returning()
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Kelas update failed:', error);
    throw error;
  }
}

export async function deleteKelas(id: number): Promise<boolean> {
  try {
    // Check if kelas exists
    const existingKelas = await getKelasById(id);
    if (!existingKelas) {
      return false;
    }

    // Delete kelas record (cascade will handle siswa and absensi)
    const result = await db.delete(kelasTable)
      .where(eq(kelasTable.id, id))
      .returning()
      .execute();

    return result.length > 0;
  } catch (error) {
    console.error('Kelas deletion failed:', error);
    throw error;
  }
}