import { useEffect, useState } from 'react'

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  if (!offline) return null

  return (
    <div className="bg-yellow-400 text-yellow-900 text-sm font-medium text-center py-2 px-4">
      You are offline. Data entry is paused until connection is restored.
    </div>
  )
}
