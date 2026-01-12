// Logger utility
export class Logger {
  constructor(private context: string) {}

  info(message: string, ...args: unknown[]): void {
    console.log(`[${this.context}] ${message}`, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(`[${this.context}] ${message}`, ...args);
  }
}
