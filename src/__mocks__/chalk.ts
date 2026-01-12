// Mock for chalk ESM module
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
const createChalkProxy = (): unknown => {
  const handler = {
    get: (_target: object, prop: string): unknown => {
      if (prop === 'default') return createChalkProxy();
      return (str: string): string => str;
    },
    apply: (_target: object, _thisArg: unknown, args: string[]): string => {
      return args[0] || '';
    },
  };
  return new Proxy(() => {}, handler);
};

module.exports = createChalkProxy();
module.exports.default = createChalkProxy();
