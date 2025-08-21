import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, classesTable, studentsTable, teacherClassAssignmentsTable } from '../db/schema';
import { type CreateClassInput, type UpdateClassInput } from '../schema';
import {
  createClass,
  updateClass,
  deleteClass,
  getAllClasses,
  getClassById,
  getClassesByTeacher
} from '../handlers/classes';
import { eq } from 'drizzle-orm';

describe('Class Management Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test users
  const createTestUsers = async () => {
    const adminResult = await db.insert(usersTable)
      .values({
        username: 'admin',
        password_hash: 'hashedpassword',
        full_name: 'Administrator',
        email: 'admin@school.com',
        role: 'administrator',
        is_active: true
      })
      .returning()
      .execute();

    const teacherResult = await db.insert(usersTable)
      .values({
        username: 'teacher1',
        password_hash: 'hashedpassword',
        full_name: 'Teacher One',
        email: 'teacher1@school.com',
        role: 'teacher',
        is_active: true
      })
      .returning()
      .execute();

    const inactiveTeacherResult = await db.insert(usersTable)
      .values({
        username: 'teacher2',
        password_hash: 'hashedpassword',
        full_name: 'Teacher Two',
        email: 'teacher2@school.com',
        role: 'teacher',
        is_active: false
      })
      .returning()
      .execute();

    const studentUserResult = await db.insert(usersTable)
      .values({
        username: 'student1',
        password_hash: 'hashedpassword',
        full_name: 'Student One',
        email: 'student1@school.com',
        role: 'student',
        is_active: true
      })
      .returning()
      .execute();

    return {
      admin: adminResult[0],
      teacher: teacherResult[0],
      inactiveTeacher: inactiveTeacherResult[0],
      studentUser: studentUserResult[0]
    };
  };

  describe('createClass', () => {
    it('should create a class without homeroom teacher', async () => {
      const input: CreateClassInput = {
        name: 'Mathematics 101',
        grade_level: 'Grade 10',
        homeroom_teacher_id: null
      };

      const result = await createClass(input);

      expect(result.name).toEqual('Mathematics 101');
      expect(result.grade_level).toEqual('Grade 10');
      expect(result.homeroom_teacher_id).toBeNull();
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should create a class with valid homeroom teacher', async () => {
      const users = await createTestUsers();

      const input: CreateClassInput = {
        name: 'Science 101',
        grade_level: 'Grade 9',
        homeroom_teacher_id: users.teacher.id
      };

      const result = await createClass(input);

      expect(result.name).toEqual('Science 101');
      expect(result.grade_level).toEqual('Grade 9');
      expect(result.homeroom_teacher_id).toEqual(users.teacher.id);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);

      // Verify in database
      const classes = await db.select()
        .from(classesTable)
        .where(eq(classesTable.id, result.id))
        .execute();

      expect(classes).toHaveLength(1);
      expect(classes[0].name).toEqual('Science 101');
    });

    it('should reject invalid homeroom teacher ID', async () => {
      const input: CreateClassInput = {
        name: 'Invalid Class',
        grade_level: 'Grade 8',
        homeroom_teacher_id: 999
      };

      await expect(createClass(input)).rejects.toThrow(/invalid homeroom teacher/i);
    });

    it('should reject inactive homeroom teacher', async () => {
      const users = await createTestUsers();

      const input: CreateClassInput = {
        name: 'Invalid Class',
        grade_level: 'Grade 8',
        homeroom_teacher_id: users.inactiveTeacher.id
      };

      await expect(createClass(input)).rejects.toThrow(/invalid homeroom teacher/i);
    });

    it('should reject non-teacher as homeroom teacher', async () => {
      const users = await createTestUsers();

      const input: CreateClassInput = {
        name: 'Invalid Class',
        grade_level: 'Grade 8',
        homeroom_teacher_id: users.studentUser.id
      };

      await expect(createClass(input)).rejects.toThrow(/invalid homeroom teacher/i);
    });
  });

  describe('updateClass', () => {
    it('should update class name and grade level', async () => {
      // Create initial class
      const createInput: CreateClassInput = {
        name: 'Original Class',
        grade_level: 'Grade 7',
        homeroom_teacher_id: null
      };

      const createdClass = await createClass(createInput);

      const updateInput: UpdateClassInput = {
        id: createdClass.id,
        name: 'Updated Class',
        grade_level: 'Grade 8'
      };

      const result = await updateClass(updateInput);

      expect(result.id).toEqual(createdClass.id);
      expect(result.name).toEqual('Updated Class');
      expect(result.grade_level).toEqual('Grade 8');
      expect(result.homeroom_teacher_id).toBeNull();
      expect(result.created_at).toEqual(createdClass.created_at);
    });

    it('should update homeroom teacher', async () => {
      const users = await createTestUsers();

      // Create initial class
      const createInput: CreateClassInput = {
        name: 'Test Class',
        grade_level: 'Grade 6',
        homeroom_teacher_id: null
      };

      const createdClass = await createClass(createInput);

      const updateInput: UpdateClassInput = {
        id: createdClass.id,
        homeroom_teacher_id: users.teacher.id
      };

      const result = await updateClass(updateInput);

      expect(result.id).toEqual(createdClass.id);
      expect(result.name).toEqual('Test Class');
      expect(result.grade_level).toEqual('Grade 6');
      expect(result.homeroom_teacher_id).toEqual(users.teacher.id);
    });

    it('should remove homeroom teacher', async () => {
      const users = await createTestUsers();

      // Create initial class with teacher
      const createInput: CreateClassInput = {
        name: 'Test Class',
        grade_level: 'Grade 6',
        homeroom_teacher_id: users.teacher.id
      };

      const createdClass = await createClass(createInput);

      const updateInput: UpdateClassInput = {
        id: createdClass.id,
        homeroom_teacher_id: null
      };

      const result = await updateClass(updateInput);

      expect(result.homeroom_teacher_id).toBeNull();
    });

    it('should reject update for non-existent class', async () => {
      const updateInput: UpdateClassInput = {
        id: 999,
        name: 'Non-existent Class'
      };

      await expect(updateClass(updateInput)).rejects.toThrow(/class not found/i);
    });

    it('should reject invalid homeroom teacher on update', async () => {
      const createInput: CreateClassInput = {
        name: 'Test Class',
        grade_level: 'Grade 5',
        homeroom_teacher_id: null
      };

      const createdClass = await createClass(createInput);

      const updateInput: UpdateClassInput = {
        id: createdClass.id,
        homeroom_teacher_id: 999
      };

      await expect(updateClass(updateInput)).rejects.toThrow(/invalid homeroom teacher/i);
    });
  });

  describe('deleteClass', () => {
    it('should delete empty class', async () => {
      const createInput: CreateClassInput = {
        name: 'Empty Class',
        grade_level: 'Grade 4',
        homeroom_teacher_id: null
      };

      const createdClass = await createClass(createInput);

      const result = await deleteClass(createdClass.id);

      expect(result.success).toBe(true);

      // Verify class is deleted
      const classes = await db.select()
        .from(classesTable)
        .where(eq(classesTable.id, createdClass.id))
        .execute();

      expect(classes).toHaveLength(0);
    });

    it('should delete class with teacher assignments', async () => {
      const users = await createTestUsers();

      const createInput: CreateClassInput = {
        name: 'Class with Teacher',
        grade_level: 'Grade 3',
        homeroom_teacher_id: users.teacher.id
      };

      const createdClass = await createClass(createInput);

      // Create teacher assignment
      await db.insert(teacherClassAssignmentsTable)
        .values({
          teacher_id: users.teacher.id,
          class_id: createdClass.id,
          is_homeroom: true
        })
        .execute();

      const result = await deleteClass(createdClass.id);

      expect(result.success).toBe(true);

      // Verify both class and assignments are deleted
      const classes = await db.select()
        .from(classesTable)
        .where(eq(classesTable.id, createdClass.id))
        .execute();

      const assignments = await db.select()
        .from(teacherClassAssignmentsTable)
        .where(eq(teacherClassAssignmentsTable.class_id, createdClass.id))
        .execute();

      expect(classes).toHaveLength(0);
      expect(assignments).toHaveLength(0);
    });

    it('should reject deletion of class with students', async () => {
      const users = await createTestUsers();

      const createInput: CreateClassInput = {
        name: 'Class with Students',
        grade_level: 'Grade 2',
        homeroom_teacher_id: null
      };

      const createdClass = await createClass(createInput);

      // Add a student to the class
      await db.insert(studentsTable)
        .values({
          user_id: users.studentUser.id,
          nis_nisn: 'NIS123456',
          class_id: createdClass.id
        })
        .execute();

      await expect(deleteClass(createdClass.id)).rejects.toThrow(/cannot delete class with enrolled students/i);
    });

    it('should reject deletion of non-existent class', async () => {
      await expect(deleteClass(999)).rejects.toThrow(/class not found/i);
    });
  });

  describe('getAllClasses', () => {
    it('should return empty array when no classes exist', async () => {
      const result = await getAllClasses();
      expect(result).toEqual([]);
    });

    it('should return all classes', async () => {
      const users = await createTestUsers();

      // Create multiple classes
      const class1Input: CreateClassInput = {
        name: 'Class A',
        grade_level: 'Grade 1',
        homeroom_teacher_id: null
      };

      const class2Input: CreateClassInput = {
        name: 'Class B',
        grade_level: 'Grade 2',
        homeroom_teacher_id: users.teacher.id
      };

      await createClass(class1Input);
      await createClass(class2Input);

      const result = await getAllClasses();

      expect(result).toHaveLength(2);
      expect(result[0].name).toEqual('Class A');
      expect(result[0].grade_level).toEqual('Grade 1');
      expect(result[0].homeroom_teacher_id).toBeNull();
      expect(result[1].name).toEqual('Class B');
      expect(result[1].grade_level).toEqual('Grade 2');
      expect(result[1].homeroom_teacher_id).toEqual(users.teacher.id);
    });
  });

  describe('getClassById', () => {
    it('should return null for non-existent class', async () => {
      const result = await getClassById(999);
      expect(result).toBeNull();
    });

    it('should return class by ID', async () => {
      const users = await createTestUsers();

      const createInput: CreateClassInput = {
        name: 'Specific Class',
        grade_level: 'Grade 12',
        homeroom_teacher_id: users.teacher.id
      };

      const createdClass = await createClass(createInput);

      const result = await getClassById(createdClass.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(createdClass.id);
      expect(result!.name).toEqual('Specific Class');
      expect(result!.grade_level).toEqual('Grade 12');
      expect(result!.homeroom_teacher_id).toEqual(users.teacher.id);
      expect(result!.created_at).toBeInstanceOf(Date);
    });
  });

  describe('getClassesByTeacher', () => {
    it('should reject invalid teacher ID', async () => {
      await expect(getClassesByTeacher(999)).rejects.toThrow(/invalid teacher/i);
    });

    it('should reject inactive teacher', async () => {
      const users = await createTestUsers();

      await expect(getClassesByTeacher(users.inactiveTeacher.id)).rejects.toThrow(/invalid teacher/i);
    });

    it('should reject non-teacher user', async () => {
      const users = await createTestUsers();

      await expect(getClassesByTeacher(users.studentUser.id)).rejects.toThrow(/invalid teacher/i);
    });

    it('should return empty array for teacher with no assignments', async () => {
      const users = await createTestUsers();

      const result = await getClassesByTeacher(users.teacher.id);

      expect(result).toEqual([]);
    });

    it('should return classes assigned to teacher', async () => {
      const users = await createTestUsers();

      // Create classes
      const class1Input: CreateClassInput = {
        name: 'Teacher Class 1',
        grade_level: 'Grade 10',
        homeroom_teacher_id: null
      };

      const class2Input: CreateClassInput = {
        name: 'Teacher Class 2',
        grade_level: 'Grade 11',
        homeroom_teacher_id: users.teacher.id
      };

      const class3Input: CreateClassInput = {
        name: 'Other Class',
        grade_level: 'Grade 9',
        homeroom_teacher_id: null
      };

      const createdClass1 = await createClass(class1Input);
      const createdClass2 = await createClass(class2Input);
      await createClass(class3Input); // Not assigned to teacher

      // Create teacher assignments
      await db.insert(teacherClassAssignmentsTable)
        .values({
          teacher_id: users.teacher.id,
          class_id: createdClass1.id,
          is_homeroom: false
        })
        .execute();

      await db.insert(teacherClassAssignmentsTable)
        .values({
          teacher_id: users.teacher.id,
          class_id: createdClass2.id,
          is_homeroom: true
        })
        .execute();

      const result = await getClassesByTeacher(users.teacher.id);

      expect(result).toHaveLength(2);
      
      // Find classes in result (order may vary)
      const classNames = result.map(c => c.name).sort();
      expect(classNames).toEqual(['Teacher Class 1', 'Teacher Class 2']);

      const class1Result = result.find(c => c.name === 'Teacher Class 1');
      const class2Result = result.find(c => c.name === 'Teacher Class 2');

      expect(class1Result!.grade_level).toEqual('Grade 10');
      expect(class1Result!.homeroom_teacher_id).toBeNull();
      expect(class2Result!.grade_level).toEqual('Grade 11');
      expect(class2Result!.homeroom_teacher_id).toEqual(users.teacher.id);
    });
  });
});