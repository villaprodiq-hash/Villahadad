import { db } from '../index';
import { User, UserRole } from '../../../../types';
import { safeJsonParse } from '../../../utils/safeJson';

export const UserRepository = {
  async getAll(): Promise<User[]> {
    try {
      const users = await db
        .selectFrom('users')
        .selectAll()
        .where('deletedAt', 'is', null)
        .execute();

      return users.map(u => ({
        ...u,
        role: u.role as UserRole,
        preferences: safeJsonParse(u.preferences, undefined),
      })) as User[];
    } catch (error) {
      console.error('❌ UserRepository.getAll failed:', error);
      return [];
    }
  },

  async getById(id: string): Promise<User | null> {
    try {
      const user = await db
        .selectFrom('users')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();

      if (!user) return null;

      return {
        ...user,
        role: user.role as UserRole,
        preferences: safeJsonParse(user.preferences, undefined),
      } as User;
    } catch (error) {
      console.error(`❌ UserRepository.getById(${id}) failed:`, error);
      return null;
    }
  },

  async create(user: User): Promise<User> {
    try {
      await db
        .insertInto('users')
        .values({
          id: user.id,
          name: user.name,
          role: user.role,
          email: user.email || null,
          password: user.password || null,
          avatar: user.avatar || null,
          jobTitle: user.jobTitle || null,
          preferences: user.preferences ? JSON.stringify(user.preferences) : null,
        })
        .execute();

      return user;
    } catch (error) {
      console.error('❌ UserRepository.create failed:', error);
      throw error;
    }
  },

  async update(id: string, updates: Partial<User>): Promise<void> {
    try {
      const updateData: any = { ...updates };
      if (updates.preferences) {
        updateData.preferences = JSON.stringify(updates.preferences);
      }

      await db
        .updateTable('users')
        .set(updateData)
        .where('id', '=', id)
        .execute();
    } catch (error) {
      console.error(`❌ UserRepository.update(${id}) failed:`, error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await db
        .updateTable('users')
        .set({ deletedAt: Date.now() })
        .where('id', '=', id)
        .execute();
    } catch (error) {
      console.error(`❌ UserRepository.delete(${id}) failed:`, error);
      throw error;
    }
  },

  async deleteAll(): Promise<void> {
    try {
      await db
        .deleteFrom('users')
        .execute();
    } catch (error) {
      console.error('❌ UserRepository.deleteAll failed:', error);
      throw error;
    }
  }
};
