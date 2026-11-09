import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { useLive } from '../live'

export interface ApiState<T> {
  data: T | null
  error: string | null
  loading: boolean
}

export function useApi<T>(path: string | null): ApiState<T> & { reload: () => void } {
  const { version } = useLive()
  const [nonce, setNonce] = useState(0)
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    error: null,
    loading: path !== null,
  })

  useEffect(() => {
    if (!path) {
      setState({ data: null, error: null, loading: false })
      return
    }
    let alive = true
    setState((previous) => ({ ...previous, loading: true }))
    api<T>(path)
      .then((data) => {
        if (alive) setState({ data, error: null, loading: false })
      })
      .catch((error: unknown) => {
        if (alive) {
          setState({
            data: null,
            error: error instanceof Error ? error.message : String(error),
            loading: false,
          })
        }
      })
    return () => {
      alive = false
    }
  }, [path, version, nonce])

  const reload = useCallback(() => setNonce((value) => value + 1), [])

  return { ...state, reload }
}
