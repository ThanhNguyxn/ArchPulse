// Cache utility
export const cache = {
  data: new Map<string, unknown>(),

  get<T>(key: string): T | undefined {
    return this.data.get(key) as T;
  },

  set<T>(key: string, value: T): void {
    this.data.set(key, value);
  },

  del(key: string): void {
    this.data.delete(key);
  },
};
