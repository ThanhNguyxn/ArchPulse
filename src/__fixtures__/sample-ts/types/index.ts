// Type definitions
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export interface UserCreateInput {
  email: string;
  name: string;
}

export type { User as default };
