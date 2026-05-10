/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_WEBWHEN_NOAUTH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Runtime config injected at deployment time
interface RuntimeConfig {
  apiUrl: string
  clerkPublishableKey: string
  posthogApiKey?: string
  posthogHost?: string
}

interface Window {
  CONFIG: RuntimeConfig
  __PRERENDER__?: boolean
}
