import { UserRepository as userRepo } from '../repositories/UserRepository';
import { UserSchema } from '../validation';
import { User } from '../../../types';

export class UserService {
  async getUsers(): Promise<User[]> {
    return await userRepo.getAll() as unknown as User[];
  }

  async addUser(data: any): Promise<User> {
    const validated = UserSchema.parse({
      ...data,
      id: data.id || `u_${Date.now()}`,
    });
    await userRepo.create(validated as any);
    return validated as unknown as User;
  }

  async updateUser(id: string, updates: any): Promise<void> {
    await userRepo.update(id, updates);
  }

  async deleteUser(id: string): Promise<void> {
    await userRepo.delete(id);
  }

  async deleteAllUsers(): Promise<void> {
    await userRepo.deleteAll();
  }
}

export const userService = new UserService();
