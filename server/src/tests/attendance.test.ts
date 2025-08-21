import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  classesTable, 
  studentsTable, 
  attendanceRecordsTable, 
  teacherClassAssignmentsTable 
} from '../db/schema';
import { 
  type RecordAttendanceInput,
  type UpdateAttendanceInput,
  type AttendanceReportFilter
} from '../schema';
import {
  recordAttendance,
  updateAttendance,
  getAttendanceByClass,
  getAttendanceByStudent,
  getAttendanceReport,
  bulkRecordAttendance,
  getAttendanceStats
} from '../handlers/attendance';
import { eq } from 'drizzle-orm';

// Test data setup
let testTeacher: any;
let testStudent: any;
let testClass: any;
let testUser: any;

const setupTestData = async () => {
  // Create test teacher
  const teacherResult = await db.insert(usersTable)
    .values({
      username: 'teacher1',
      password_hash: 'hashed_password',
      full_name: 'Test Teacher',
      email: 'teacher@test.com',
      role: 'teacher'
    })
    .returning()
    .execute();
  testTeacher = teacherResult[0];

  // Create test class
  const classResult = await db.insert(classesTable)
    .values({
      name: '10A',
      grade_level: '10',
      homeroom_teacher_id: testTeacher.id
    })
    .returning()
    .execute();
  testClass = classResult[0];

  // Create test user for student
  const userResult = await db.insert(usersTable)
    .values({
      username: 'student1',
      password_hash: 'hashed_password',
      full_name: 'Test Student',
      email: 'student@test.com',
      role: 'student'
    })
    .returning()
    .execute();
  testUser = userResult[0];

  // Create test student
  const studentResult = await db.insert(studentsTable)
    .values({
      user_id: testUser.id,
      nis_nisn: '12345678',
      class_id: testClass.id
    })
    .returning()
    .execute();
  testStudent = studentResult[0];

  // Assign teacher to class
  await db.insert(teacherClassAssignmentsTable)
    .values({
      teacher_id: testTeacher.id,
      class_id: testClass.id,
      is_homeroom: true
    })
    .execute();
};

const testAttendanceInput: RecordAttendanceInput = {
  student_id: 1, // Will be updated in tests
  class_id: 1, // Will be updated in tests
  date: '2023-12-01',
  status: 'present',
  check_in_time: '2023-12-01T08:00:00Z',
  check_out_time: '2023-12-01T15:00:00Z',
  notes: 'On time',
  recorded_by: 1 // Will be updated in tests
};

describe('recordAttendance', () => {
  beforeEach(async () => {
    await createDB();
    await setupTestData();
  });
  afterEach(resetDB);

  it('should record attendance successfully', async () => {
    const input = {
      ...testAttendanceInput,
      student_id: testStudent.id,
      class_id: testClass.id,
      recorded_by: testTeacher.id
    };

    const result = await recordAttendance(input);

    expect(result.student_id).toEqual(testStudent.id);
    expect(result.class_id).toEqual(testClass.id);
    expect(result.status).toEqual('present');
    expect(result.recorded_by).toEqual(testTeacher.id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.date).toBeInstanceOf(Date);
    expect(result.check_in_time).toBeInstanceOf(Date);
    expect(result.check_out_time).toBeInstanceOf(Date);
  });

  it('should save attendance to database', async () => {
    const input = {
      ...testAttendanceInput,
      student_id: testStudent.id,
      class_id: testClass.id,
      recorded_by: testTeacher.id
    };

    const result = await recordAttendance(input);

    const saved = await db.select()
      .from(attendanceRecordsTable)
      .where(eq(attendanceRecordsTable.id, result.id))
      .execute();

    expect(saved).toHaveLength(1);
    expect(saved[0].student_id).toEqual(testStudent.id);
    expect(saved[0].status).toEqual('present');
    expect(saved[0].notes).toEqual('On time');
  });

  it('should throw error for non-existent student', async () => {
    const input = {
      ...testAttendanceInput,
      student_id: 99999,
      class_id: testClass.id,
      recorded_by: testTeacher.id
    };

    await expect(recordAttendance(input)).rejects.toThrow(/student not found/i);
  });

  it('should throw error when student does not belong to class', async () => {
    // Create another class
    const anotherClass = await db.insert(classesTable)
      .values({
        name: '10B',
        grade_level: '10',
        homeroom_teacher_id: testTeacher.id
      })
      .returning()
      .execute();

    const input = {
      ...testAttendanceInput,
      student_id: testStudent.id,
      class_id: anotherClass[0].id,
      recorded_by: testTeacher.id
    };

    await expect(recordAttendance(input)).rejects.toThrow(/student does not belong to the specified class/i);
  });

  it('should throw error when teacher is not assigned to class', async () => {
    // Create another teacher not assigned to the class
    const anotherTeacher = await db.insert(usersTable)
      .values({
        username: 'teacher2',
        password_hash: 'hashed_password',
        full_name: 'Another Teacher',
        email: 'teacher2@test.com',
        role: 'teacher'
      })
      .returning()
      .execute();

    const input = {
      ...testAttendanceInput,
      student_id: testStudent.id,
      class_id: testClass.id,
      recorded_by: anotherTeacher[0].id
    };

    await expect(recordAttendance(input)).rejects.toThrow(/teacher is not assigned to this class/i);
  });

  it('should handle attendance without check times', async () => {
    const input = {
      student_id: testStudent.id,
      class_id: testClass.id,
      date: '2023-12-01',
      status: 'absent' as const,
      check_in_time: null,
      check_out_time: null,
      notes: 'Absent without notice',
      recorded_by: testTeacher.id
    };

    const result = await recordAttendance(input);

    expect(result.status).toEqual('absent');
    expect(result.check_in_time).toBeNull();
    expect(result.check_out_time).toBeNull();
  });
});

describe('updateAttendance', () => {
  beforeEach(async () => {
    await createDB();
    await setupTestData();
  });
  afterEach(resetDB);

  it('should update attendance successfully', async () => {
    // First create an attendance record
    const createInput = {
      ...testAttendanceInput,
      student_id: testStudent.id,
      class_id: testClass.id,
      recorded_by: testTeacher.id
    };
    const created = await recordAttendance(createInput);

    const updateInput: UpdateAttendanceInput = {
      id: created.id,
      status: 'absent', // Testing with a different status
      notes: 'Updated notes'
    };

    const result = await updateAttendance(updateInput);

    expect(result.id).toEqual(created.id);
    expect(result.notes).toEqual('Updated notes');
    expect(result.student_id).toEqual(testStudent.id);
  });

  it('should throw error for non-existent attendance record', async () => {
    const updateInput: UpdateAttendanceInput = {
      id: 99999,
      status: 'present',
      notes: 'Updated notes'
    };

    await expect(updateAttendance(updateInput)).rejects.toThrow(/attendance record not found/i);
  });

  it('should update only provided fields', async () => {
    // Create attendance record
    const createInput = {
      ...testAttendanceInput,
      student_id: testStudent.id,
      class_id: testClass.id,
      recorded_by: testTeacher.id
    };
    const created = await recordAttendance(createInput);

    // Update only notes
    const updateInput: UpdateAttendanceInput = {
      id: created.id,
      notes: 'Only notes updated'
    };

    const result = await updateAttendance(updateInput);

    expect(result.notes).toEqual('Only notes updated');
    expect(result.status).toEqual('present'); // Should remain unchanged
  });
});

describe('getAttendanceByClass', () => {
  beforeEach(async () => {
    await createDB();
    await setupTestData();
  });
  afterEach(resetDB);

  it('should get attendance records for a class and date', async () => {
    // Create attendance records
    const input1 = {
      ...testAttendanceInput,
      student_id: testStudent.id,
      class_id: testClass.id,
      recorded_by: testTeacher.id
    };
    await recordAttendance(input1);

    const results = await getAttendanceByClass(testClass.id, '2023-12-01');

    expect(results).toHaveLength(1);
    expect(results[0].student_id).toEqual(testStudent.id);
    expect(results[0].class_id).toEqual(testClass.id);
  });

  it('should return empty array for no records', async () => {
    const results = await getAttendanceByClass(testClass.id, '2023-12-02');

    expect(results).toHaveLength(0);
  });
});

describe('getAttendanceByStudent', () => {
  beforeEach(async () => {
    await createDB();
    await setupTestData();
  });
  afterEach(resetDB);

  it('should get attendance records for a student', async () => {
    // Create multiple attendance records
    const input1 = {
      ...testAttendanceInput,
      student_id: testStudent.id,
      class_id: testClass.id,
      recorded_by: testTeacher.id,
      date: '2023-12-01'
    };
    const input2 = {
      ...testAttendanceInput,
      student_id: testStudent.id,
      class_id: testClass.id,
      recorded_by: testTeacher.id,
      date: '2023-12-02'
    };

    await recordAttendance(input1);
    await recordAttendance(input2);

    const results = await getAttendanceByStudent(testStudent.id);

    expect(results).toHaveLength(2);
    expect(results[0].student_id).toEqual(testStudent.id);
  });

  it('should filter by date range', async () => {
    // Create attendance records with different dates
    const input1 = {
      ...testAttendanceInput,
      student_id: testStudent.id,
      class_id: testClass.id,
      recorded_by: testTeacher.id,
      date: '2023-11-30'
    };
    const input2 = {
      ...testAttendanceInput,
      student_id: testStudent.id,
      class_id: testClass.id,
      recorded_by: testTeacher.id,
      date: '2023-12-01'
    };
    const input3 = {
      ...testAttendanceInput,
      student_id: testStudent.id,
      class_id: testClass.id,
      recorded_by: testTeacher.id,
      date: '2023-12-02'
    };

    await recordAttendance(input1);
    await recordAttendance(input2);
    await recordAttendance(input3);

    const results = await getAttendanceByStudent(testStudent.id, '2023-12-01', '2023-12-01');

    expect(results).toHaveLength(1);
    expect(new Date(results[0].date).toISOString().split('T')[0]).toEqual('2023-12-01');
  });
});

describe('getAttendanceReport', () => {
  beforeEach(async () => {
    await createDB();
    await setupTestData();
  });
  afterEach(resetDB);

  it('should get attendance report with filters', async () => {
    // Create attendance records
    const input1 = {
      ...testAttendanceInput,
      student_id: testStudent.id,
      class_id: testClass.id,
      recorded_by: testTeacher.id,
      status: 'present' as const
    };
    const input2 = {
      ...testAttendanceInput,
      student_id: testStudent.id,
      class_id: testClass.id,
      recorded_by: testTeacher.id,
      date: '2023-12-02',
      status: 'absent' as const
    };

    await recordAttendance(input1);
    await recordAttendance(input2);

    const filters: AttendanceReportFilter = {
      class_id: testClass.id,
      status: 'present'
    };

    const results = await getAttendanceReport(filters);

    expect(results).toHaveLength(1);
    expect(results[0].status).toEqual('present');
  });

  it('should return all records when no filters applied', async () => {
    // Create attendance records
    const input1 = {
      ...testAttendanceInput,
      student_id: testStudent.id,
      class_id: testClass.id,
      recorded_by: testTeacher.id
    };

    await recordAttendance(input1);

    const results = await getAttendanceReport({});

    expect(results).toHaveLength(1);
  });
});

describe('bulkRecordAttendance', () => {
  beforeEach(async () => {
    await createDB();
    await setupTestData();
  });
  afterEach(resetDB);

  it('should record multiple attendance records', async () => {
    // Create another student
    const user2 = await db.insert(usersTable)
      .values({
        username: 'student2',
        password_hash: 'hashed_password',
        full_name: 'Test Student 2',
        email: 'student2@test.com',
        role: 'student'
      })
      .returning()
      .execute();

    const student2 = await db.insert(studentsTable)
      .values({
        user_id: user2[0].id,
        nis_nisn: '87654321',
        class_id: testClass.id
      })
      .returning()
      .execute();

    const records: RecordAttendanceInput[] = [
      {
        ...testAttendanceInput,
        student_id: testStudent.id,
        class_id: testClass.id,
        recorded_by: testTeacher.id
      },
      {
        ...testAttendanceInput,
        student_id: student2[0].id,
        class_id: testClass.id,
        recorded_by: testTeacher.id,
        status: 'absent'
      }
    ];

    const results = await bulkRecordAttendance(records);

    expect(results).toHaveLength(2);
    expect(results[0].student_id).toEqual(testStudent.id);
    expect(results[1].student_id).toEqual(student2[0].id);
    expect(results[1].status).toEqual('absent');
  });

  it('should return empty array for empty input', async () => {
    const results = await bulkRecordAttendance([]);
    expect(results).toHaveLength(0);
  });

  it('should throw error if any student validation fails', async () => {
    const records: RecordAttendanceInput[] = [
      {
        ...testAttendanceInput,
        student_id: 99999, // Non-existent student
        class_id: testClass.id,
        recorded_by: testTeacher.id
      }
    ];

    await expect(bulkRecordAttendance(records)).rejects.toThrow(/student.*not found/i);
  });
});

describe('getAttendanceStats', () => {
  beforeEach(async () => {
    await createDB();
    await setupTestData();
  });
  afterEach(resetDB);

  it('should calculate attendance statistics correctly', async () => {
    // Create various attendance records
    const records: RecordAttendanceInput[] = [
      {
        ...testAttendanceInput,
        student_id: testStudent.id,
        class_id: testClass.id,
        recorded_by: testTeacher.id,
        date: '2023-12-01',
        status: 'present'
      },
      {
        ...testAttendanceInput,
        student_id: testStudent.id,
        class_id: testClass.id,
        recorded_by: testTeacher.id,
        date: '2023-12-02',
        status: 'absent'
      },
      {
        ...testAttendanceInput,
        student_id: testStudent.id,
        class_id: testClass.id,
        recorded_by: testTeacher.id,
        date: '2023-12-03',
        status: 'sick'
      },
      {
        ...testAttendanceInput,
        student_id: testStudent.id,
        class_id: testClass.id,
        recorded_by: testTeacher.id,
        date: '2023-12-04',
        status: 'leave'
      }
    ];

    await bulkRecordAttendance(records);

    const stats = await getAttendanceStats(testClass.id);

    expect(stats.totalDays).toEqual(4);
    expect(stats.presentDays).toEqual(1);
    expect(stats.absentDays).toEqual(1);
    expect(stats.sickDays).toEqual(1);
    expect(stats.leaveDays).toEqual(1);
    expect(stats.attendanceRate).toEqual(25); // 1/4 * 100
  });

  it('should filter by date range', async () => {
    // Create attendance records
    const records: RecordAttendanceInput[] = [
      {
        ...testAttendanceInput,
        student_id: testStudent.id,
        class_id: testClass.id,
        recorded_by: testTeacher.id,
        date: '2023-11-30',
        status: 'present'
      },
      {
        ...testAttendanceInput,
        student_id: testStudent.id,
        class_id: testClass.id,
        recorded_by: testTeacher.id,
        date: '2023-12-01',
        status: 'present'
      }
    ];

    await bulkRecordAttendance(records);

    const stats = await getAttendanceStats(testClass.id, '2023-12-01', '2023-12-01');

    expect(stats.totalDays).toEqual(1);
    expect(stats.presentDays).toEqual(1);
    expect(stats.attendanceRate).toEqual(100);
  });

  it('should return zero stats for no records', async () => {
    const stats = await getAttendanceStats(testClass.id);

    expect(stats.totalDays).toEqual(0);
    expect(stats.presentDays).toEqual(0);
    expect(stats.absentDays).toEqual(0);
    expect(stats.sickDays).toEqual(0);
    expect(stats.leaveDays).toEqual(0);
    expect(stats.attendanceRate).toEqual(0);
  });
});