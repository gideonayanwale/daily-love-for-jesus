import { useState } from 'react'
import { useNavigate } from 'react-router'
import { trpc } from '@/providers/trpc'
import { Search, BookOpen, ChevronRight } from 'lucide-react'

export default function Bible() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'old' | 'new'>('old')

  const { data: books, isLoading } = trpc.bible.books.useQuery()

  const filteredBooks = books?.filter((book) => {
    const matchesTestament = book.testament === activeTab
    const matchesSearch =
      !search ||
      book.name.toLowerCase().includes(search.toLowerCase()) ||
      book.shortName.toLowerCase().includes(search.toLowerCase())
    return matchesTestament && matchesSearch
  })

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold text-gray-800">Holy Bible</h1>
        <p className="text-gray-500 text-sm">King James Version</p>
      </header>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search books..."
          className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
        />
      </div>

      {/* Testament Tabs */}
      <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => setActiveTab('old')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'old'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Old Testament ({books?.filter((b) => b.testament === 'old').length ?? 0})
        </button>
        <button
          onClick={() => setActiveTab('new')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'new'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          New Testament ({books?.filter((b) => b.testament === 'new').length ?? 0})
        </button>
      </div>

      {/* Books List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-14 bg-white rounded-xl animate-pulse border border-gray-100"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {filteredBooks?.map((book) => (
            <button
              key={book.id}
              onClick={() => navigate(`/bible/${book.bookNumber}`)}
              className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-amber-200 hover:shadow-sm transition-all text-left"
            >
              <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-4 h-4 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-800 text-sm">
                  {book.name}
                </h3>
                <p className="text-gray-400 text-xs">
                  {book.chapters} chapters &middot; {book.genre}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
