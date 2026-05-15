import swc from 'unplugin-swc'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
  test: {
    coverage: {
      clean: true,
      cleanOnRerun: true,
      exclude: [
        '**/*.d.ts',
        '**/*.enum.ts',
        '**/*.interface.ts',
        '**/*.module.ts',
        '**/*.spec.ts',
        '**/*.test.ts',
        'src/libs/fake/**/*.ts',
        'src/libs/types/*.ts',
        'src/libs/typeorm/**/*.ts',
        'src/modules/get-modules.ts',
        'src/modules/**/application/dto/**/*.ts',
        'src/modules/**/application/errors/**/*.ts',
        'src/modules/**/application/ports/**/*.ts',
        'src/modules/**/application/commands/create-purchase.command.ts',
        'src/modules/**/configs/**/*.ts',
        'src/modules/**/constants.ts',
        'src/modules/**/infrastructure/**/*.ts',
        'src/modules/**/tests/**/*.ts',
        'src/modules/**/typeorm/**/*.ts',
        'src/modules/**/user-interface/dto/**/*.ts',
        'src/platform/bootstrap/**/*.ts',
        'src/platform/database/**/*.ts',
        'src/platform/messaging/**/*.ts',
        'src/platform/**/configs/**/*.ts',
        'src/platform/**/constants.ts',
        'src/web.ts',
      ],
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      provider: 'v8',
      reporter: ['text'],
      reportsDirectory: '/tmp/coverage',
      skipFull: true,
      thresholds: {
        branches: 90,
        functions: 90,
        lines: 85,
        statements: 90,
      },
    },
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
})
