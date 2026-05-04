import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { TaskExecution } from "@/types";
import { GroundingSourceList } from "@/components/ui/GroundingSourceList";
import { AgentActivity } from "@/components/AgentActivity";
import { StatusBadge, SectionLabel, CollapsibleSection, type StatusVariant } from "@/components/torale";
import { formatShortDateTime } from "@/lib/utils";
import { markdownFull } from "@/lib/markdown";
import { Clock } from "lucide-react";

const rehypePlugins = [rehypeSanitize];

interface ExecutionTimelineProps {
  executions: TaskExecution[];
  isOwner?: boolean;
}

const formatDate = formatShortDateTime;

interface ExecutionCardProps {
  execution: TaskExecution;
}

const ExecutionCard: React.FC<ExecutionCardProps> = ({ execution }) => {
  const content = execution.notification || execution.result?.evidence;
  const sources = execution.result?.sources || execution.grounding_sources;

  return (
    <div className="py-10 border-b border-ink-7 last:border-0 relative group">
      {/* Header: Date and Status */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <StatusBadge variant={execution.status as StatusVariant} />
          {execution.status === 'success' && execution.result?.notification && (
            <span className="text-[10px] font-mono text-emerald-600 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-sm border border-emerald-100">
              Condition Met
            </span>
          )}
        </div>
        <span className="text-xs text-ink-4 font-mono">
          {formatDate(execution.started_at)}
        </span>
      </div>

      {/* Main Content (Markdown) */}
      {content && (
        <div className="prose prose-sm md:prose-base max-w-none text-ink-2 leading-relaxed font-serif mb-8">
          <ReactMarkdown
            rehypePlugins={rehypePlugins}
            components={markdownFull}
          >
            {content}
          </ReactMarkdown>
        </div>
      )}

      {/* Sources - Seamless integration */}
      {sources && sources.length > 0 && (
        <div className="mb-8">
          <SectionLabel className="mb-3 text-ink-4">Sources</SectionLabel>
          <GroundingSourceList
            sources={sources}
            title=""
          />
        </div>
      )}

      {/* Technical Metadata - Subtle Footer */}
      <div className="space-y-2 mt-8 pt-6 border-t border-ink-7 opacity-60 hover:opacity-100 transition-opacity">
        {execution.result?.activity && execution.result.activity.length > 0 && (
          <AgentActivity activity={execution.result.activity} />
        )}

        {execution.result?.evidence && execution.result?.notification && (
          <CollapsibleSection
            title="Agent Reasoning"
            defaultOpen={false}
            variant="default"
          >
            <div className="p-4 bg-ink-8 border border-ink-6 mt-2 text-xs font-mono text-ink-3 whitespace-pre-wrap leading-relaxed rounded-sm">
              {execution.result.evidence}
            </div>
          </CollapsibleSection>
        )}

        {execution.error_message && (
          <div className="p-4 bg-red-50 border border-red-100 mt-2 rounded-sm">
            <SectionLabel className="mb-2 text-red-400">Error Details</SectionLabel>
            <p className="text-sm text-red-600 font-mono">
              {execution.error_message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export const ExecutionTimeline: React.FC<ExecutionTimelineProps> = ({
  executions,
  isOwner = false,
}) => {
  const visibleExecutions = executions
    .filter((ex) => {
      if (ex.status === "retrying") return false;
      if (!isOwner && ex.status === "failed" && !ex.result?.notification) return false;
      return true;
    })
    .map((ex) => (!isOwner && ex.error_message ? { ...ex, error_message: null } : ex));

  if (visibleExecutions.length === 0) {
    return (
      <div className="text-center py-20 bg-white border border-ink-6">
        <Clock className="h-12 w-12 mx-auto text-ink-5 mb-4" />
        <h3 className="text-lg font-medium text-ink-0 mb-1">No activity recorded</h3>
        <p className="text-sm text-ink-4 font-mono">
          This watch hasn't produced any results yet.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-ink-6 px-6 sm:px-12 divide-y divide-ink-7">
      {visibleExecutions.map((execution) => (
        <ExecutionCard
          key={execution.id}
          execution={execution}
        />
      ))}
    </div>
  );
};
