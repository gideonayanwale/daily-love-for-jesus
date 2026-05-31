import { useParams, useNavigate } from 'react-router'
import { trpc } from '@/providers/trpc'
import { ArrowLeft } from 'lucide-react'

export default function BibleChapter() {
  const { bookNumber } = useParams<{ bookNumber: string }>()
  const navigate = useNavigate()
  const bNum = parseInt(bookNumber ?? '1')

  const { data: book } = trpc.bible.bookById.useQuery({
    id: bNum,
  })

  const { data: chapters, isLoading } = trpc.bible.chapters.useQuery({
    bookNumber: bNum,
  })

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <header className="flex items-center gap-3">
        <button
          onClick={() => navigate('/bible')}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            {book?.name ?? 'Loading...'}
          </h1>
          <p className="text-gray-500 text-xs">
            {book?.testament === 'old' ? 'Old Testament' : 'New Testament'} &middot; {book?.genre}
          </p>
        </div>
      </header>

      {/* Chapters Grid */}
      {isLoading ? (
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-xl bg-gray-100 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 font-medium">
            Select a chapter ({chapters?.length ?? 0} chapters)
          </p>
          <div className="grid grid-cols-5 gap-2">
            {chapters?.map((chapter) => (
              <button
                key={chapter}
                onClick={() => navigate(`/bible/${bNum}/${chapter}`)}
                className="aspect-square bg-white rounded-xl border border-gray-100 flex items-center justify-center font-semibold text-gray-700 text-sm hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 transition-all shadow-sm"
              >
                {chapter}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
