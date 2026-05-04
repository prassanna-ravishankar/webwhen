import { formatDistanceToNow } from 'date-fns'
import { Edit, User, CheckCircle2, XCircle } from 'lucide-react'
import { RoleBadge } from '../RoleBadge'
import type { UserData } from '../types'

interface UserCardProps {
  user: UserData
  currentUserClerkId?: string
  onDeactivate: (userId: string, email: string) => void
  onEditRole: (user: UserData) => void
}

export function UserCard({ user, currentUserClerkId, onDeactivate, onEditRole }: UserCardProps) {
  const isCurrentUser = currentUserClerkId && user.clerk_user_id === currentUserClerkId

  return (
    <div className="p-3 border border-ink-6 hover:border-ink-5 transition-colors">
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="bg-ink-7 w-8 h-8 flex items-center justify-center shrink-0">
            <User className="h-4 w-4 text-ink-3" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-mono text-ink-0 break-all" title={user.email}>{user.email}</p>
                <p className="text-[10px] font-mono text-ink-4 mt-0.5">
                  Joined {user.created_at
                    ? formatDistanceToNow(new Date(user.created_at), { addSuffix: true })
                    : '-'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {user.is_active ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-mono uppercase tracking-wider border border-emerald-200">
                  <CheckCircle2 className="h-3 w-3" />
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-ink-7 text-ink-3 text-[9px] font-mono uppercase tracking-wider border border-ink-6">
                  <XCircle className="h-3 w-3" />
                  Inactive
                </span>
              )}
              <RoleBadge role={user.role} />
              {isCurrentUser && (
                <span className="px-1.5 py-0.5 bg-ink-1 text-white text-[9px] font-mono uppercase tracking-wider">
                  You
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
          <div className="p-2 bg-ink-8 border border-ink-6 text-center">
            <p className="text-ink-4 uppercase tracking-wider">Watches</p>
            <p className="text-ink-0 font-bold text-sm mt-0.5">{user.task_count}</p>
          </div>
          <div className="p-2 bg-ink-8 border border-ink-6 text-center">
            <p className="text-ink-4 uppercase tracking-wider">Runs</p>
            <p className="text-ink-0 font-bold text-sm mt-0.5">{user.total_executions}</p>
          </div>
          <div className="p-2 bg-ink-8 border border-ink-6 text-center">
            <p className="text-ink-4 uppercase tracking-wider">Notifications</p>
            <p className="text-ink-0 font-bold text-sm mt-0.5">{user.notifications_count}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onEditRole(user)}
            disabled={isCurrentUser}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-ink-6 text-ink-3 hover:border-ink-4 hover:text-ink-0 transition-colors text-xs font-mono disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Edit className="h-3 w-3" />
            Edit Role
          </button>
          {user.is_active && (
            <button
              onClick={() => onDeactivate(user.id, user.email)}
              className="flex-1 px-3 py-2 bg-red-600 text-white hover:bg-red-700 transition-colors text-xs font-mono"
            >
              Deactivate
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
