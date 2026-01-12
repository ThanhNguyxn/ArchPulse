// Database client - shared module
export class DatabaseClient {
  public users = {
    findUnique: async (query: { where: { id: string } }) => null,
    create: async (data: { data: unknown }) => ({}),
  };
}

export default DatabaseClient;
