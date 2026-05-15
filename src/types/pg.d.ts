declare module 'pg' {
  export class Client {
    public constructor(config: {
      database: string
      host: string
      password: string
      port: number
      user: string
    })

    public connect(): Promise<void>

    public end(): Promise<void>

    public query(sql: string): Promise<unknown>
  }
}
