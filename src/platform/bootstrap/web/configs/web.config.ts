import { Injectable } from '@nestjs/common'

import { WebEnv } from './envs/web.env'

@Injectable()
export class WebConfig {
  public readonly port: number

  public constructor(webEnv: WebEnv) {
    this.port = webEnv.PORT
  }
}
