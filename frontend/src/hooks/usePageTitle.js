import { useEffect } from 'react'

export function usePageTitle(...parts) {
  const title = [...parts.filter(Boolean), 'Getafix'].join(' · ')
  useEffect(() => {
    document.title = title
    return () => { document.title = 'Getafix' }
  }, [title])
}
