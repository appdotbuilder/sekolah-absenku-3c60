import { db } from '../db';
import { classesTable, usersTable, studentsTable, teacherClassAssignmentsTable } from '../db/schema';
import { type CreateClassInput, type UpdateClassInput, type Class } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function createClass(input: CreateClassInput): Promise<Class> {
  try {
    // Validate homeroom teacher if provided
    if (input.homeroom_teacher_id) {
      const teacher = await db.select()
        .from(usersTable)
        .where(
          and(
            eq(usersTable.id, input.homeroom_teacher_id),
            eq(usersTable.role, 'teacher'),
            eq(usersTable.is_active, true)
          )
        )
        .execute();

      if (teacher.length === 0) {
        throw new Error('Invalid homeroom teacher ID or teacher is not active');
      }
    }

    const result = await db.insert(classesTable)
      .values({
        name: input.name,
        grade_level: input.grade_level,
        homeroom_teacher_id: input.homeroom_teacher_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Class creation failed:', error);
    throw error;
  }
}

export async function updateClass(input: UpdateClassInput): Promise<Class> {
  try {
    // Check if class exists
    const existingClass = await db.select()
      .from(classesTable)
      .where(eq(classesTable.id, input.id))
      .execute();

    if (existingClass.length === 0) {
      throw new Error('Class not found');
    }

    // Validate homeroom teacher if provided
    if (input.homeroom_teacher_id) {
      const teacher = await db.select()
        .from(usersTable)
        .where(
          and(
            eq(usersTable.id, input.homeroom_teacher_id),
            eq(usersTable.role, 'teacher'),
            eq(usersTable.is_active, true)
          )
        )
        .execute();

      if (teacher.length === 0) {
        throw new Error('Invalid homeroom teacher ID or teacher is not active');
      }
    }

    // Build update object with only provided fields
    const updateData: Partial<{
      name: string;
      grade_level: string;
      homeroom_teacher_id: number | null;
    }> = {};

    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.grade_level !== undefined) {
      updateData.grade_level = input.grade_level;
    }
    if (input.homeroom_teacher_id !== undefined) {
      updateData.homeroom_teacher_id = input.homeroom_teacher_id;
    }

    const result = await db.update(classesTable)
      .set(updateData)
      .where(eq(classesTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Class update failed:', error);
    throw error;
  }
}

export async function deleteClass(id: number): Promise<{ success: boolean }> {
  try {
    // Check if class exists
    const existingClass = await db.select()
      .from(classesTable)
      .where(eq(classesTable.id, id))
      .execute();

    if (existingClass.length === 0) {
      throw new Error('Class not found');
    }

    // Check if class has students
    const students = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.class_id, id))
      .execute();

    if (students.length > 0) {
      throw new Error('Cannot delete class with enrolled students');
    }

    // Delete teacher assignments first (due to foreign key constraints)
    await db.delete(teacherClassAssignmentsTable)
      .where(eq(teacherClassAssignmentsTable.class_id, id))
      .execute();

    // Delete the class
    await db.delete(classesTable)
      .where(eq(classesTable.id, id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Class deletion failed:', error);
    throw error;
  }
}

export async function getAllClasses(): Promise<Class[]> {
  try {
    const result = await db.select()
      .from(classesTable)
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to retrieve all classes:', error);
    throw error;
  }
}

export async function getClassById(id: number): Promise<Class | null> {
  try {
    const result = await db.select()
      .from(classesTable)
      .where(eq(classesTable.id, id))
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Failed to retrieve class by ID:', error);
    throw error;
  }
}

export async function getClassesByTeacher(teacherId: number): Promise<Class[]> {
  try {
    // Validate teacher exists and is active
    const teacher = await db.select()
      .from(usersTable)
      .where(
        and(
          eq(usersTable.id, teacherId),
          eq(usersTable.role, 'teacher'),
          eq(usersTable.is_active, true)
        )
      )
      .execute();

    if (teacher.length === 0) {
      throw new Error('Invalid teacher ID or teacher is not active');
    }

    const result = await db.select()
      .from(classesTable)
      .innerJoin(
        teacherClassAssignmentsTable,
        eq(classesTable.id, teacherClassAssignmentsTable.class_id)
      )
      .where(eq(teacherClassAssignmentsTable.teacher_id, teacherId))
      .execute();

    // Extract class data from joined results
    return result.map(row => row.classes);
  } catch (error) {
    console.error('Failed to retrieve classes by teacher:', error);
    throw error;
  }
}