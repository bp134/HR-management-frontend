import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type AnchorHTMLAttributes,
  type ReactNode,
} from 'react'

interface RouterContextValue {
  path: string
  navigate: (to: string, options?: { replace?: boolean }) => void
}

const RouterContext = createContext<RouterContextValue | null>(null)

function currentPath(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(currentPath)

  useEffect(() => {
    const handlePopState = () => setPath(currentPath())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    if (options?.replace) {
      window.history.replaceState(null, '', to)
    } else {
      window.history.pushState(null, '', to)
    }
    setPath(currentPath())
  }, [])

  const value = useMemo(() => ({ path, navigate }), [path, navigate])

  return (
    <RouterContext.Provider value={value}>
      {children}
    </RouterContext.Provider>
  )
}

function useRouter(): RouterContextValue {
  const context = useContext(RouterContext)
  if (!context) {
    throw new Error('RouterProvider is missing')
  }
  return context
}

export function usePathname(): string {
  return useRouter().path.split(/[?#]/, 1)[0] || '/'
}

export function useNavigate() {
  return useRouter().navigate
}

export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
  const navigate = useNavigate()

  useEffect(() => {
    navigate(to, { replace })
  }, [navigate, replace, to])

  return null
}

interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string
}

export function Link({ to, onClick, ...props }: LinkProps) {
  const navigate = useNavigate()

  return (
    <a
      href={to}
      onClick={event => {
        onClick?.(event)
        if (
          event.defaultPrevented
          || event.button !== 0
          || event.metaKey
          || event.altKey
          || event.ctrlKey
          || event.shiftKey
          || props.target
        ) {
          return
        }
        event.preventDefault()
        navigate(to)
      }}
      {...props}
    />
  )
}

interface NavLinkProps extends Omit<LinkProps, 'className'> {
  end?: boolean
  className?: string | ((state: { isActive: boolean }) => string)
}

export function NavLink({ to, end, className, ...props }: NavLinkProps) {
  const pathname = usePathname()
  const isActive = end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`)
  const resolvedClassName = typeof className === 'function' ? className({ isActive }) : className

  return <Link to={to} className={resolvedClassName} {...props} />
}

export function useParams<T extends Record<string, string | undefined>>(): T {
  const pathname = usePathname()
  const employeeMatch = pathname.match(/^\/employees\/([^/]+)$/)
  return {
    id: employeeMatch?.[1] ? decodeURIComponent(employeeMatch[1]) : undefined,
  } as unknown as T
}
