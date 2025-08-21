import { db } from '../db';
import { 
  attendanceRecordsTable, 
  studentsTable, 
  classesTable, 
  usersTable,
  teacherClassAssignmentsTable 
} from '../db/schema';
import { 
  type RecordAttendanceInput, 
  type UpdateAttendanceInput, 
  type AttendanceRecord,
  type AttendanceReportFilter 
} from '../schema';
import { eq, and, gte, lte, between, isNull, SQL } from 'drizzle-orm';

export async function recordAttendance(input: RecordAttendanceInput): Promise<AttendanceRecord> {
  try {
    // Validate that student exists and belongs to the class
    const student = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, input.student_id))
      .execute();

    if (student.length === 0) {
      throw new Error('Student not found');
    }

    if (student[0].class_id !== input.class_id) {
      throw new Error('Student does not belong to the specified class');
    }

    // Validate that the teacher is assigned to the class
    const teacherAssignment = await db.select()
      .from(teacherClassAssignmentsTable)
      .where(
        and(
          eq(teacherClassAssignmentsTable.teacher_id, input.recorded_by),
          eq(teacherClassAssignmentsTable.class_id, input.class_id)
        )
      )
      .execute();

    if (teacherAssignment.length === 0) {
      throw new Error('Teacher is not assigned to this class');
    }

    // Insert attendance record
    const result = await db.insert(attendanceRecordsTable)
      .values({
        student_id: input.student_id,
        class_id: input.class_id,
        date: new Date(input.date),
        status: input.status,
        check_in_time: input.check_in_time ? new Date(input.check_in_time) : null,
        check_out_time: input.check_out_time ? new Date(input.check_out_time) : null,
        notes: input.notes,
        recorded_by: input.recorded_by
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Attendance recording failed:', error);
    throw error;
  }
}

export async function updateAttendance(input: UpdateAttendanceInput): Promise<AttendanceRecord> {
  try {
    // Check if attendance record exists
    const existing = await db.select()
      .from(attendanceRecordsTable)
      .where(eq(attendanceRecordsTable.id, input.id))
      .execute();

    if (existing.length === 0) {
      throw new Error('Attendance record not found');
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (input.status !== undefined) updateData.status = input.status;
    if (input.check_in_time !== undefined) {
      updateData.check_in_time = input.check_in_time ? new Date(input.check_in_time) : null;
    }
    if (input.check_out_time !== undefined) {
      updateData.check_out_time = input.check_out_time ? new Date(input.check_out_time) : null;
    }
    if (input.notes !== undefined) updateData.notes = input.notes;

    const result = await db.update(attendanceRecordsTable)
      .set(updateData)
      .where(eq(attendanceRecordsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Attendance update failed:', error);
    throw error;
  }
}

export async function getAttendanceByClass(classId: number, date: string): Promise<AttendanceRecord[]> {
  try {
    const targetDate = new Date(date);
    
    const results = await db.select()
      .from(attendanceRecordsTable)
      .where(
        and(
          eq(attendanceRecordsTable.class_id, classId),
          eq(attendanceRecordsTable.date, targetDate)
        )
      )
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get attendance by class:', error);
    throw error;
  }
}

export async function getAttendanceByStudent(studentId: number, startDate?: string, endDate?: string): Promise<AttendanceRecord[]> {
  try {
    const conditions: SQL<unknown>[] = [
      eq(attendanceRecordsTable.student_id, studentId)
    ];

    if (startDate) {
      conditions.push(gte(attendanceRecordsTable.date, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(attendanceRecordsTable.date, new Date(endDate)));
    }

    const results = await db.select()
      .from(attendanceRecordsTable)
      .where(and(...conditions))
      .execute();
      
    return results;
  } catch (error) {
    console.error('Failed to get attendance by student:', error);
    throw error;
  }
}

export async function getAttendanceReport(filters: AttendanceReportFilter): Promise<AttendanceRecord[]> {
  try {
    const conditions: SQL<unknown>[] = [];

    if (filters.class_id) {
      conditions.push(eq(attendanceRecordsTable.class_id, filters.class_id));
    }

    if (filters.student_id) {
      conditions.push(eq(attendanceRecordsTable.student_id, filters.student_id));
    }

    if (filters.start_date) {
      conditions.push(gte(attendanceRecordsTable.date, new Date(filters.start_date)));
    }

    if (filters.end_date) {
      conditions.push(lte(attendanceRecordsTable.date, new Date(filters.end_date)));
    }

    if (filters.status) {
      conditions.push(eq(attendanceRecordsTable.status, filters.status));
    }

    const baseQuery = db.select().from(attendanceRecordsTable);
    
    const results = conditions.length > 0
      ? await baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions)).execute()
      : await baseQuery.execute();
      
    return results;
  } catch (error) {
    console.error('Failed to get attendance report:', error);
    throw error;
  }
}

export async function bulkRecordAttendance(records: RecordAttendanceInput[]): Promise<AttendanceRecord[]> {
  try {
    if (records.length === 0) {
      return [];
    }

    // Validate all students and teacher assignments before inserting
    for (const record of records) {
      const student = await db.select()
        .from(studentsTable)
        .where(eq(studentsTable.id, record.student_id))
        .execute();

      if (student.length === 0) {
        throw new Error(`Student with id ${record.student_id} not found`);
      }

      if (student[0].class_id !== record.class_id) {
        throw new Error(`Student ${record.student_id} does not belong to class ${record.class_id}`);
      }
    }

    // Validate teacher assignment (assuming all records are for the same teacher and class)
    const firstRecord = records[0];
    const teacherAssignment = await db.select()
      .from(teacherClassAssignmentsTable)
      .where(
        and(
          eq(teacherClassAssignmentsTable.teacher_id, firstRecord.recorded_by),
          eq(teacherClassAssignmentsTable.class_id, firstRecord.class_id)
        )
      )
      .execute();

    if (teacherAssignment.length === 0) {
      throw new Error('Teacher is not assigned to this class');
    }

    // Prepare bulk insert data
    const insertData = records.map(record => ({
      student_id: record.student_id,
      class_id: record.class_id,
      date: new Date(record.date),
      status: record.status,
      check_in_time: record.check_in_time ? new Date(record.check_in_time) : null,
      check_out_time: record.check_out_time ? new Date(record.check_out_time) : null,
      notes: record.notes,
      recorded_by: record.recorded_by
    }));

    const results = await db.insert(attendanceRecordsTable)
      .values(insertData)
      .returning()
      .execute();

    return results;
  } catch (error) {
    console.error('Bulk attendance recording failed:', error);
    throw error;
  }
}

export async function getAttendanceStats(classId?: number, startDate?: string, endDate?: string): Promise<{
  totalDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  sickDays: number;
  attendanceRate: number;
}> {
  try {
    const conditions: SQL<unknown>[] = [];

    if (classId) {
      conditions.push(eq(attendanceRecordsTable.class_id, classId));
    }

    if (startDate) {
      conditions.push(gte(attendanceRecordsTable.date, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(attendanceRecordsTable.date, new Date(endDate)));
    }

    const baseQuery = db.select().from(attendanceRecordsTable);
    
    const records = conditions.length > 0
      ? await baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions)).execute()
      : await baseQuery.execute();

    const totalDays = records.length;
    const presentDays = records.filter(r => r.status === 'present').length;
    const absentDays = records.filter(r => r.status === 'absent').length;
    const leaveDays = records.filter(r => r.status === 'leave').length;
    const sickDays = records.filter(r => r.status === 'sick').length;
    
    const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

    return {
      totalDays,
      presentDays,
      absentDays,
      leaveDays,
      sickDays,
      attendanceRate: Math.round(attendanceRate * 100) / 100 // Round to 2 decimal places
    };
  } catch (error) {
    console.error('Failed to get attendance stats:', error);
    throw error;
  }
}