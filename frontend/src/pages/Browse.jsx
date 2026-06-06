import { Search } from 'lucide-react'
import BrowseHeader from '../components/BrowseHeader'

export default function Browse() {
  return (
    <>
      <BrowseHeader canReveal={false} autoFocus />
      <div className="flex flex-col items-center justify-center py-24 text-slate-600">
        <Search size={40} className="mb-3" />
        <p className="text-sm">Search for any team or league</p>
      </div>
    </>
  )
}
