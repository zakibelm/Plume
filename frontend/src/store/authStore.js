import { create } from 'zustand'
import { supabase } from '../services/supabase.js'

const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  loading: true,

  setSession: (session) => {
    set({
      session,
      user: session?.user ?? null,
      loading: false,
    })
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    set({
      session: data.session,
      user: data.user,
    })
    return data
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null })
  },

  initialize: () => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({
        session,
        user: session?.user ?? null,
        loading: false,
      })
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
        loading: false,
      })
    })

    return () => subscription.unsubscribe()
  },
}))

export default useAuthStore
