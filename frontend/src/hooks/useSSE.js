import { useEffect, useRef, useCallback } from 'react'
import { createSSEConnection } from '../services/api.js'
import useWorkflowStore from '../store/workflowStore.js'

/**
 * Custom hook for managing SSE connections.
 * Handles lifecycle, parsing, and dispatch to workflowStore.
 *
 * @param {string|null} path - API path for SSE endpoint (null to skip)
 * @param {Object} options
 * @param {boolean} options.autoReconnect - Whether to reconnect on error
 * @param {number} options.maxRetries - Max reconnection attempts (default: 3)
 * @param {Function} options.onEvent - Custom event handler
 * @param {Function} options.onComplete - Called when stream ends
 * @param {Function} options.onError - Called on error
 */
export function useSSE(path, options = {}) {
  const {
    autoReconnect = true,
    maxRetries = 3,
    onEvent,
    onComplete,
    onError,
  } = options

  const addEvent = useWorkflowStore((s) => s.addEvent)
  const esRef = useRef(null)
  const retriesRef = useRef(0)
  const activeRef = useRef(false)

  const connect = useCallback(async () => {
    if (!path || !activeRef.current) return

    try {
      const es = await createSSEConnection(path)
      esRef.current = es

      es.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data)
          addEvent(event)
          onEvent?.(event)

          if (
            event.type === 'workflow_complete' ||
            event.type === 'agent_end'
          ) {
            retriesRef.current = 0
            onComplete?.(event)
          }
        } catch {
          // ignore parse errors
        }
      }

      es.onerror = () => {
        es.close()
        esRef.current = null

        if (autoReconnect && retriesRef.current < maxRetries && activeRef.current) {
          retriesRef.current++
          const delay = Math.min(1000 * 2 ** retriesRef.current, 10000)
          setTimeout(connect, delay)
        } else {
          onError?.()
        }
      }
    } catch (err) {
      onError?.(err)
    }
  }, [path, autoReconnect, maxRetries, addEvent, onEvent, onComplete, onError])

  useEffect(() => {
    if (!path) return

    activeRef.current = true
    retriesRef.current = 0
    connect()

    return () => {
      activeRef.current = false
      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }
    }
  }, [path, connect])

  const disconnect = useCallback(() => {
    activeRef.current = false
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }
  }, [])

  return { disconnect }
}

export default useSSE
