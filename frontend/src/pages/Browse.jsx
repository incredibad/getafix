import { Search } from 'lucide-react'
import BrowseHeader from '../components/BrowseHeader'
import { usePageTitle } from '../hooks/usePageTitle'

export default function Browse() {
  usePageTitle('Browse')
  return (
    <>
      <div className="h-14 lg:hidden" />
      <BrowseHeader canReveal={false} autoFocus />
      <div className="flex flex-col items-center justify-center py-24 text-slate-600">
        <Search size={40} className="mb-3" />
        <p className="text-sm">Search for any team or league</p>
      </div>
    </>
  )
}
