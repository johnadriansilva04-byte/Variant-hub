import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabase'

interface User {
  id: string
  email: string
  name: string
  phone?: string
  role: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (phone: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  isAuthenticated: boolean
}

interface RegisterData {
  password: string
  name: string
  phone: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId: string) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (data) {
      setUser({
        id: data.id,
        email: data.email,
        name: data.name,
        phone: data.phone,
        role: data.role
      })
    }
    setLoading(false)
  }

  const login = async (phone: string, password: string) => {
    // Login with phone - need to find user by phone first, then get email for Supabase auth
    const { data: userData } = await supabase
      .from('users')
      .select('email')
      .eq('phone', phone)
      .single()

    if (!userData?.email) {
      throw new Error('Telefone não encontrado')
    }

    const { error } = await supabase.auth.signInWithPassword({ email: userData.email, password })
    if (error) throw error
  }

  const register = async (data: RegisterData) => {
    // Generate a fake email for Supabase auth (phone + @variant.app)
    const fakeEmail = `${data.phone.replace(/\D/g, '')}@variant.app`
    
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: fakeEmail,
      password: data.password
    })

    if (authError) throw authError

    if (authData.user) {
      // Create user profile
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: fakeEmail,
          password_hash: data.password, // Will be replaced with proper hash in production
          name: data.name,
          phone: data.phone,
          role: 'user',
          status: 'active'
        })

      if (profileError) throw profileError
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
