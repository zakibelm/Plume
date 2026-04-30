import { supabase } from './supabase.js'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return {}
  return {
    Authorization: `Bearer ${session.access_token}`,
  }
}

async function request(path, options = {}) {
  const authHeaders = await getAuthHeaders()
  const headers = {
    'Content-Type': 'application/json',
    ...authHeaders,
    ...options.headers,
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`
    try {
      const errorData = await response.json()
      errorMessage = errorData.message || errorData.error || errorMessage
    } catch {
      // ignore JSON parse error
    }
    throw new Error(errorMessage)
  }

  if (response.status === 204) return null
  return response.json()
}

// --- Projects ---
export async function createProject(data) {
  return request('/api/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getProjects() {
  return request('/api/projects')
}

export async function getProject(id) {
  return request(`/api/projects/${id}`)
}

// --- Briefs ---
export async function createBrief(projectId, data) {
  return request(`/api/projects/${projectId}/brief`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getBrief(projectId) {
  return request(`/api/projects/${projectId}/brief`)
}

// --- Brand Voices ---
export async function createBrandVoice(data) {
  return request('/api/brand-voices', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getBrandVoices() {
  return request('/api/brand-voices')
}

export async function updateBrandVoice(id, data) {
  return request(`/api/brand-voices/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteBrandVoice(id) {
  return request(`/api/brand-voices/${id}`, {
    method: 'DELETE',
  })
}

// --- Agents ---
export async function runAgent(agentName, projectId, input = {}) {
  return request(`/api/agents/${agentName}/run`, {
    method: 'POST',
    body: JSON.stringify({ projectId, input }),
  })
}

// --- Workflows ---
export async function runWorkflow(projectId, config = {}) {
  return request(`/api/projects/${projectId}/workflow`, {
    method: 'POST',
    body: JSON.stringify(config),
  })
}

export async function getWorkflowStatus(projectId) {
  return request(`/api/projects/${projectId}/workflow/status`)
}

// --- Budgets ---
export async function getBudget(projectId) {
  return request(`/api/projects/${projectId}/budget`)
}

export async function updateBudget(projectId, data) {
  return request(`/api/projects/${projectId}/budget`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

// --- Exports ---
export async function exportMarkdown(projectId) {
  const authHeaders = await getAuthHeaders()
  const response = await fetch(`${BASE_URL}/api/projects/${projectId}/export/markdown`, {
    headers: authHeaders,
  })
  if (!response.ok) throw new Error(`Export failed: HTTP ${response.status}`)
  return response.blob()
}

export async function exportHtml(projectId) {
  const authHeaders = await getAuthHeaders()
  const response = await fetch(`${BASE_URL}/api/projects/${projectId}/export/html`, {
    headers: authHeaders,
  })
  if (!response.ok) throw new Error(`Export failed: HTTP ${response.status}`)
  return response.blob()
}

// --- SSE helper ---
export async function createSSEConnection(path) {
  const authHeaders = await getAuthHeaders()
  const token = authHeaders.Authorization?.replace('Bearer ', '')
  const url = token
    ? `${BASE_URL}${path}?token=${encodeURIComponent(token)}`
    : `${BASE_URL}${path}`
  return new EventSource(url)
}
