import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, siswaTable, kelasTable } from '../db/schema';
import { getSiswa } from '../handlers/siswa';

describe('getSiswa', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no siswa exist', async () => {
    const result = await getSiswa();
    expect(result).toEqual([]);
  });

  it('should return all siswa records', async () => {
    // Create prerequisite data first
    const [user1] = await db.insert(usersTable)
      .values({
        username: 'siswa1',
        password_hash: 'hash1',
        role: 'siswa'
      })
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values({
        username: 'siswa2',
        password_hash: 'hash2',
        role: 'siswa'
      })
      .returning()
      .execute();

    const [kelas] = await db.insert(kelasTable)
      .values({
        nama_kelas: 'X-1',
        wali_kelas_id: null
      })
      .returning()
      .execute();

    // Create siswa records
    const siswa1 = await db.insert(siswaTable)
      .values({
        user_id: user1.id,
        nisn: '1234567890',
        nama: 'Test Siswa 1',
        kelas_id: kelas.id,
        foto: null
      })
      .returning()
      .execute();

    const siswa2 = await db.insert(siswaTable)
      .values({
        user_id: user2.id,
        nisn: '1234567891',
        nama: 'Test Siswa 2',
        kelas_id: kelas.id,
        foto: 'photo.jpg'
      })
      .returning()
      .execute();

    const result = await getSiswa();

    expect(result).toHaveLength(2);
    
    // Check first siswa
    const foundSiswa1 = result.find(s => s.nisn === '1234567890');
    expect(foundSiswa1).toBeDefined();
    expect(foundSiswa1?.nama).toEqual('Test Siswa 1');
    expect(foundSiswa1?.user_id).toEqual(user1.id);
    expect(foundSiswa1?.kelas_id).toEqual(kelas.id);
    expect(foundSiswa1?.foto).toBeNull();
    expect(foundSiswa1?.created_at).toBeInstanceOf(Date);
    expect(foundSiswa1?.updated_at).toBeInstanceOf(Date);

    // Check second siswa
    const foundSiswa2 = result.find(s => s.nisn === '1234567891');
    expect(foundSiswa2).toBeDefined();
    expect(foundSiswa2?.nama).toEqual('Test Siswa 2');
    expect(foundSiswa2?.user_id).toEqual(user2.id);
    expect(foundSiswa2?.kelas_id).toEqual(kelas.id);
    expect(foundSiswa2?.foto).toEqual('photo.jpg');
    expect(foundSiswa2?.created_at).toBeInstanceOf(Date);
    expect(foundSiswa2?.updated_at).toBeInstanceOf(Date);
  });

  it('should return siswa records with all required fields', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values({
        username: 'siswa123',
        password_hash: 'hashed_password',
        role: 'siswa'
      })
      .returning()
      .execute();

    const [kelas] = await db.insert(kelasTable)
      .values({
        nama_kelas: 'XI-2',
        wali_kelas_id: null
      })
      .returning()
      .execute();

    // Create siswa with complete data
    await db.insert(siswaTable)
      .values({
        user_id: user.id,
        nisn: '9876543210',
        nama: 'Complete Siswa Data',
        kelas_id: kelas.id,
        foto: 'complete_photo.png'
      })
      .execute();

    const result = await getSiswa();

    expect(result).toHaveLength(1);
    const siswa = result[0];

    // Verify all required fields are present
    expect(siswa.id).toBeDefined();
    expect(typeof siswa.id).toBe('number');
    expect(siswa.user_id).toEqual(user.id);
    expect(siswa.nisn).toEqual('9876543210');
    expect(siswa.nama).toEqual('Complete Siswa Data');
    expect(siswa.kelas_id).toEqual(kelas.id);
    expect(siswa.foto).toEqual('complete_photo.png');
    expect(siswa.created_at).toBeInstanceOf(Date);
    expect(siswa.updated_at).toBeInstanceOf(Date);
  });

  it('should handle multiple siswa with mixed foto values', async () => {
    // Create prerequisite data
    const users = await db.insert(usersTable)
      .values([
        { username: 'user1', password_hash: 'hash1', role: 'siswa' },
        { username: 'user2', password_hash: 'hash2', role: 'siswa' },
        { username: 'user3', password_hash: 'hash3', role: 'siswa' }
      ])
      .returning()
      .execute();

    const [kelas] = await db.insert(kelasTable)
      .values({
        nama_kelas: 'XII-1',
        wali_kelas_id: null
      })
      .returning()
      .execute();

    // Create siswa with different foto scenarios
    await db.insert(siswaTable)
      .values([
        {
          user_id: users[0].id,
          nisn: '1111111111',
          nama: 'Siswa With Photo',
          kelas_id: kelas.id,
          foto: 'has_photo.jpg'
        },
        {
          user_id: users[1].id,
          nisn: '2222222222',
          nama: 'Siswa Without Photo',
          kelas_id: kelas.id,
          foto: null
        },
        {
          user_id: users[2].id,
          nisn: '3333333333',
          nama: 'Siswa No Photo Field',
          kelas_id: kelas.id
          // foto field not specified, should default to null
        }
      ])
      .execute();

    const result = await getSiswa();

    expect(result).toHaveLength(3);

    const withPhoto = result.find(s => s.nisn === '1111111111');
    expect(withPhoto?.foto).toEqual('has_photo.jpg');

    const withoutPhoto = result.find(s => s.nisn === '2222222222');
    expect(withoutPhoto?.foto).toBeNull();

    const noPhotoField = result.find(s => s.nisn === '3333333333');
    expect(noPhotoField?.foto).toBeNull();
  });

  it('should maintain proper ordering by id', async () => {
    // Create prerequisite data
    const users = await db.insert(usersTable)
      .values([
        { username: 'third', password_hash: 'hash3', role: 'siswa' },
        { username: 'first', password_hash: 'hash1', role: 'siswa' },
        { username: 'second', password_hash: 'hash2', role: 'siswa' }
      ])
      .returning()
      .execute();

    const [kelas] = await db.insert(kelasTable)
      .values({
        nama_kelas: 'X-3',
        wali_kelas_id: null
      })
      .returning()
      .execute();

    // Insert in different order than username
    await db.insert(siswaTable)
      .values([
        { user_id: users[0].id, nisn: 'C333', nama: 'Third Student', kelas_id: kelas.id },
        { user_id: users[1].id, nisn: 'A111', nama: 'First Student', kelas_id: kelas.id },
        { user_id: users[2].id, nisn: 'B222', nama: 'Second Student', kelas_id: kelas.id }
      ])
      .execute();

    const result = await getSiswa();

    expect(result).toHaveLength(3);
    
    // Should be ordered by ID (insertion order in this case)
    expect(result[0].nama).toEqual('Third Student');
    expect(result[1].nama).toEqual('First Student');
    expect(result[2].nama).toEqual('Second Student');

    // Verify IDs are in ascending order
    expect(result[0].id < result[1].id).toBe(true);
    expect(result[1].id < result[2].id).toBe(true);
  });
});