import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, classesTable, studentsTable } from '../db/schema';
import { type CreateStudentInput, type UpdateStudentInput } from '../schema';
import {
  createStudent,
  updateStudent,
  deleteStudent,
  getAllStudents,
  getStudentsByClass,
  getStudentById,
  getStudentByNisNisn
} from '../handlers/students';
import { eq } from 'drizzle-orm';

describe('Student Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test user
  const createTestUser = async (role: 'student' | 'teacher' = 'student') => {
    const result = await db.insert(usersTable)
      .values({
        username: role === 'student' ? 'student123' : 'teacher123',
        password_hash: 'hashed_password',
        full_name: role === 'student' ? 'Test Student' : 'Test Teacher',
        email: role === 'student' ? 'student@test.com' : 'teacher@test.com',
        role: role
      })
      .returning()
      .execute();
    return result[0];
  };

  // Helper function to create test class
  const createTestClass = async (teacherId?: number) => {
    const result = await db.insert(classesTable)
      .values({
        name: 'Class 10A',
        grade_level: '10',
        homeroom_teacher_id: teacherId || null
      })
      .returning()
      .execute();
    return result[0];
  };

  describe('createStudent', () => {
    it('should create a student successfully', async () => {
      const user = await createTestUser('student');
      const testClass = await createTestClass();

      const input: CreateStudentInput = {
        user_id: user.id,
        nis_nisn: '2023001',
        class_id: testClass.id
      };

      const result = await createStudent(input);

      expect(result.user_id).toEqual(user.id);
      expect(result.nis_nisn).toEqual('2023001');
      expect(result.class_id).toEqual(testClass.id);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save student to database', async () => {
      const user = await createTestUser('student');
      const testClass = await createTestClass();

      const input: CreateStudentInput = {
        user_id: user.id,
        nis_nisn: '2023002',
        class_id: testClass.id
      };

      const result = await createStudent(input);

      const students = await db.select()
        .from(studentsTable)
        .where(eq(studentsTable.id, result.id))
        .execute();

      expect(students).toHaveLength(1);
      expect(students[0].nis_nisn).toEqual('2023002');
      expect(students[0].user_id).toEqual(user.id);
      expect(students[0].class_id).toEqual(testClass.id);
    });

    it('should reject creation for non-existent user', async () => {
      const testClass = await createTestClass();

      const input: CreateStudentInput = {
        user_id: 999,
        nis_nisn: '2023003',
        class_id: testClass.id
      };

      expect(createStudent(input)).rejects.toThrow(/user not found/i);
    });

    it('should reject creation for non-student user', async () => {
      const teacher = await createTestUser('teacher');
      const testClass = await createTestClass();

      const input: CreateStudentInput = {
        user_id: teacher.id,
        nis_nisn: '2023004',
        class_id: testClass.id
      };

      expect(createStudent(input)).rejects.toThrow(/not a student/i);
    });

    it('should reject creation for non-existent class', async () => {
      const user = await createTestUser('student');

      const input: CreateStudentInput = {
        user_id: user.id,
        nis_nisn: '2023005',
        class_id: 999
      };

      expect(createStudent(input)).rejects.toThrow(/class not found/i);
    });

    it('should enforce unique NIS/NISN constraint', async () => {
      const user1 = await createTestUser('student');
      const user2 = await db.insert(usersTable)
        .values({
          username: 'student456',
          password_hash: 'hashed_password',
          full_name: 'Another Student',
          email: 'student2@test.com',
          role: 'student'
        })
        .returning()
        .execute();
      const testClass = await createTestClass();

      // Create first student
      await createStudent({
        user_id: user1.id,
        nis_nisn: '2023006',
        class_id: testClass.id
      });

      // Try to create second student with same NIS/NISN
      const duplicateInput: CreateStudentInput = {
        user_id: user2[0].id,
        nis_nisn: '2023006',
        class_id: testClass.id
      };

      expect(createStudent(duplicateInput)).rejects.toThrow();
    });
  });

  describe('updateStudent', () => {
    it('should update student information', async () => {
      const user = await createTestUser('student');
      const testClass = await createTestClass();
      const newClass = await db.insert(classesTable)
        .values({
          name: 'Class 11A',
          grade_level: '11',
          homeroom_teacher_id: null
        })
        .returning()
        .execute();

      // Create initial student
      const student = await createStudent({
        user_id: user.id,
        nis_nisn: '2023007',
        class_id: testClass.id
      });

      const updateInput: UpdateStudentInput = {
        id: student.id,
        nis_nisn: '2023007-updated',
        class_id: newClass[0].id
      };

      const result = await updateStudent(updateInput);

      expect(result.nis_nisn).toEqual('2023007-updated');
      expect(result.class_id).toEqual(newClass[0].id);
      expect(result.user_id).toEqual(user.id);
    });

    it('should update only provided fields', async () => {
      const user = await createTestUser('student');
      const testClass = await createTestClass();

      const student = await createStudent({
        user_id: user.id,
        nis_nisn: '2023008',
        class_id: testClass.id
      });

      const updateInput: UpdateStudentInput = {
        id: student.id,
        nis_nisn: '2023008-updated'
      };

      const result = await updateStudent(updateInput);

      expect(result.nis_nisn).toEqual('2023008-updated');
      expect(result.class_id).toEqual(testClass.id); // Should remain unchanged
    });

    it('should reject update for non-existent student', async () => {
      const updateInput: UpdateStudentInput = {
        id: 999,
        nis_nisn: '2023009'
      };

      expect(updateStudent(updateInput)).rejects.toThrow(/student not found/i);
    });

    it('should reject update with non-existent class', async () => {
      const user = await createTestUser('student');
      const testClass = await createTestClass();

      const student = await createStudent({
        user_id: user.id,
        nis_nisn: '2023010',
        class_id: testClass.id
      });

      const updateInput: UpdateStudentInput = {
        id: student.id,
        class_id: 999
      };

      expect(updateStudent(updateInput)).rejects.toThrow(/class not found/i);
    });
  });

  describe('deleteStudent', () => {
    it('should delete a student successfully', async () => {
      const user = await createTestUser('student');
      const testClass = await createTestClass();

      const student = await createStudent({
        user_id: user.id,
        nis_nisn: '2023011',
        class_id: testClass.id
      });

      const result = await deleteStudent(student.id);

      expect(result.success).toBe(true);

      // Verify student is deleted from database
      const students = await db.select()
        .from(studentsTable)
        .where(eq(studentsTable.id, student.id))
        .execute();

      expect(students).toHaveLength(0);
    });

    it('should reject deletion of non-existent student', async () => {
      expect(deleteStudent(999)).rejects.toThrow(/student not found/i);
    });
  });

  describe('getAllStudents', () => {
    it('should return all students', async () => {
      const user1 = await createTestUser('student');
      const user2 = await db.insert(usersTable)
        .values({
          username: 'student789',
          password_hash: 'hashed_password',
          full_name: 'Second Student',
          email: 'student3@test.com',
          role: 'student'
        })
        .returning()
        .execute();
      const testClass = await createTestClass();

      await createStudent({
        user_id: user1.id,
        nis_nisn: '2023012',
        class_id: testClass.id
      });

      await createStudent({
        user_id: user2[0].id,
        nis_nisn: '2023013',
        class_id: testClass.id
      });

      const result = await getAllStudents();

      expect(result).toHaveLength(2);
      expect(result.some(s => s.nis_nisn === '2023012')).toBe(true);
      expect(result.some(s => s.nis_nisn === '2023013')).toBe(true);
    });

    it('should return empty array when no students exist', async () => {
      const result = await getAllStudents();
      expect(result).toHaveLength(0);
    });
  });

  describe('getStudentsByClass', () => {
    it('should return students for a specific class', async () => {
      const user1 = await createTestUser('student');
      const user2 = await db.insert(usersTable)
        .values({
          username: 'student101',
          password_hash: 'hashed_password',
          full_name: 'Class Student',
          email: 'student4@test.com',
          role: 'student'
        })
        .returning()
        .execute();

      const testClass1 = await createTestClass();
      const testClass2 = await db.insert(classesTable)
        .values({
          name: 'Class 12A',
          grade_level: '12',
          homeroom_teacher_id: null
        })
        .returning()
        .execute();

      // Create students in different classes
      await createStudent({
        user_id: user1.id,
        nis_nisn: '2023014',
        class_id: testClass1.id
      });

      await createStudent({
        user_id: user2[0].id,
        nis_nisn: '2023015',
        class_id: testClass2[0].id
      });

      const result = await getStudentsByClass(testClass1.id);

      expect(result).toHaveLength(1);
      expect(result[0].nis_nisn).toEqual('2023014');
      expect(result[0].class_id).toEqual(testClass1.id);
    });

    it('should reject query for non-existent class', async () => {
      expect(getStudentsByClass(999)).rejects.toThrow(/class not found/i);
    });

    it('should return empty array for class with no students', async () => {
      const testClass = await createTestClass();
      const result = await getStudentsByClass(testClass.id);
      expect(result).toHaveLength(0);
    });
  });

  describe('getStudentById', () => {
    it('should return student by ID', async () => {
      const user = await createTestUser('student');
      const testClass = await createTestClass();

      const student = await createStudent({
        user_id: user.id,
        nis_nisn: '2023016',
        class_id: testClass.id
      });

      const result = await getStudentById(student.id);

      expect(result).toBeTruthy();
      expect(result!.id).toEqual(student.id);
      expect(result!.nis_nisn).toEqual('2023016');
    });

    it('should return null for non-existent student', async () => {
      const result = await getStudentById(999);
      expect(result).toBeNull();
    });
  });

  describe('getStudentByNisNisn', () => {
    it('should return student by NIS/NISN', async () => {
      const user = await createTestUser('student');
      const testClass = await createTestClass();

      await createStudent({
        user_id: user.id,
        nis_nisn: '2023017',
        class_id: testClass.id
      });

      const result = await getStudentByNisNisn('2023017');

      expect(result).toBeTruthy();
      expect(result!.nis_nisn).toEqual('2023017');
      expect(result!.user_id).toEqual(user.id);
    });

    it('should return null for non-existent NIS/NISN', async () => {
      const result = await getStudentByNisNisn('nonexistent');
      expect(result).toBeNull();
    });
  });
});