/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_LIVEPEER_STREAM_ID?: string
  readonly VITE_LIVEPEER_PLAYBACK_ID?: string
  readonly VITE_LIVEPEER_PLAYBACK_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

