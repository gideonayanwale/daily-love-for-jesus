import { useNavigate } from 'react-router'
import { trpc } from '@/providers/trpc'
import {
  BookOpen,
  Music,
  Heart,
  Share2,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { format } from 'date-fns'

export default function Home() {
  const navigate = useNavigate()

  // Get today's devotional
  const { data: devotional, isLoading: devLoading } =
    trpc.devotional.today.useQuery()

  // Get a random verse for the verse of the day
  const { data: verseOfDay } = trpc.bible.randomVerse.useQuery()

  // Get a random hymn
  const { data: featuredHymn } = trpc.hymns.random.useQuery()

  const today = new Date()

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <header className="text-center space-y-1">
        <p className="text-amber-600 text-xs font-semibold uppercase tracking-wider">
          {format(today, 'EEEE')}
        </p>
        <h1 className="text-3xl font-bold text-gray-800">
          {format(today, 'MMMM d, yyyy')}
        </h1>
        <p className="text-gray-500 text-sm">
          Your daily bread for today
        </p>
      </header>

      {/* Verse of the Day */}
      {verseOfDay && (
        <section
          className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg shadow-amber-200/50 cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() =>
            navigate(
              `/bible/${verseOfDay.bookNumber}/${verseOfDay.chapter}`
            )
          }
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-amber-100" />
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-100">
              Verse of the Day
            </span>
          </div>
          <blockquote className="text-base leading-relaxed font-medium italic">
            &ldquo;{verseOfDay.text.substring(0, 200)}
            {verseOfDay.text.length > 200 ? '...' : ''}&rdquo;
          </blockquote>
          <p className="mt-3 text-sm text-amber-100 font-semibold">
            {verseOfDay.bookName} {verseOfDay.chapter}:{verseOfDay.verse}
          </p>
        </section>
      )}

      {/* Daily Devotional */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-800">Daily Devotional</h2>
          <button
            onClick={() => navigate('/devotionals')}
            className="text-amber-600 text-xs font-semibold flex items-center gap-1 hover:text-amber-700"
          >
            View All <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {devLoading ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
            <div className="h-3 bg-gray-200 rounded w-full mb-2" />
            <div className="h-3 bg-gray-200 rounded w-5/6" />
          </div>
        ) : devotional ? (
          <div
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(`/devotionals/${devotional.id}`)}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Heart className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-800 leading-tight">
                  {devotional.title}
                </h3>
                {devotional.scripture && (
                  <p className="text-amber-600 text-xs font-medium mt-0.5">
                    {devotional.scripture}
                  </p>
                )}
              </div>
            </div>

            <p className="text-gray-600 text-sm leading-relaxed line-clamp-4">
              {devotional.body}
            </p>

            {devotional.prayer && (
              <div className="mt-3 p-3 bg-amber-50 rounded-xl">
                <p className="text-amber-800 text-xs font-semibold mb-1">
                  Prayer
                </p>
                <p className="text-amber-700 text-sm line-clamp-2">
                  {devotional.prayer}
                </p>
              </div>
            )}

            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  // Share functionality
                  if (navigator.share) {
                    navigator.share({
                      title: devotional.title,
                      text: devotional.body.substring(0, 200),
                    })
                  }
                }}
                className="flex items-center gap-1 text-gray-400 text-xs hover:text-amber-600 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                Share
              </button>
              {devotional.author && (
                <span className="text-gray-400 text-xs ml-auto">
                  By {devotional.author}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
            <p className="text-gray-500 text-sm">
              No devotional available yet. Check back soon!
            </p>
          </div>
        )}
      </section>

      {/* Quick Access Grid */}
      <section className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/bible')}
          className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
            <BookOpen className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="font-bold text-gray-800 text-sm">Read Bible</h3>
          <p className="text-gray-500 text-xs mt-0.5">
            KJV - 66 Books
          </p>
        </button>

        <button
          onClick={() => navigate('/hymns')}
          className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-purple-200 transition-colors">
            <Music className="w-5 h-5 text-purple-600" />
          </div>
          <h3 className="font-bold text-gray-800 text-sm">Hymnals</h3>
          <p className="text-gray-500 text-xs mt-0.5">
            Baptist Hymns
          </p>
        </button>
      </section>

      {/* Featured Hymn */}
      {featuredHymn && (
        <section
          className="bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl p-5 text-white shadow-lg shadow-purple-200/50 cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => navigate(`/hymns/${featuredHymn.id}`)}
        >
          <div className="flex items-center gap-2 mb-2">
            <Music className="w-4 h-4 text-purple-200" />
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-200">
              Featured Hymn
            </span>
          </div>
          <h3 className="font-bold text-lg">{featuredHymn.title}</h3>
          {featuredHymn.author && (
            <p className="text-purple-200 text-sm mt-0.5">
              by {featuredHymn.author}
            </p>
          )}
        </section>
      )}

      {/* Footer spacing */}
      <div className="h-4" />
    </div>
  )
}
