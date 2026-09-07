import { useState, useEffect } from 'react'
import { API_TOKEN } from '../services/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export function useIntegrationStatus(type: string) {
  const [status, setStatus] = useState<'online' | 'offline' | 'loading' | 'not_configured'>('loading')
  const [config] = useState<any>(null)

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/health/${type}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_TOKEN}`,
          },
        })
        const data = await response.json()
        
        if (data.data.status === 'not_configured') {
          setStatus('not_configured')
        } else {
          setStatus(data.data.status)
        }
      } catch (error) {
        setStatus('offline')
      }
    }
    
    checkStatus()
    const interval = setInterval(checkStatus, 30000)
    
    return () => clearInterval(interval)
  }, [type])

  return { status, config }
}
