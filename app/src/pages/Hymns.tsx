import { useState } from 'react'
import { useNavigate } from 'react-router'
import { trpc } from '@/providers/trpc'
import { Search, Music, SlidersHorizontal } from 'lucide-react'

export default function Hymns() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const { data: hymns, isLoading } = trpc.hymns.list.useQuery(
    search
      ? { search }
      : selectedCategory
        ? { category: selectedCategory }
        : {}
  )

  const { data: categories } = trpc.hymns.categories.useQuery()

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold text-gray-800">Baptist Hymnal</h1>
        <p className="text-gray-500 text-sm">101 Classic Hymns</p>
      </header>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search hymns or authors..."
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-colors ${
            showFilters || selectedCategory
              ? 'bg-purple-500 border-purple-500 text-white'
              : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Category Filters */}
      {showFilters && categories && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              !selectedCategory
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() =>
                setSelectedCategory(
                  selectedCategory === cat ? null : cat
                )
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Hymns List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-16 bg-white rounded-xl animate-pulse border border-gray-100"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {hymns?.map((hymn) => (
            <button
              key={hymn.id}
              onClick={() => navigate(`/hymns/${hymn.id}`)}
              className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-purple-200 hover:shadow-sm transition-all text-left"
            >
              <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Music className="w-4 h-4 text-purple-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-800 text-sm truncate">
                  {hymn.title}
                </h3>
                <p className="text-gray-400 text-xs truncate">
                  {hymn.author && `by ${hymn.author}`}
                  {hymn.author && hymn.category && ' \u00B7 '}
                  {hymn.category}
                </p>
              </div>
              <span className="text-xs text-purple-400 font-mono flex-shrink-0">
                #{hymn.hymnNumber}
              </span>
            </button>
          ))}
        </div>
      )}

      {hymns?.length === 0 && (
        <div className="text-center py-12">
          <Music className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No hymns found</p>
        </div>
      )}
    </div>
  )
}
