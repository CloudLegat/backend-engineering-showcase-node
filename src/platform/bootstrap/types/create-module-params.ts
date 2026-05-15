import type { BootstrapMode } from './bootstrap-mode'

export interface CreateModuleParams {
  envs: NodeJS.ProcessEnv
  mode: BootstrapMode
}
