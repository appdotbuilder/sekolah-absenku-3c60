import { db } from '../db';
import { studentsTable, usersTable, classesTable } from '../db/schema';
import { type CreateStudentInput, type UpdateStudentInput, type Student } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function createStudent(input: CreateStudentInput): Promise<Student> {
  try {
    // Verify that the user exists and has student role
    const user = await db.select()
      .from(usersTable)
      .where(and(
        eq(usersTable.id, input.user_id),
        eq(usersTable.role, 'student')
      ))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found or is not a student');
    }

    // Verify that the class exists
    const classExists = await db.select()
      .from(classesTable)
      .where(eq(classesTable.id, input.class_id))
      .execute();

    if (classExists.length === 0) {
      throw new Error('Class not found');
    }

    // Insert student record
    const result = await db.insert(studentsTable)
      .values({
        user_id: input.user_id,
        nis_nisn: input.nis_nisn,
        class_id: input.class_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Student creation failed:', error);
    throw error;
  }
}

export async function updateStudent(input: UpdateStudentInput): Promise<Student> {
  try {
    // Check if student exists
    const existingStudent = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, input.id))
      .execute();

    if (existingStudent.length === 0) {
      throw new Error('Student not found');
    }

    // If class_id is being updated, verify the new class exists
    if (input.class_id !== undefined) {
      const classExists = await db.select()
        .from(classesTable)
        .where(eq(classesTable.id, input.class_id))
        .execute();

      if (classExists.length === 0) {
        throw new Error('Class not found');
      }
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (input.nis_nisn !== undefined) updateData.nis_nisn = input.nis_nisn;
    if (input.class_id !== undefined) updateData.class_id = input.class_id;

    // Update student record
    const result = await db.update(studentsTable)
      .set(updateData)
      .where(eq(studentsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Student update failed:', error);
    throw error;
  }
}

export async function deleteStudent(id: number): Promise<{ success: boolean }> {
  try {
    // Check if student exists
    const existingStudent = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, id))
      .execute();

    if (existingStudent.length === 0) {
      throw new Error('Student not found');
    }

    // Delete student record (attendance records are preserved due to foreign key constraints)
    await db.delete(studentsTable)
      .where(eq(studentsTable.id, id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Student deletion failed:', error);
    throw error;
  }
}

export async function getAllStudents(): Promise<Student[]> {
  try {
    const result = await db.select()
      .from(studentsTable)
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to fetch all students:', error);
    throw error;
  }
}

export async function getStudentsByClass(classId: number): Promise<Student[]> {
  try {
    // Verify class exists
    const classExists = await db.select()
      .from(classesTable)
      .where(eq(classesTable.id, classId))
      .execute();

    if (classExists.length === 0) {
      throw new Error('Class not found');
    }

    const result = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.class_id, classId))
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to fetch students by class:', error);
    throw error;
  }
}

export async function getStudentById(id: number): Promise<Student | null> {
  try {
    const result = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, id))
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Failed to fetch student by ID:', error);
    throw error;
  }
}

export async function getStudentByNisNisn(nisNisn: string): Promise<Student | null> {
  try {
    const result = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.nis_nisn, nisNisn))
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Failed to fetch student by NIS/NISN:', error);
    throw error;
  }
}