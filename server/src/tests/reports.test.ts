import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  classesTable, 
  studentsTable, 
  attendanceRecordsTable 
} from '../db/schema';
import { type AttendanceReportFilter } from '../schema';
import { 
  generateAttendanceReport,
  getAttendanceSummaryReport 
} from '../handlers/reports';

describe('Reports Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should generate attendance report with all records when no filters applied', async () => {
    // Create test data
    const teacher = await db.insert(usersTable).values({
      username: 'teacher1',
      password_hash: 'hash123',
      full_name: 'Teacher One',
      email: 'teacher@school.edu',
      role: 'teacher'
    }).returning().execute();

    const testClass = await db.insert(classesTable).values({
      name: 'Grade 10A',
      grade_level: '10',
      homeroom_teacher_id: teacher[0].id
    }).returning().execute();

    const studentUser = await db.insert(usersTable).values({
      username: 'student1',
      password_hash: 'hash123',
      full_name: 'John Doe',
      email: null,
      role: 'student'
    }).returning().execute();

    const student = await db.insert(studentsTable).values({
      user_id: studentUser[0].id,
      nis_nisn: '123456',
      class_id: testClass[0].id
    }).returning().execute();

    const testDate = new Date('2024-01-15');
    await db.insert(attendanceRecordsTable).values({
      student_id: student[0].id,
      class_id: testClass[0].id,
      date: testDate,
      status: 'present',
      check_in_time: new Date('2024-01-15T08:00:00Z'),
      check_out_time: new Date('2024-01-15T15:00:00Z'),
      notes: null,
      recorded_by: teacher[0].id
    }).execute();

    const filters: AttendanceReportFilter = {};
    const result = await generateAttendanceReport(filters);

    expect(result).toHaveLength(1);
    expect(result[0].student_name).toEqual('John Doe');
    expect(result[0].nis_nisn).toEqual('123456');
    expect(result[0].class_name).toEqual('Grade 10A');
    expect(result[0].date).toEqual('2024-01-15');
    expect(result[0].status).toEqual('present');
    expect(result[0].check_in_time).toEqual('2024-01-15T08:00:00.000Z');
    expect(result[0].check_out_time).toEqual('2024-01-15T15:00:00.000Z');
  });

  it('should filter attendance report by class_id', async () => {
    // Create test data with multiple classes
    const teacher = await db.insert(usersTable).values({
      username: 'teacher1',
      password_hash: 'hash123',
      full_name: 'Teacher One',
      email: 'teacher@school.edu',
      role: 'teacher'
    }).returning().execute();

    const class1 = await db.insert(classesTable).values({
      name: 'Grade 10A',
      grade_level: '10',
      homeroom_teacher_id: teacher[0].id
    }).returning().execute();

    const class2 = await db.insert(classesTable).values({
      name: 'Grade 10B',
      grade_level: '10',
      homeroom_teacher_id: teacher[0].id
    }).returning().execute();

    const studentUser1 = await db.insert(usersTable).values({
      username: 'student1',
      password_hash: 'hash123',
      full_name: 'John Doe',
      email: null,
      role: 'student'
    }).returning().execute();

    const studentUser2 = await db.insert(usersTable).values({
      username: 'student2',
      password_hash: 'hash123',
      full_name: 'Jane Smith',
      email: null,
      role: 'student'
    }).returning().execute();

    const student1 = await db.insert(studentsTable).values({
      user_id: studentUser1[0].id,
      nis_nisn: '123456',
      class_id: class1[0].id
    }).returning().execute();

    const student2 = await db.insert(studentsTable).values({
      user_id: studentUser2[0].id,
      nis_nisn: '789012',
      class_id: class2[0].id
    }).returning().execute();

    // Create attendance records for both classes
    await db.insert(attendanceRecordsTable).values([
      {
        student_id: student1[0].id,
        class_id: class1[0].id,
        date: new Date('2024-01-15'),
        status: 'present',
        check_in_time: new Date('2024-01-15T08:00:00Z'),
        check_out_time: null,
        notes: null,
        recorded_by: teacher[0].id
      },
      {
        student_id: student2[0].id,
        class_id: class2[0].id,
        date: new Date('2024-01-15'),
        status: 'absent',
        check_in_time: null,
        check_out_time: null,
        notes: null,
        recorded_by: teacher[0].id
      }
    ]).execute();

    // Filter by class1 only
    const filters: AttendanceReportFilter = { class_id: class1[0].id };
    const result = await generateAttendanceReport(filters);

    expect(result).toHaveLength(1);
    expect(result[0].student_name).toEqual('John Doe');
    expect(result[0].class_name).toEqual('Grade 10A');
    expect(result[0].status).toEqual('present');
  });

  it('should filter attendance report by date range', async () => {
    // Create test data
    const teacher = await db.insert(usersTable).values({
      username: 'teacher1',
      password_hash: 'hash123',
      full_name: 'Teacher One',
      email: 'teacher@school.edu',
      role: 'teacher'
    }).returning().execute();

    const testClass = await db.insert(classesTable).values({
      name: 'Grade 10A',
      grade_level: '10',
      homeroom_teacher_id: teacher[0].id
    }).returning().execute();

    const studentUser = await db.insert(usersTable).values({
      username: 'student1',
      password_hash: 'hash123',
      full_name: 'John Doe',
      email: null,
      role: 'student'
    }).returning().execute();

    const student = await db.insert(studentsTable).values({
      user_id: studentUser[0].id,
      nis_nisn: '123456',
      class_id: testClass[0].id
    }).returning().execute();

    // Create attendance records for different dates
    await db.insert(attendanceRecordsTable).values([
      {
        student_id: student[0].id,
        class_id: testClass[0].id,
        date: new Date('2024-01-10'),
        status: 'present',
        check_in_time: new Date('2024-01-10T08:00:00Z'),
        check_out_time: null,
        notes: null,
        recorded_by: teacher[0].id
      },
      {
        student_id: student[0].id,
        class_id: testClass[0].id,
        date: new Date('2024-01-15'),
        status: 'absent',
        check_in_time: null,
        check_out_time: null,
        notes: null,
        recorded_by: teacher[0].id
      },
      {
        student_id: student[0].id,
        class_id: testClass[0].id,
        date: new Date('2024-01-20'),
        status: 'present',
        check_in_time: new Date('2024-01-20T08:00:00Z'),
        check_out_time: null,
        notes: null,
        recorded_by: teacher[0].id
      }
    ]).execute();

    // Filter by date range (2024-01-12 to 2024-01-18)
    const filters: AttendanceReportFilter = { 
      start_date: '2024-01-12', 
      end_date: '2024-01-18' 
    };
    const result = await generateAttendanceReport(filters);

    expect(result).toHaveLength(1);
    expect(result[0].date).toEqual('2024-01-15');
    expect(result[0].status).toEqual('absent');
  });

  it('should filter attendance report by status', async () => {
    // Create test data
    const teacher = await db.insert(usersTable).values({
      username: 'teacher1',
      password_hash: 'hash123',
      full_name: 'Teacher One',
      email: 'teacher@school.edu',
      role: 'teacher'
    }).returning().execute();

    const testClass = await db.insert(classesTable).values({
      name: 'Grade 10A',
      grade_level: '10',
      homeroom_teacher_id: teacher[0].id
    }).returning().execute();

    const studentUser = await db.insert(usersTable).values({
      username: 'student1',
      password_hash: 'hash123',
      full_name: 'John Doe',
      email: null,
      role: 'student'
    }).returning().execute();

    const student = await db.insert(studentsTable).values({
      user_id: studentUser[0].id,
      nis_nisn: '123456',
      class_id: testClass[0].id
    }).returning().execute();

    // Create attendance records with different statuses
    await db.insert(attendanceRecordsTable).values([
      {
        student_id: student[0].id,
        class_id: testClass[0].id,
        date: new Date('2024-01-15'),
        status: 'present',
        check_in_time: new Date('2024-01-15T08:00:00Z'),
        check_out_time: null,
        notes: null,
        recorded_by: teacher[0].id
      },
      {
        student_id: student[0].id,
        class_id: testClass[0].id,
        date: new Date('2024-01-16'),
        status: 'absent',
        check_in_time: null,
        check_out_time: null,
        notes: null,
        recorded_by: teacher[0].id
      },
      {
        student_id: student[0].id,
        class_id: testClass[0].id,
        date: new Date('2024-01-17'),
        status: 'sick',
        check_in_time: null,
        check_out_time: null,
        notes: 'Doctor visit',
        recorded_by: teacher[0].id
      }
    ]).execute();

    // Filter by 'absent' status only
    const filters: AttendanceReportFilter = { status: 'absent' };
    const result = await generateAttendanceReport(filters);

    expect(result).toHaveLength(1);
    expect(result[0].date).toEqual('2024-01-16');
    expect(result[0].status).toEqual('absent');
  });

  it('should generate attendance summary report correctly', async () => {
    // Create test data with multiple students and classes
    const teacher = await db.insert(usersTable).values({
      username: 'teacher1',
      password_hash: 'hash123',
      full_name: 'Teacher One',
      email: 'teacher@school.edu',
      role: 'teacher'
    }).returning().execute();

    const class1 = await db.insert(classesTable).values({
      name: 'Grade 10A',
      grade_level: '10',
      homeroom_teacher_id: teacher[0].id
    }).returning().execute();

    const class2 = await db.insert(classesTable).values({
      name: 'Grade 10B',
      grade_level: '10',
      homeroom_teacher_id: teacher[0].id
    }).returning().execute();

    const studentUser1 = await db.insert(usersTable).values({
      username: 'student1',
      password_hash: 'hash123',
      full_name: 'John Doe',
      email: null,
      role: 'student'
    }).returning().execute();

    const studentUser2 = await db.insert(usersTable).values({
      username: 'student2',
      password_hash: 'hash123',
      full_name: 'Jane Smith',
      email: null,
      role: 'student'
    }).returning().execute();

    const student1 = await db.insert(studentsTable).values({
      user_id: studentUser1[0].id,
      nis_nisn: '123456',
      class_id: class1[0].id
    }).returning().execute();

    const student2 = await db.insert(studentsTable).values({
      user_id: studentUser2[0].id,
      nis_nisn: '789012',
      class_id: class2[0].id
    }).returning().execute();

    // Create various attendance records
    await db.insert(attendanceRecordsTable).values([
      // Class 1 records
      {
        student_id: student1[0].id,
        class_id: class1[0].id,
        date: new Date('2024-01-15'),
        status: 'present',
        check_in_time: new Date('2024-01-15T08:00:00Z'),
        check_out_time: null,
        notes: null,
        recorded_by: teacher[0].id
      },
      {
        student_id: student1[0].id,
        class_id: class1[0].id,
        date: new Date('2024-01-16'),
        status: 'absent',
        check_in_time: null,
        check_out_time: null,
        notes: null,
        recorded_by: teacher[0].id
      },
      // Class 2 records
      {
        student_id: student2[0].id,
        class_id: class2[0].id,
        date: new Date('2024-01-15'),
        status: 'present',
        check_in_time: new Date('2024-01-15T08:00:00Z'),
        check_out_time: null,
        notes: null,
        recorded_by: teacher[0].id
      },
      {
        student_id: student2[0].id,
        class_id: class2[0].id,
        date: new Date('2024-01-16'),
        status: 'sick',
        check_in_time: null,
        check_out_time: null,
        notes: 'Flu',
        recorded_by: teacher[0].id
      }
    ]).execute();

    const filters: AttendanceReportFilter = {};
    const result = await getAttendanceSummaryReport(filters);

    expect(result.total_students).toEqual(2);
    expect(result.present_count).toEqual(2);
    expect(result.absent_count).toEqual(1);
    expect(result.sick_count).toEqual(1);
    expect(result.leave_count).toEqual(0);
    expect(result.overall_attendance_rate).toEqual(50); // 2 present out of 4 total records
    expect(result.class_summaries).toHaveLength(2);
    
    // Check class summaries
    const class1Summary = result.class_summaries.find(s => s.class_name === 'Grade 10A');
    const class2Summary = result.class_summaries.find(s => s.class_name === 'Grade 10B');
    
    expect(class1Summary).toBeDefined();
    expect(class1Summary!.student_count).toEqual(1);
    expect(class1Summary!.attendance_rate).toEqual(50); // 1 present out of 2 records
    
    expect(class2Summary).toBeDefined();
    expect(class2Summary!.student_count).toEqual(1);
    expect(class2Summary!.attendance_rate).toEqual(50); // 1 present out of 2 records
  });

  it('should handle empty results for attendance summary', async () => {
    const filters: AttendanceReportFilter = {};
    const result = await getAttendanceSummaryReport(filters);

    expect(result.total_students).toEqual(0);
    expect(result.total_days).toEqual(0);
    expect(result.present_count).toEqual(0);
    expect(result.absent_count).toEqual(0);
    expect(result.leave_count).toEqual(0);
    expect(result.sick_count).toEqual(0);
    expect(result.overall_attendance_rate).toEqual(0);
    expect(result.class_summaries).toHaveLength(0);
  });

  it('should handle multiple conditions in attendance report filter', async () => {
    // Create test data
    const teacher = await db.insert(usersTable).values({
      username: 'teacher1',
      password_hash: 'hash123',
      full_name: 'Teacher One',
      email: 'teacher@school.edu',
      role: 'teacher'
    }).returning().execute();

    const testClass = await db.insert(classesTable).values({
      name: 'Grade 10A',
      grade_level: '10',
      homeroom_teacher_id: teacher[0].id
    }).returning().execute();

    const studentUser1 = await db.insert(usersTable).values({
      username: 'student1',
      password_hash: 'hash123',
      full_name: 'John Doe',
      email: null,
      role: 'student'
    }).returning().execute();

    const studentUser2 = await db.insert(usersTable).values({
      username: 'student2',
      password_hash: 'hash123',
      full_name: 'Jane Smith',
      email: null,
      role: 'student'
    }).returning().execute();

    const student1 = await db.insert(studentsTable).values({
      user_id: studentUser1[0].id,
      nis_nisn: '123456',
      class_id: testClass[0].id
    }).returning().execute();

    const student2 = await db.insert(studentsTable).values({
      user_id: studentUser2[0].id,
      nis_nisn: '789012',
      class_id: testClass[0].id
    }).returning().execute();

    await db.insert(attendanceRecordsTable).values([
      {
        student_id: student1[0].id,
        class_id: testClass[0].id,
        date: new Date('2024-01-15'),
        status: 'absent',
        check_in_time: null,
        check_out_time: null,
        notes: null,
        recorded_by: teacher[0].id
      },
      {
        student_id: student2[0].id,
        class_id: testClass[0].id,
        date: new Date('2024-01-15'),
        status: 'present',
        check_in_time: new Date('2024-01-15T08:00:00Z'),
        check_out_time: null,
        notes: null,
        recorded_by: teacher[0].id
      },
      {
        student_id: student1[0].id,
        class_id: testClass[0].id,
        date: new Date('2024-01-16'),
        status: 'absent',
        check_in_time: null,
        check_out_time: null,
        notes: null,
        recorded_by: teacher[0].id
      }
    ]).execute();

    // Filter by class, student, date and status
    const filters: AttendanceReportFilter = { 
      class_id: testClass[0].id,
      student_id: student1[0].id,
      start_date: '2024-01-15',
      end_date: '2024-01-15',
      status: 'absent'
    };
    const result = await generateAttendanceReport(filters);

    expect(result).toHaveLength(1);
    expect(result[0].student_name).toEqual('John Doe');
    expect(result[0].date).toEqual('2024-01-15');
    expect(result[0].status).toEqual('absent');
  });
});