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
    // Check if user is stored in localStorage
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  const login = async (phone: string, password: string) => {
    // Login with phone directly from users table
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('phone', phone)
      .eq('password_hash', password) // In production: verify hash
      .single()

    if (error || !data) {
      throw new Error('Telefone ou senha inválidos')
    }

    setUser({
      id: data.id,
      email: data.email,
      name: data.name,
      phone: data.phone,
      role: data.role
    })
    localStorage.setItem('user', JSON.stringify(data))
  }

  const register = async (data: RegisterData) => {
    // Generate fake email for storage
    const fakeEmail = `${data.phone.replace(/\D/g, '')}@variant.app`
    
    // Create user profile directly
    const { data: userData, error } = await supabase
      .from('users')
      .insert({
        email: fakeEmail,
        password_hash: data.password, // In production: hash password
        name: data.name,
        phone: data.phone,
        role: 'user',
        status: 'active'
      })
      .select()
      .single()

    if (error || !userData) {
      throw new Error(error?.message || 'Erro ao criar usuário')
    }
  }

  const logout = async () => {
    setUser(null)
    localStorage.removeItem('user')
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
