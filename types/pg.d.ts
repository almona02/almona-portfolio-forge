// Minimal pg module declaration to satisfy TypeScript if @types/pg not installed yet.
declare module 'pg' {
  interface QueryResult<R = unknown> { rows: R[] }
  interface ClientConfig { connectionString?: string; ssl?: unknown }
  class Client {
    constructor(config: ClientConfig);
    connect(): Promise<void>;
    end(): Promise<void>;
    query<R = unknown>(text: string, params?: unknown[]): Promise<QueryResult<R>>;
  }
  export { Client };
}
