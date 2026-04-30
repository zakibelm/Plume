import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore.js'
import useProjectStore from '../store/projectStore.js'

function NavItem({ to, icon, children, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
          isActive
            ? 'bg-indigo-600/20 text-indigo-400'
            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
        }`
      }
    >
      <span className="shrink-0">{icon}</span>
      <span>{children}</span>
    </NavLink>
  )
}

export default function Sidebar({ onClose }) {
  const { user, signOut } = useAuthStore()
  const { projects } = useProjectStore()
  const [projectsExpanded, setProjectsExpanded] = useState(true)
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className="flex flex-col h-full bg-gray-900 border-r border-gray-800">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
          <span className="text-gray-100 font-semibold text-lg tracking-tight">Plume</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-300 lg:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <NavItem
          to="/"
          end
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          }
        >
          Dashboard
        </NavItem>

        {/* Projects section */}
        <div>
          <button
            onClick={() => setProjectsExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-400 transition-colors"
          >
            <span>Projects</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`transition-transform ${projectsExpanded ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {projectsExpanded && (
            <div className="mt-1 space-y-0.5">
              {projects.length === 0 ? (
                <p className="px-3 py-2 text-xs text-gray-600">No projects yet</p>
              ) : (
                projects.slice(0, 8).map((project) => (
                  <NavLink
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-indigo-600/20 text-indigo-400'
                          : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                      }`
                    }
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                    <span className="truncate">{project.name}</span>
                  </NavLink>
                ))
              )}
              <NavLink
                to="/projects/new"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-indigo-500 hover:text-indigo-400 hover:bg-indigo-600/10 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>New Project</span>
              </NavLink>
            </div>
          )}
        </div>

        <div className="pt-2">
          <NavItem
            to="/brand-voices"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            }
          >
            Brand Voices
          </NavItem>
        </div>
      </nav>

      {/* User section */}
      <div className="border-t border-gray-800 p-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-700 flex items-center justify-center text-sm font-medium text-white shrink-0">
            {user?.email?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-300 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="p-1.5 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}
