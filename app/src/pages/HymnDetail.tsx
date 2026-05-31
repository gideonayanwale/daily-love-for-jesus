import { useParams, useNavigate } from 'react-router'
import { trpc } from '@/providers/trpc'
import { ArrowLeft, Music, User, Music2, Share2 } from 'lucide-react'

interface Stanza {
  number: number
  text: string
}

export default function HymnDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: hymn, isLoading } = trpc.hymns.byId.useQuery({
    id: parseInt(id ?? '1'),
  })

  const stanzas: Stanza[] = hymn?.stanzas
    ? JSON.parse(hymn.stanzas as string)
    : []

  const handleShare = () => {
    if (!hymn) return
    const text = `${hymn.title}\n\n${stanzas
      .map((s) => `${s.number}. ${s.text}`)
      .join('\n\n')}${hymn.chorus ? `\n\nChorus:\n${hymn.chorus}` : ''}`

    if (navigator.share) {
      navigator.share({ title: hymn.title, text })
    } else {
      navigator.clipboard.writeText(text)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-2/3" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!hymn) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 text-center">
        <p className="text-gray-500">Hymn not found</p>
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
              onClick={() => navigate('/hymns')}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
            <div>
              <h1 className="font-bold text-gray-800 text-sm leading-tight">
                {hymn.title}
              </h1>
              <p className="text-gray-400 text-xs">Hymn #{hymn.hymnNumber}</p>
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

      {/* Hymn Content */}
      <div className="px-4 py-6 space-y-5">
        {/* Meta info */}
        <div className="flex flex-wrap gap-2">
          {hymn.author && (
            <div className="flex items-center gap-1 px-2.5 py-1 bg-purple-50 rounded-lg">
              <User className="w-3 h-3 text-purple-500" />
              <span className="text-xs text-purple-700 font-medium">
                {hymn.author}
              </span>
            </div>
          )}
          {hymn.composer && (
            <div className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 rounded-lg">
              <Music2 className="w-3 h-3 text-blue-500" />
              <span className="text-xs text-blue-700 font-medium">
                {hymn.composer}
              </span>
            </div>
          )}
          {hymn.category && (
            <div className="px-2.5 py-1 bg-gray-100 rounded-lg">
              <span className="text-xs text-gray-600 font-medium">
                {hymn.category}
              </span>
            </div>
          )}
          {hymn.meter && (
            <div className="px-2.5 py-1 bg-amber-50 rounded-lg">
              <span className="text-xs text-amber-700 font-medium">
                Meter: {hymn.meter}
              </span>
            </div>
          )}
          {hymn.key && (
            <div className="px-2.5 py-1 bg-emerald-50 rounded-lg">
              <span className="text-xs text-emerald-700 font-medium">
                Key: {hymn.key}
              </span>
            </div>
          )}
        </div>

        {/* Stanzas */}
        <div className="space-y-4">
          {stanzas.map((stanza: Stanza) => (
            <div key={stanza.number} className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-purple-500">
                  {stanza.number}.
                </span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <p className="text-gray-700 leading-relaxed text-sm pl-5">
                {stanza.text}
              </p>
            </div>
          ))}
        </div>

        {/* Chorus */}
        {hymn.chorus && (
          <div className="bg-gradient-to-r from-purple-50 to-amber-50 rounded-xl p-4 space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <Music className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">
                Chorus
              </span>
            </div>
            <p className="text-gray-700 leading-relaxed text-sm font-medium">
              {hymn.chorus}
            </p>
          </div>
        )}

        {/* Bottom spacing */}
        <div className="h-8" />
      </div>
    </div>
  )
}
