import { db } from '../db';
import { teacherClassAssignmentsTable, usersTable, classesTable } from '../db/schema';
import { type AssignTeacherToClassInput, type TeacherClassAssignment } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function assignTeacherToClass(input: AssignTeacherToClassInput): Promise<TeacherClassAssignment> {
  try {
    // Validate teacher exists and has teacher role
    const teacher = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.teacher_id))
      .execute();

    if (teacher.length === 0) {
      throw new Error('Teacher not found');
    }

    if (teacher[0].role !== 'teacher' && teacher[0].role !== 'administrator') {
      throw new Error('User must be a teacher or administrator');
    }

    // Validate class exists
    const classRecord = await db.select()
      .from(classesTable)
      .where(eq(classesTable.id, input.class_id))
      .execute();

    if (classRecord.length === 0) {
      throw new Error('Class not found');
    }

    // Check if assignment already exists
    const existingAssignment = await db.select()
      .from(teacherClassAssignmentsTable)
      .where(and(
        eq(teacherClassAssignmentsTable.teacher_id, input.teacher_id),
        eq(teacherClassAssignmentsTable.class_id, input.class_id)
      ))
      .execute();

    if (existingAssignment.length > 0) {
      throw new Error('Teacher is already assigned to this class');
    }

    // If assigning as homeroom teacher, check if class already has one
    if (input.is_homeroom) {
      const existingHomeroom = await db.select()
        .from(teacherClassAssignmentsTable)
        .where(and(
          eq(teacherClassAssignmentsTable.class_id, input.class_id),
          eq(teacherClassAssignmentsTable.is_homeroom, true)
        ))
        .execute();

      if (existingHomeroom.length > 0) {
        throw new Error('Class already has a homeroom teacher');
      }
    }

    // Create the assignment
    const result = await db.insert(teacherClassAssignmentsTable)
      .values({
        teacher_id: input.teacher_id,
        class_id: input.class_id,
        is_homeroom: input.is_homeroom
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Teacher assignment failed:', error);
    throw error;
  }
}

export async function removeTeacherFromClass(teacherId: number, classId: number): Promise<{ success: boolean }> {
  try {
    // Validate the assignment exists
    const existingAssignment = await db.select()
      .from(teacherClassAssignmentsTable)
      .where(and(
        eq(teacherClassAssignmentsTable.teacher_id, teacherId),
        eq(teacherClassAssignmentsTable.class_id, classId)
      ))
      .execute();

    if (existingAssignment.length === 0) {
      throw new Error('Teacher assignment not found');
    }

    // Remove the assignment (preserves historical attendance records)
    await db.delete(teacherClassAssignmentsTable)
      .where(and(
        eq(teacherClassAssignmentsTable.teacher_id, teacherId),
        eq(teacherClassAssignmentsTable.class_id, classId)
      ))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Teacher assignment removal failed:', error);
    throw error;
  }
}

export async function getTeacherAssignments(teacherId: number): Promise<TeacherClassAssignment[]> {
  try {
    // Validate teacher exists
    const teacher = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, teacherId))
      .execute();

    if (teacher.length === 0) {
      throw new Error('Teacher not found');
    }

    const assignments = await db.select()
      .from(teacherClassAssignmentsTable)
      .where(eq(teacherClassAssignmentsTable.teacher_id, teacherId))
      .execute();

    return assignments;
  } catch (error) {
    console.error('Failed to get teacher assignments:', error);
    throw error;
  }
}

export async function getClassAssignments(classId: number): Promise<TeacherClassAssignment[]> {
  try {
    // Validate class exists
    const classRecord = await db.select()
      .from(classesTable)
      .where(eq(classesTable.id, classId))
      .execute();

    if (classRecord.length === 0) {
      throw new Error('Class not found');
    }

    const assignments = await db.select()
      .from(teacherClassAssignmentsTable)
      .where(eq(teacherClassAssignmentsTable.class_id, classId))
      .execute();

    return assignments;
  } catch (error) {
    console.error('Failed to get class assignments:', error);
    throw error;
  }
}

export async function updateTeacherAssignment(
  teacherId: number, 
  classId: number, 
  isHomeroom: boolean
): Promise<TeacherClassAssignment> {
  try {
    // Validate the assignment exists
    const existingAssignment = await db.select()
      .from(teacherClassAssignmentsTable)
      .where(and(
        eq(teacherClassAssignmentsTable.teacher_id, teacherId),
        eq(teacherClassAssignmentsTable.class_id, classId)
      ))
      .execute();

    if (existingAssignment.length === 0) {
      throw new Error('Teacher assignment not found');
    }

    // If promoting to homeroom, check if class already has one (excluding current assignment)
    if (isHomeroom && !existingAssignment[0].is_homeroom) {
      const existingHomeroom = await db.select()
        .from(teacherClassAssignmentsTable)
        .where(and(
          eq(teacherClassAssignmentsTable.class_id, classId),
          eq(teacherClassAssignmentsTable.is_homeroom, true)
        ))
        .execute();

      if (existingHomeroom.length > 0) {
        throw new Error('Class already has a homeroom teacher');
      }
    }

    // Update the assignment
    const result = await db.update(teacherClassAssignmentsTable)
      .set({ is_homeroom: isHomeroom })
      .where(and(
        eq(teacherClassAssignmentsTable.teacher_id, teacherId),
        eq(teacherClassAssignmentsTable.class_id, classId)
      ))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Teacher assignment update failed:', error);
    throw error;
  }
}