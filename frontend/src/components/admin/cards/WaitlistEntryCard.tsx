import { Copy, Trash2, Mail } from 'lucide-react'

interface WaitlistEntry {
  id: string
  email: string
  created_at: string
  status: string
}

interface WaitlistEntryCardProps {
  entry: WaitlistEntry
  onCopyEmail: (email: string) => void
  onDelete: (entryId: string) => void
  getStatusBadge: (status: string) => JSX.Element
}

export function WaitlistEntryCard({ entry, onCopyEmail, onDelete, getStatusBadge }: WaitlistEntryCardProps) {
  return (
    <div className="p-3 border border-ink-6 hover:border-ink-5 transition-colors">
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="bg-ink-7 w-8 h-8 flex items-center justify-center shrink-0">
            <Mail className="h-4 w-4 text-ink-3" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-mono text-ink-0 break-all">{entry.email}</p>
            <p className="text-[10px] font-mono text-ink-4 mt-0.5">
              Joined {new Date(entry.created_at).toLocaleDateString()}
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              {getStatusBadge(entry.status)}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onCopyEmail(entry.email)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-ink-6 text-ink-3 hover:border-ink-4 hover:text-ink-0 transition-colors text-xs font-mono"
          >
            <Copy className="h-3 w-3" />
            Copy
          </button>
          <button
            onClick={() => onDelete(entry.id)}
            className="px-3 py-2 border border-ink-6 text-ink-4 hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
