import { useLive } from '../live'

export function LiveIndicator({ compact = false }: { compact?: boolean }) {
  const { connected } = useLive()
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-faint">
      <span className="relative flex h-1.5 w-1.5">
        {connected && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green opacity-50" />
        )}
        <span
          className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
            connected ? 'bg-green' : 'bg-faint'
          }`}
        />
      </span>
      {!compact && (connected ? 'live' : 'offline')}
    </span>
  )
}
