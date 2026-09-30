export default function version(): string {
  return (import.meta.env.VITE_GIT_HASH as string | undefined) || 'dev'
}
