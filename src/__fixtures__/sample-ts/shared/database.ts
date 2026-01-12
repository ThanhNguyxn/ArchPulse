// Database client - shared module
import type { User, UserCreateInput } from '../types';

export class DatabaseClient {
  public users = {
    findUnique: async (_query: { where: { id: string } }): Promise<User | null> => null,
    create: async (data: { data: UserCreateInput }): Promise<User> => ({
      id: '1',
      email: data.data.email,
      name: data.data.name,
      createdAt: new Date(),
    }),
  };
}

export default DatabaseClient;
