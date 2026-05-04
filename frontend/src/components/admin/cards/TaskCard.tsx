import { Search, User } from 'lucide-react'
import { formatShortDateTime } from '@/lib/utils'
import { StatusBadge } from '@/components/torale'
import { stateToVariant } from '../types'
import type { TaskData } from '../types'

interface TaskCardProps {
  task: TaskData
  isExpanded: boolean
  onToggle: () => void
}

export function TaskCard({ task, isExpanded, onToggle }: TaskCardProps) {
  return (
    <div
      className={`p-3 border transition-colors cursor-pointer ${isExpanded ? 'border-ink-4 bg-ink-8' : 'border-ink-6 hover:border-ink-5'}`}
      onClick={onToggle}
    >
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="bg-ink-1 text-white w-8 h-8 flex items-center justify-center shrink-0">
            <Search className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-xs sm:text-sm font-bold text-ink-0 truncate" title={task.name}>
              {task.name}
            </h3>
            <div className="flex items-center gap-1 text-[10px] font-mono text-ink-4 mt-0.5">
              <User className="h-3 w-3" />
              <span className="truncate" title={task.user_email}>{task.user_email}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <StatusBadge variant={stateToVariant(task.state)} />
            </div>
          </div>
        </div>

        <div className="space-y-2 pl-11">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-ink-4 mb-0.5">Search Query</p>
            <p className="text-xs font-mono text-ink-2 break-words">{task.search_query}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono text-ink-3 pl-11">
          <div>
            <span className="text-ink-4">Next Run:</span>{' '}
            <span className="text-ink-2">
              {task.next_run
                ? formatShortDateTime(task.next_run)
                : '-'}
            </span>
          </div>
          <div>
            <span className="text-ink-4">Runs:</span>{' '}
            <span className="text-ink-2">{task.execution_count}</span>
          </div>
          <div>
            <span className="text-ink-4">Triggers:</span>{' '}
            <span className="text-ink-2">{task.trigger_count}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
