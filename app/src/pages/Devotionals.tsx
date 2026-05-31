import { useNavigate } from 'react-router'
import { trpc } from '@/providers/trpc'
import { Heart, CalendarHeart, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'

export default function Devotionals() {
  const navigate = useNavigate()

  const { data: devotionalsData, isLoading } =
    trpc.devotional.list.useQuery({
      limit: 50,
      offset: 0,
    })

  const { data: todayDevotional } = trpc.devotional.today.useQuery()

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold text-gray-800">Devotionals</h1>
        <p className="text-gray-500 text-sm">
          Daily spiritual nourishment
        </p>
      </header>

      {/* Today's Devotional */}
      {todayDevotional && (
        <section
          className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg shadow-amber-200/50 cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() =>
            navigate(`/devotionals/${todayDevotional.id}`)
          }
        >
          <div className="flex items-center gap-2 mb-2">
            <CalendarHeart className="w-4 h-4 text-amber-100" />
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-100">
              Today&apos;s Devotional
            </span>
          </div>
          <h3 className="font-bold text-lg leading-tight">
            {todayDevotional.title}
          </h3>
          {todayDevotional.scripture && (
            <p className="text-amber-100 text-sm mt-1">
              {todayDevotional.scripture}
            </p>
          )}
          <div className="flex items-center gap-1 mt-3 text-amber-100 text-xs">
            <span>Read now</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </section>
      )}

      {/* Devotionals List */}
      <section>
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
          Past Devotionals
        </h2>

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
            {devotionalsData?.items.map((devotional) => (
              <button
                key={devotional.id}
                onClick={() =>
                  navigate(`/devotionals/${devotional.id}`)
                }
                className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-amber-200 hover:shadow-sm transition-all text-left"
              >
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Heart className="w-4 h-4 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 text-sm truncate">
                    {devotional.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    {devotional.scripture && (
                      <span className="text-amber-500 font-medium">
                        {devotional.scripture}
                      </span>
                    )}
                    <span>
                      {format(
                        new Date(devotional.devotionalDate),
                        'MMM d, yyyy'
                      )}
                    </span>
                    {devotional.source === 'telegram' && (
                      <span className="text-blue-400">Telegram</span>
                    )}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}

        {devotionalsData?.items.length === 0 && (
          <div className="text-center py-12">
            <CalendarHeart className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">
              No devotionals yet. They will appear here when posted from
              Telegram.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
