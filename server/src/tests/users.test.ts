import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type UpdateUserInput } from '../schema';
import { 
  createUser, 
  updateUser, 
  deleteUser, 
  getAllUsers, 
  getUsersByRole, 
  getUserById 
} from '../handlers/users';
import { eq } from 'drizzle-orm';

// Test input data
const testUserInput: CreateUserInput = {
  username: 'testuser',
  password: 'password123',
  full_name: 'Test User',
  email: 'test@example.com',
  role: 'student'
};

const testTeacherInput: CreateUserInput = {
  username: 'teacher1',
  password: 'teacherpass',
  full_name: 'Teacher One',
  email: 'teacher@example.com',
  role: 'teacher'
};

const testAdminInput: CreateUserInput = {
  username: 'admin1',
  password: 'adminpass',
  full_name: 'Admin User',
  email: null,
  role: 'administrator'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with all fields', async () => {
    const result = await createUser(testUserInput);

    expect(result.username).toEqual('testuser');
    expect(result.full_name).toEqual('Test User');
    expect(result.email).toEqual('test@example.com');
    expect(result.role).toEqual('student');
    expect(result.is_active).toEqual(true);
    expect(result.password_hash).toEqual('hashed_password123');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a user with null email', async () => {
    const result = await createUser(testAdminInput);

    expect(result.username).toEqual('admin1');
    expect(result.email).toBeNull();
    expect(result.role).toEqual('administrator');
  });

  it('should save user to database', async () => {
    const result = await createUser(testUserInput);

    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].username).toEqual('testuser');
    expect(users[0].full_name).toEqual('Test User');
    expect(users[0].role).toEqual('student');
    expect(users[0].is_active).toEqual(true);
  });

  it('should handle duplicate username error', async () => {
    await createUser(testUserInput);
    
    expect(createUser(testUserInput)).rejects.toThrow();
  });
});

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update user fields', async () => {
    const created = await createUser(testUserInput);
    
    const updateInput: UpdateUserInput = {
      id: created.id,
      full_name: 'Updated Name',
      email: 'updated@example.com',
      role: 'teacher'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(created.id);
    expect(result.full_name).toEqual('Updated Name');
    expect(result.email).toEqual('updated@example.com');
    expect(result.role).toEqual('teacher');
    expect(result.username).toEqual('testuser'); // unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update password', async () => {
    const created = await createUser(testUserInput);
    
    const updateInput: UpdateUserInput = {
      id: created.id,
      password: 'newpassword123'
    };

    const result = await updateUser(updateInput);

    expect(result.password_hash).toEqual('hashed_newpassword123');
  });

  it('should update is_active status', async () => {
    const created = await createUser(testUserInput);
    
    const updateInput: UpdateUserInput = {
      id: created.id,
      is_active: false
    };

    const result = await updateUser(updateInput);

    expect(result.is_active).toEqual(false);
  });

  it('should save changes to database', async () => {
    const created = await createUser(testUserInput);
    
    const updateInput: UpdateUserInput = {
      id: created.id,
      full_name: 'Database Updated'
    };

    await updateUser(updateInput);

    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, created.id))
      .execute();

    expect(users[0].full_name).toEqual('Database Updated');
  });

  it('should throw error for non-existent user', async () => {
    const updateInput: UpdateUserInput = {
      id: 999,
      full_name: 'Non-existent'
    };

    expect(updateUser(updateInput)).rejects.toThrow(/not found/i);
  });
});

describe('deleteUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should soft delete user', async () => {
    const created = await createUser(testUserInput);
    
    const result = await deleteUser(created.id);

    expect(result.success).toEqual(true);

    // Verify user is marked as inactive
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, created.id))
      .execute();

    expect(users[0].is_active).toEqual(false);
  });

  it('should throw error for non-existent user', async () => {
    expect(deleteUser(999)).rejects.toThrow(/not found/i);
  });
});

describe('getAllUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getAllUsers();

    expect(result).toEqual([]);
  });

  it('should return all users', async () => {
    await createUser(testUserInput);
    await createUser(testTeacherInput);
    await createUser(testAdminInput);

    const result = await getAllUsers();

    expect(result).toHaveLength(3);
    expect(result.map(u => u.username)).toContain('testuser');
    expect(result.map(u => u.username)).toContain('teacher1');
    expect(result.map(u => u.username)).toContain('admin1');
  });

  it('should include inactive users', async () => {
    const created = await createUser(testUserInput);
    await deleteUser(created.id); // soft delete

    const result = await getAllUsers();

    expect(result).toHaveLength(1);
    expect(result[0].is_active).toEqual(false);
  });
});

describe('getUsersByRole', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return users filtered by role', async () => {
    await createUser(testUserInput); // student
    await createUser(testTeacherInput); // teacher
    await createUser(testAdminInput); // administrator

    const students = await getUsersByRole('student');
    expect(students).toHaveLength(1);
    expect(students[0].role).toEqual('student');

    const teachers = await getUsersByRole('teacher');
    expect(teachers).toHaveLength(1);
    expect(teachers[0].role).toEqual('teacher');

    const admins = await getUsersByRole('administrator');
    expect(admins).toHaveLength(1);
    expect(admins[0].role).toEqual('administrator');
  });

  it('should return empty array for role with no users', async () => {
    await createUser(testUserInput); // only create student

    const teachers = await getUsersByRole('teacher');
    expect(teachers).toEqual([]);
  });

  it('should include inactive users in role filter', async () => {
    const created = await createUser(testUserInput);
    await deleteUser(created.id); // soft delete

    const students = await getUsersByRole('student');
    expect(students).toHaveLength(1);
    expect(students[0].is_active).toEqual(false);
  });
});

describe('getUserById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user by ID', async () => {
    const created = await createUser(testUserInput);

    const result = await getUserById(created.id);

    expect(result).toBeDefined();
    expect(result!.id).toEqual(created.id);
    expect(result!.username).toEqual('testuser');
    expect(result!.full_name).toEqual('Test User');
  });

  it('should return null for non-existent user', async () => {
    const result = await getUserById(999);

    expect(result).toBeNull();
  });

  it('should return inactive user', async () => {
    const created = await createUser(testUserInput);
    await deleteUser(created.id); // soft delete

    const result = await getUserById(created.id);

    expect(result).toBeDefined();
    expect(result!.is_active).toEqual(false);
  });
});