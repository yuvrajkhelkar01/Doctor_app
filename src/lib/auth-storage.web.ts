// Web: use the browser's localStorage. Kept separate so expo-sqlite's web
// worker never enters the web bundle. No window during static rendering.
export const authStorage = typeof window !== 'undefined' ? window.localStorage : undefined
