import type { UserConfig, UserConfigFn } from 'vite'
import type { PresetType } from './presets'
import { mergeConfig, loadEnv, defineConfig } from 'vite'
import { red } from 'picocolors'
import { readPackageJSON } from 'pkg-types'
import { wrapperEnv, resolveProxy } from './utils'
import { resolve } from 'path'
import { configVitePlugins } from './plugins'
import { createPreset } from './presets'
import { OUTPUT_DIR } from './constants'
import dayjs from 'dayjs'

export * from './constants'

export type ViteConfig = Promise<UserConfig | UserConfigFn>

export async function createViteConfig(
  cwd: string,
  { preset }: { preset: PresetType },
): Promise<UserConfig | UserConfigFn> {
  console.log()
  console.log(
    red('当前处于开发测试阶段，还会有大量更新，仅供参考，请勿用于实际项目！\n'),
  )
  console.log()

  return defineConfig(async ({ command, mode }) => {
    const root = cwd
    const env = loadEnv(mode, root)
    const { dependencies, devDependencies, name, version } =
      await readPackageJSON(cwd)

    // The boolean type read by loadEnv is a string. This function can be converted to boolean type
    const viteEnv = wrapperEnv(env)

    const { VITE_PUBLIC_PATH, VITE_PROXY, VITE_USE_MOCK, VITE_DROP_CONSOLE } =
      viteEnv

    const commonConfig: UserConfig = {
      root,
      base: VITE_PUBLIC_PATH,

      resolve: {
        alias: {
          '@': `${resolve(root, 'src')}`,
          'vue-i18n': 'vue-i18n/dist/vue-i18n.cjs.js',
          vue: 'vue/dist/vue.esm-bundler.js',
        },
      },
      define: {
        __VITE_USE_MOCK__: VITE_USE_MOCK,
        // Suppress vue-i18-next warning
        __INTLIFY_PROD_DEVTOOLS__: false,
        __APP_INFO__: JSON.stringify({
          pkg: { dependencies, devDependencies, name, version },
          lastBuildTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        }),
      },
      server: {
        port: 3000,
        host: true,
        proxy: resolveProxy(VITE_PROXY),
      },
      esbuild: {
        pure: VITE_DROP_CONSOLE ? ['console.log', 'debugger'] : [],
      },
      build: {
        outDir: OUTPUT_DIR,
        brotliSize: false,
        chunkSizeWarningLimit: 2048,
        rollupOptions: {
          output: {
            manualChunks: {
              vue: ['vue', 'pinia', 'vue-router'],
              mockjs: ['mockjs'],
            },
          },
        },
      },
      optimizeDeps: {
        include: ['dayjs/locale/en', 'dayjs/locale/zh-cn'],
        // exclude: ['vue-demi'],
      },
      plugins: await configVitePlugins(root, viteEnv, command === 'build'),
    }

    return mergeConfig(commonConfig, await createPreset(preset)())
  })
}