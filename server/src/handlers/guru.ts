import { type CreateGuruInput, type UpdateGuruInput, type Guru, type UpdateProfileInput } from '../schema';

export async function createGuru(input: CreateGuruInput): Promise<Guru> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to create a new guru record
    // Should validate NIP uniqueness
    return {
        id: 0,
        user_id: input.user_id,
        nip: input.nip,
        nama: input.nama,
        foto: input.foto || null,
        created_at: new Date(),
        updated_at: new Date()
    };
}

export async function getGuru(): Promise<Guru[]> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to get all guru records
    // Should include relations to user data
    return [];
}

export async function getGuruById(id: number): Promise<Guru | null> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to get guru by ID
    // Should include relations to user data and managed classes
    return null;
}

export async function getGuruByUserId(userId: number): Promise<Guru | null> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to get guru by user_id
    // Used for getting current teacher data after login
    return null;
}

export async function updateGuru(input: UpdateGuruInput): Promise<Guru | null> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to update guru record
    // Should validate NIP uniqueness if being changed
    return null;
}

export async function updateGuruProfile(input: UpdateProfileInput): Promise<Guru | null> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to update guru profile (nama, foto)
    // Used by teachers to update their own profile
    return null;
}

export async function deleteGuru(id: number): Promise<boolean> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to delete guru record
    // Should handle references from kelas (wali_kelas_id) properly
    return false;
}