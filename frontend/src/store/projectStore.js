import { create } from 'zustand'
import * as api from '../services/api.js'

const useProjectStore = create((set, get) => ({
  projects: [],
  currentProject: null,
  loading: false,
  error: null,

  fetchProjects: async () => {
    set({ loading: true, error: null })
    try {
      const projects = await api.getProjects()
      set({ projects: projects || [], loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  createProject: async (data) => {
    set({ loading: true, error: null })
    try {
      const project = await api.createProject(data)
      set((state) => ({
        projects: [project, ...state.projects],
        currentProject: project,
        loading: false,
      }))
      return project
    } catch (err) {
      set({ error: err.message, loading: false })
      throw err
    }
  },

  fetchProject: async (id) => {
    set({ loading: true, error: null })
    try {
      const project = await api.getProject(id)
      set({ currentProject: project, loading: false })
      return project
    } catch (err) {
      set({ error: err.message, loading: false })
      throw err
    }
  },

  setCurrentProject: (project) => {
    set({ currentProject: project })
  },

  updateCurrentProject: (updates) => {
    set((state) => ({
      currentProject: state.currentProject
        ? { ...state.currentProject, ...updates }
        : null,
      projects: state.projects.map((p) =>
        p.id === state.currentProject?.id ? { ...p, ...updates } : p
      ),
    }))
  },

  clearError: () => set({ error: null }),
}))

export default useProjectStore
