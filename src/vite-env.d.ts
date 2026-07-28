/// <reference types="vite/client" />
/* eslint-disable @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any */

interface ImportMetaEnv {
  readonly VITE_UMAMI_WEBSITE_ID?: string
  readonly VITE_UMAMI_SCRIPT_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
