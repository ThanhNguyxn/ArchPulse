// Sample TypeScript file for testing
import { UserService } from '../services/userService';
import { DatabaseClient } from '../shared/database';
import type { User } from '../types';

export class UserController {
  private userService: UserService;

  constructor(db: DatabaseClient) {
    this.userService = new UserService(db);
  }

  async getUser(id: string): Promise<User | null> {
    return this.userService.findById(id);
  }
}

export default UserController;
