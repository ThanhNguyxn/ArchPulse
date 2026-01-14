// Sample service with multiple imports
import { DatabaseClient } from '../shared/database';
import { Logger } from '../shared/logger';
import { cache } from '../utils/cache';
import type { User, UserCreateInput } from '../types';

export class UserService {
  constructor(
    private db: DatabaseClient,
    private logger: Logger = new Logger('UserService')
  ) {}

  async findById(id: string): Promise<User | null> {
    const cached = cache.get(`user:${id}`);
    if (cached) return cached as User;

    const user = await this.db.users.findUnique({ where: { id } });
    if (user) cache.set(`user:${id}`, user);
    return user;
  }

  async create(input: UserCreateInput): Promise<User> {
    this.logger.info('Creating user', input);
    return this.db.users.create({ data: input });
  }
}
