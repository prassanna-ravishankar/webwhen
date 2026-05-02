import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Globe } from 'lucide-react';
import { api } from '@/lib/api';
import type { FeedExecution } from '@/types';
import { Card } from '@/components/torale';
import { ResultCard } from '@/components/ResultCard';
import { DynamicMeta } from '@/components/DynamicMeta';

export function Explore() {
  const navigate = useNavigate();
  const [feed, setFeed] = useState<FeedExecution[]>([]);
  const [isFeedLoading, setIsFeedLoading] = useState(true);

  const loadFeed = useCallback(async () => {
    setIsFeedLoading(true);
    try {
      const data = await api.getPublicFeed();
      setFeed(data);
    } catch (error) {
      console.error('Failed to load public feed:', error);
    } finally {
      setIsFeedLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  return (
    <>
      <DynamicMeta
        path="/explore"
        title="Explore — webwhen"
        description="See what people are watching with webwhen — public watches and recent triggers across the open web."
      />
      {isFeedLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
        </div>
      ) : feed.length === 0 ? (
        <Card className="p-12 text-center">
          <Globe className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-zinc-900 mb-2">No public triggers yet</h3>
          <p className="text-sm text-zinc-500 font-mono">Results from public watches will appear here.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {feed.map((execution) => (
            <ResultCard
              key={execution.id}
              execution={execution}
              onClick={() => navigate(`/tasks/${execution.task_id}`)}
            />
          ))}
        </div>
      )}
    </>
  );
}
