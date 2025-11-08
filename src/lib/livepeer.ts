// Livepeer configuration
export const LIVEPEER_CONFIG = {
  streamId: import.meta.env.VITE_LIVEPEER_STREAM_ID || 'fd1fc93e-0f0d-4084-856a-29c57dc19f37',
  playbackId: import.meta.env.VITE_LIVEPEER_PLAYBACK_ID || 'fd1fae44jz9ehoud',
  playbackUrl: import.meta.env.VITE_LIVEPEER_PLAYBACK_URL || 'https://livepeercdn.studio/hls/fd1fae44jz9ehoud/index.m3u8',
}

