import { useParams, useNavigate } from 'react-router'
import { trpc } from '@/providers/trpc'
import {
  ArrowLeft,
  Heart,
  Share2,
  BookOpen,
  MessageCircle,
} from 'lucide-react'
import { format } from 'date-fns'

export default function DevotionalDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: devotional, isLoading } =
    trpc.devotional.byId.useQuery({
      id: parseInt(id ?? '1'),
    })

  const handleShare = () => {
    if (!devotional) return
    const text = `${devotional.title}\n\n${devotional.body.substring(0, 300)}...`

    if (navigator.share) {
      navigator.share({ title: devotional.title, text })
    } else {
      navigator.clipboard.writeText(text)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-2/3" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-24 bg-gray-100 rounded-xl" />
      </div>
    )
  }

  if (!devotional) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 text-center">
        <p className="text-gray-500">Devotional not found</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/devotionals')}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
            <div>
              <h1 className="font-bold text-gray-800 text-sm leading-tight">
                Devotional
              </h1>
              <p className="text-gray-400 text-xs">
                {format(
                  new Date(devotional.devotionalDate),
                  'MMMM d, yyyy'
                )}
              </p>
            </div>
          </div>
          <button
            onClick={handleShare}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Share2 className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </header>

      {/* Content */}
      <article className="px-4 py-6 space-y-5">
        {/* Title */}
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Heart className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 leading-tight">
              {devotional.title}
            </h2>
            {devotional.author && (
              <p className="text-gray-500 text-sm mt-0.5">
                By {devotional.author}
              </p>
            )}
          </div>
        </div>

        {/* Scripture */}
        {devotional.scripture && (
          <div className="bg-blue-50 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                Scripture
              </span>
            </div>
            <p className="text-blue-800 font-semibold text-sm">
              {devotional.scripture}
            </p>
            {devotional.scriptureText && (
              <blockquote className="text-blue-700 text-sm leading-relaxed italic border-l-2 border-blue-300 pl-3">
                {devotional.scriptureText}
              </blockquote>
            )}
          </div>
        )}

        {/* Body */}
        <div className="prose prose-sm max-w-none">
          {devotional.body.split('\n').map((paragraph, i) => (
            <p key={i} className="text-gray-700 leading-relaxed mb-3">
              {paragraph}
            </p>
          ))}
        </div>

        {/* Reflection */}
        {devotional.reflection && (
          <div className="bg-purple-50 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">
                Reflection
              </span>
            </div>
            <p className="text-purple-800 text-sm leading-relaxed">
              {devotional.reflection}
            </p>
          </div>
        )}

        {/* Prayer */}
        {devotional.prayer && (
          <div className="bg-amber-50 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                Prayer
              </span>
            </div>
            <p className="text-amber-800 text-sm leading-relaxed italic">
              {devotional.prayer}
            </p>
          </div>
        )}

        {/* Source */}
        {devotional.source && (
          <div className="pt-4 border-t border-gray-100">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                devotional.source === 'telegram'
                  ? 'bg-blue-50 text-blue-600'
                  : devotional.source === 'manual'
                    ? 'bg-gray-100 text-gray-600'
                    : 'bg-purple-50 text-purple-600'
              }`}
            >
              Source: {devotional.source}
            </span>
          </div>
        )}

        {/* Bottom spacing */}
        <div className="h-8" />
      </article>
    </div>
  )
}
