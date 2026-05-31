import { useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { trpc } from '@/providers/trpc'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Type,
  Share2,
} from 'lucide-react'

export default function BibleReader() {
  const { bookNumber, chapter } = useParams<{
    bookNumber: string
    chapter: string
  }>()
  const navigate = useNavigate()
  const bNum = parseInt(bookNumber ?? '1')
  const chNum = parseInt(chapter ?? '1')

  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md')
  const [highlightedVerse, setHighlightedVerse] = useState<number | null>(null)

  const { data: book } = trpc.bible.bookById.useQuery({
    id: bNum,
  })

  const { data: verses, isLoading } = trpc.bible.verses.useQuery({
    bookNumber: bNum,
    chapter: chNum,
  })

  const { data: chaptersList } = trpc.bible.chapters.useQuery({
    bookNumber: bNum,
  })

  const hasNextChapter = chaptersList
    ? chNum < Math.max(...chaptersList)
    : false
  const hasPrevChapter = chNum > 1

  const fontSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }

  const verseNumberSize = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
  }

  const handleShare = (text: string, reference: string) => {
    if (navigator.share) {
      navigator.share({
        title: reference,
        text: text,
      })
    } else {
      navigator.clipboard.writeText(`${reference} - ${text}`)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/bible/${bNum}`)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
            <div>
              <h1 className="font-bold text-gray-800 text-sm leading-tight">
                {book?.name ?? 'Loading...'}
              </h1>
              <p className="text-gray-400 text-xs">Chapter {chNum}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Font size toggle */}
            <button
              onClick={() =>
                setFontSize((s) =>
                  s === 'sm' ? 'md' : s === 'md' ? 'lg' : 'sm'
                )
              }
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              title="Toggle font size"
            >
              <Type className="w-4 h-4 text-gray-500" />
            </button>

            {/* Chapter navigation */}
            {hasPrevChapter && (
              <button
                onClick={() => navigate(`/bible/${bNum}/${chNum - 1}`)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
            )}
            {hasNextChapter && (
              <button
                onClick={() => navigate(`/bible/${bNum}/${chNum + 1}`)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Verses */}
      <div className="px-4 py-6 space-y-1">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-6 h-6 bg-gray-100 rounded-full flex-shrink-0" />
                <div className="flex-1 h-4 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : verses && verses.length > 0 ? (
          <div className={`${fontSizeClasses[fontSize]} leading-relaxed space-y-0.5`}>
            {verses.map((verse) => (
              <div
                key={verse.id}
                className={`group flex gap-2 py-1 px-2 -mx-2 rounded-lg transition-colors cursor-pointer ${
                  highlightedVerse === verse.verse
                    ? 'bg-amber-50'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() =>
                  setHighlightedVerse(
                    highlightedVerse === verse.verse ? null : verse.verse
                  )
                }
              >
                <sup
                  className={`${verseNumberSize[fontSize]} text-amber-500 font-bold mt-1 flex-shrink-0 w-5 text-right`}
                >
                  {verse.verse}
                </sup>
                <span className="text-gray-700">{verse.text}</span>
                {highlightedVerse === verse.verse && (
                  <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleShare(
                          verse.text,
                          `${book?.name} ${chNum}:${verse.verse}`
                        )
                      }}
                      className="p-1 rounded hover:bg-amber-100"
                    >
                      <Share2 className="w-3.5 h-3.5 text-amber-600" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">No verses found</p>
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="flex items-center justify-between pt-8 pb-4">
          {hasPrevChapter ? (
            <button
              onClick={() => navigate(`/bible/${bNum}/${chNum - 1}`)}
              className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </button>
          ) : (
            <div />
          )}

          {hasNextChapter ? (
            <button
              onClick={() => navigate(`/bible/${bNum}/${chNum + 1}`)}
              className="flex items-center gap-1 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  )
}
