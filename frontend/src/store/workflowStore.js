import { create } from 'zustand'
import { createSSEConnection } from '../services/api.js'

const AGENT_ORDER = [
  'StrategistAgent',
  'ArchitectAgent',
  'WriterAgent',
  'HumanizerAgent',
  'BrandVoiceAgent',
  'CriticAgent',
]

const useWorkflowStore = create((set, get) => ({
  status: 'idle', // idle | running | completed | error
  steps: {},
  currentStep: null,
  streaming: false,
  events: [],
  tokenBuffer: '',
  sseConnection: null,
  error: null,

  reset: () => {
    const { sseConnection } = get()
    if (sseConnection) {
      sseConnection.close()
    }
    set({
      status: 'idle',
      steps: {},
      currentStep: null,
      streaming: false,
      events: [],
      tokenBuffer: '',
      sseConnection: null,
      error: null,
    })
  },

  addEvent: (event) => {
    set((state) => {
      const newEvents = [...state.events, { ...event, timestamp: Date.now() }]

      // Update step status based on event type
      let stepsUpdate = { ...state.steps }
      let currentStepUpdate = state.currentStep
      let statusUpdate = state.status
      let tokenBufferUpdate = state.tokenBuffer

      if (event.type === 'agent_start') {
        currentStepUpdate = event.agent
        stepsUpdate[event.agent] = { status: 'running', startedAt: Date.now() }
        statusUpdate = 'running'
      } else if (event.type === 'agent_end') {
        stepsUpdate[event.agent] = {
          ...stepsUpdate[event.agent],
          status: 'success',
          completedAt: Date.now(),
        }
      } else if (event.type === 'agent_error') {
        stepsUpdate[event.agent] = {
          ...stepsUpdate[event.agent],
          status: 'failed',
          error: event.message,
          completedAt: Date.now(),
        }
      } else if (event.type === 'token') {
        tokenBufferUpdate = state.tokenBuffer + (event.content || '')
      } else if (event.type === 'workflow_complete') {
        statusUpdate = 'completed'
      } else if (event.type === 'workflow_error') {
        statusUpdate = 'error'
      }

      return {
        events: newEvents,
        steps: stepsUpdate,
        currentStep: currentStepUpdate,
        status: statusUpdate,
        tokenBuffer: tokenBufferUpdate,
      }
    })
  },

  startWorkflow: async (projectId, config = {}) => {
    const { sseConnection: existing } = get()
    if (existing) existing.close()

    set({
      status: 'running',
      steps: {},
      currentStep: null,
      streaming: true,
      events: [],
      tokenBuffer: '',
      error: null,
    })

    try {
      const path = `/api/projects/${projectId}/workflow/stream`
      const es = await createSSEConnection(path)

      es.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data)
          get().addEvent(event)
        } catch {
          // ignore malformed events
        }
      }

      es.onerror = () => {
        set({ streaming: false, status: 'error', error: 'SSE connection lost' })
        es.close()
      }

      set({ sseConnection: es })
    } catch (err) {
      set({ status: 'error', streaming: false, error: err.message })
    }
  },

  startAgentStream: async (projectId, agentName, extraPath = '') => {
    const { sseConnection: existing } = get()
    if (existing) existing.close()

    set((state) => ({
      streaming: true,
      tokenBuffer: '',
      steps: {
        ...state.steps,
        [agentName]: { status: 'running', startedAt: Date.now() },
      },
      currentStep: agentName,
      error: null,
    }))

    try {
      const path = `/api/projects/${projectId}/agents/${agentName}/stream${extraPath}`
      const es = await createSSEConnection(path)

      es.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data)
          get().addEvent(event)

          if (event.type === 'agent_end' || event.type === 'agent_error') {
            set({ streaming: false })
            es.close()
          }
        } catch {
          // ignore malformed events
        }
      }

      es.onerror = () => {
        set((state) => ({
          streaming: false,
          steps: {
            ...state.steps,
            [agentName]: {
              ...state.steps[agentName],
              status: 'failed',
              error: 'Connection lost',
            },
          },
        }))
        es.close()
      }

      set({ sseConnection: es })
      return es
    } catch (err) {
      set({ streaming: false, error: err.message })
      throw err
    }
  },

  stopStream: () => {
    const { sseConnection } = get()
    if (sseConnection) {
      sseConnection.close()
    }
    set({ sseConnection: null, streaming: false })
  },
}))

export default useWorkflowStore
