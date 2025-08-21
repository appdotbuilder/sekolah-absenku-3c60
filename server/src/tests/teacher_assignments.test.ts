import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, classesTable, teacherClassAssignmentsTable } from '../db/schema';
import { type AssignTeacherToClassInput } from '../schema';
import {
  assignTeacherToClass,
  removeTeacherFromClass,
  getTeacherAssignments,
  getClassAssignments,
  updateTeacherAssignment
} from '../handlers/teacher_assignments';
import { eq, and } from 'drizzle-orm';

// Test data
const testTeacher = {
  username: 'teacher1',
  password_hash: 'hashedpassword123',
  full_name: 'John Teacher',
  email: 'teacher1@school.com',
  role: 'teacher' as const,
  is_active: true
};

const testAdmin = {
  username: 'admin1',
  password_hash: 'hashedpassword123',
  full_name: 'Jane Admin',
  email: 'admin@school.com',
  role: 'administrator' as const,
  is_active: true
};

const testStudent = {
  username: 'student1',
  password_hash: 'hashedpassword123',
  full_name: 'Bob Student',
  email: 'student1@school.com',
  role: 'student' as const,
  is_active: true
};

const testClass = {
  name: 'Class 1A',
  grade_level: '1'
};

const testAssignmentInput: AssignTeacherToClassInput = {
  teacher_id: 1,
  class_id: 1,
  is_homeroom: false
};

describe('Teacher Assignments', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('assignTeacherToClass', () => {
    it('should assign a teacher to a class', async () => {
      // Create teacher and class
      const teacher = await db.insert(usersTable).values(testTeacher).returning().execute();
      const classRecord = await db.insert(classesTable).values(testClass).returning().execute();

      const input: AssignTeacherToClassInput = {
        teacher_id: teacher[0].id,
        class_id: classRecord[0].id,
        is_homeroom: false
      };

      const result = await assignTeacherToClass(input);

      expect(result.teacher_id).toEqual(teacher[0].id);
      expect(result.class_id).toEqual(classRecord[0].id);
      expect(result.is_homeroom).toEqual(false);
      expect(result.id).toBeDefined();
      expect(result.assigned_at).toBeInstanceOf(Date);
    });

    it('should assign an administrator as a teacher', async () => {
      // Create admin and class
      const admin = await db.insert(usersTable).values(testAdmin).returning().execute();
      const classRecord = await db.insert(classesTable).values(testClass).returning().execute();

      const input: AssignTeacherToClassInput = {
        teacher_id: admin[0].id,
        class_id: classRecord[0].id,
        is_homeroom: true
      };

      const result = await assignTeacherToClass(input);

      expect(result.teacher_id).toEqual(admin[0].id);
      expect(result.class_id).toEqual(classRecord[0].id);
      expect(result.is_homeroom).toEqual(true);
    });

    it('should assign a teacher as homeroom teacher', async () => {
      // Create teacher and class
      const teacher = await db.insert(usersTable).values(testTeacher).returning().execute();
      const classRecord = await db.insert(classesTable).values(testClass).returning().execute();

      const input: AssignTeacherToClassInput = {
        teacher_id: teacher[0].id,
        class_id: classRecord[0].id,
        is_homeroom: true
      };

      const result = await assignTeacherToClass(input);

      expect(result.is_homeroom).toEqual(true);
    });

    it('should save assignment to database', async () => {
      // Create teacher and class
      const teacher = await db.insert(usersTable).values(testTeacher).returning().execute();
      const classRecord = await db.insert(classesTable).values(testClass).returning().execute();

      const input: AssignTeacherToClassInput = {
        teacher_id: teacher[0].id,
        class_id: classRecord[0].id,
        is_homeroom: false
      };

      const result = await assignTeacherToClass(input);

      const savedAssignments = await db.select()
        .from(teacherClassAssignmentsTable)
        .where(eq(teacherClassAssignmentsTable.id, result.id))
        .execute();

      expect(savedAssignments).toHaveLength(1);
      expect(savedAssignments[0].teacher_id).toEqual(teacher[0].id);
      expect(savedAssignments[0].class_id).toEqual(classRecord[0].id);
      expect(savedAssignments[0].is_homeroom).toEqual(false);
    });

    it('should throw error for non-existent teacher', async () => {
      const classRecord = await db.insert(classesTable).values(testClass).returning().execute();

      const input: AssignTeacherToClassInput = {
        teacher_id: 9999,
        class_id: classRecord[0].id,
        is_homeroom: false
      };

      await expect(assignTeacherToClass(input)).rejects.toThrow(/teacher not found/i);
    });

    it('should throw error for non-existent class', async () => {
      const teacher = await db.insert(usersTable).values(testTeacher).returning().execute();

      const input: AssignTeacherToClassInput = {
        teacher_id: teacher[0].id,
        class_id: 9999,
        is_homeroom: false
      };

      await expect(assignTeacherToClass(input)).rejects.toThrow(/class not found/i);
    });

    it('should throw error for student user', async () => {
      const student = await db.insert(usersTable).values(testStudent).returning().execute();
      const classRecord = await db.insert(classesTable).values(testClass).returning().execute();

      const input: AssignTeacherToClassInput = {
        teacher_id: student[0].id,
        class_id: classRecord[0].id,
        is_homeroom: false
      };

      await expect(assignTeacherToClass(input)).rejects.toThrow(/must be a teacher or administrator/i);
    });

    it('should throw error for duplicate assignment', async () => {
      const teacher = await db.insert(usersTable).values(testTeacher).returning().execute();
      const classRecord = await db.insert(classesTable).values(testClass).returning().execute();

      const input: AssignTeacherToClassInput = {
        teacher_id: teacher[0].id,
        class_id: classRecord[0].id,
        is_homeroom: false
      };

      await assignTeacherToClass(input);

      await expect(assignTeacherToClass(input)).rejects.toThrow(/already assigned to this class/i);
    });

    it('should throw error when class already has homeroom teacher', async () => {
      const teacher1 = await db.insert(usersTable).values(testTeacher).returning().execute();
      const teacher2 = await db.insert(usersTable).values({
        ...testTeacher,
        username: 'teacher2',
        email: 'teacher2@school.com',
        full_name: 'Jane Teacher'
      }).returning().execute();
      const classRecord = await db.insert(classesTable).values(testClass).returning().execute();

      // Assign first teacher as homeroom
      const input1: AssignTeacherToClassInput = {
        teacher_id: teacher1[0].id,
        class_id: classRecord[0].id,
        is_homeroom: true
      };
      await assignTeacherToClass(input1);

      // Try to assign second teacher as homeroom
      const input2: AssignTeacherToClassInput = {
        teacher_id: teacher2[0].id,
        class_id: classRecord[0].id,
        is_homeroom: true
      };

      await expect(assignTeacherToClass(input2)).rejects.toThrow(/already has a homeroom teacher/i);
    });
  });

  describe('removeTeacherFromClass', () => {
    it('should remove teacher assignment', async () => {
      // Create teacher, class, and assignment
      const teacher = await db.insert(usersTable).values(testTeacher).returning().execute();
      const classRecord = await db.insert(classesTable).values(testClass).returning().execute();
      
      const assignment = await db.insert(teacherClassAssignmentsTable)
        .values({
          teacher_id: teacher[0].id,
          class_id: classRecord[0].id,
          is_homeroom: false
        })
        .returning()
        .execute();

      const result = await removeTeacherFromClass(teacher[0].id, classRecord[0].id);

      expect(result.success).toBe(true);

      // Verify assignment is removed
      const remainingAssignments = await db.select()
        .from(teacherClassAssignmentsTable)
        .where(eq(teacherClassAssignmentsTable.id, assignment[0].id))
        .execute();

      expect(remainingAssignments).toHaveLength(0);
    });

    it('should throw error for non-existent assignment', async () => {
      await expect(removeTeacherFromClass(9999, 9999))
        .rejects.toThrow(/assignment not found/i);
    });
  });

  describe('getTeacherAssignments', () => {
    it('should return all assignments for a teacher', async () => {
      const teacher = await db.insert(usersTable).values(testTeacher).returning().execute();
      const class1 = await db.insert(classesTable).values(testClass).returning().execute();
      const class2 = await db.insert(classesTable).values({
        ...testClass,
        name: 'Class 2A',
        grade_level: '2'
      }).returning().execute();

      // Create two assignments
      await db.insert(teacherClassAssignmentsTable)
        .values([
          {
            teacher_id: teacher[0].id,
            class_id: class1[0].id,
            is_homeroom: true
          },
          {
            teacher_id: teacher[0].id,
            class_id: class2[0].id,
            is_homeroom: false
          }
        ])
        .execute();

      const assignments = await getTeacherAssignments(teacher[0].id);

      expect(assignments).toHaveLength(2);
      expect(assignments[0].teacher_id).toEqual(teacher[0].id);
      expect(assignments[1].teacher_id).toEqual(teacher[0].id);

      // Check homeroom assignment
      const homeroomAssignment = assignments.find(a => a.is_homeroom);
      expect(homeroomAssignment).toBeDefined();
      expect(homeroomAssignment?.class_id).toEqual(class1[0].id);
    });

    it('should return empty array for teacher with no assignments', async () => {
      const teacher = await db.insert(usersTable).values(testTeacher).returning().execute();

      const assignments = await getTeacherAssignments(teacher[0].id);

      expect(assignments).toHaveLength(0);
    });

    it('should throw error for non-existent teacher', async () => {
      await expect(getTeacherAssignments(9999))
        .rejects.toThrow(/teacher not found/i);
    });
  });

  describe('getClassAssignments', () => {
    it('should return all assignments for a class', async () => {
      const teacher1 = await db.insert(usersTable).values(testTeacher).returning().execute();
      const teacher2 = await db.insert(usersTable).values({
        ...testTeacher,
        username: 'teacher2',
        email: 'teacher2@school.com',
        full_name: 'Jane Teacher'
      }).returning().execute();
      const classRecord = await db.insert(classesTable).values(testClass).returning().execute();

      // Create two assignments
      await db.insert(teacherClassAssignmentsTable)
        .values([
          {
            teacher_id: teacher1[0].id,
            class_id: classRecord[0].id,
            is_homeroom: true
          },
          {
            teacher_id: teacher2[0].id,
            class_id: classRecord[0].id,
            is_homeroom: false
          }
        ])
        .execute();

      const assignments = await getClassAssignments(classRecord[0].id);

      expect(assignments).toHaveLength(2);
      expect(assignments[0].class_id).toEqual(classRecord[0].id);
      expect(assignments[1].class_id).toEqual(classRecord[0].id);

      // Check homeroom assignment
      const homeroomAssignment = assignments.find(a => a.is_homeroom);
      expect(homeroomAssignment).toBeDefined();
      expect(homeroomAssignment?.teacher_id).toEqual(teacher1[0].id);
    });

    it('should return empty array for class with no assignments', async () => {
      const classRecord = await db.insert(classesTable).values(testClass).returning().execute();

      const assignments = await getClassAssignments(classRecord[0].id);

      expect(assignments).toHaveLength(0);
    });

    it('should throw error for non-existent class', async () => {
      await expect(getClassAssignments(9999))
        .rejects.toThrow(/class not found/i);
    });
  });

  describe('updateTeacherAssignment', () => {
    it('should update teacher assignment to homeroom', async () => {
      const teacher = await db.insert(usersTable).values(testTeacher).returning().execute();
      const classRecord = await db.insert(classesTable).values(testClass).returning().execute();
      
      const assignment = await db.insert(teacherClassAssignmentsTable)
        .values({
          teacher_id: teacher[0].id,
          class_id: classRecord[0].id,
          is_homeroom: false
        })
        .returning()
        .execute();

      const result = await updateTeacherAssignment(teacher[0].id, classRecord[0].id, true);

      expect(result.is_homeroom).toBe(true);
      expect(result.teacher_id).toEqual(teacher[0].id);
      expect(result.class_id).toEqual(classRecord[0].id);
    });

    it('should update teacher assignment from homeroom to regular', async () => {
      const teacher = await db.insert(usersTable).values(testTeacher).returning().execute();
      const classRecord = await db.insert(classesTable).values(testClass).returning().execute();
      
      await db.insert(teacherClassAssignmentsTable)
        .values({
          teacher_id: teacher[0].id,
          class_id: classRecord[0].id,
          is_homeroom: true
        })
        .execute();

      const result = await updateTeacherAssignment(teacher[0].id, classRecord[0].id, false);

      expect(result.is_homeroom).toBe(false);
    });

    it('should throw error for non-existent assignment', async () => {
      await expect(updateTeacherAssignment(9999, 9999, true))
        .rejects.toThrow(/assignment not found/i);
    });

    it('should throw error when trying to promote to homeroom with existing homeroom teacher', async () => {
      const teacher1 = await db.insert(usersTable).values(testTeacher).returning().execute();
      const teacher2 = await db.insert(usersTable).values({
        ...testTeacher,
        username: 'teacher2',
        email: 'teacher2@school.com',
        full_name: 'Jane Teacher'
      }).returning().execute();
      const classRecord = await db.insert(classesTable).values(testClass).returning().execute();

      // Create assignments - teacher1 as homeroom, teacher2 as regular
      await db.insert(teacherClassAssignmentsTable)
        .values([
          {
            teacher_id: teacher1[0].id,
            class_id: classRecord[0].id,
            is_homeroom: true
          },
          {
            teacher_id: teacher2[0].id,
            class_id: classRecord[0].id,
            is_homeroom: false
          }
        ])
        .execute();

      // Try to promote teacher2 to homeroom
      await expect(updateTeacherAssignment(teacher2[0].id, classRecord[0].id, true))
        .rejects.toThrow(/already has a homeroom teacher/i);
    });

    it('should save updated assignment to database', async () => {
      const teacher = await db.insert(usersTable).values(testTeacher).returning().execute();
      const classRecord = await db.insert(classesTable).values(testClass).returning().execute();
      
      const assignment = await db.insert(teacherClassAssignmentsTable)
        .values({
          teacher_id: teacher[0].id,
          class_id: classRecord[0].id,
          is_homeroom: false
        })
        .returning()
        .execute();

      await updateTeacherAssignment(teacher[0].id, classRecord[0].id, true);

      // Verify in database
      const updatedAssignment = await db.select()
        .from(teacherClassAssignmentsTable)
        .where(eq(teacherClassAssignmentsTable.id, assignment[0].id))
        .execute();

      expect(updatedAssignment).toHaveLength(1);
      expect(updatedAssignment[0].is_homeroom).toBe(true);
    });
  });
});