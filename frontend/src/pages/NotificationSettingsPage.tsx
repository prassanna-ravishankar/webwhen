import React from 'react';
import { Mail, Webhook, Key, History } from 'lucide-react';
import { EmailManagementSection } from '@/components/settings/EmailManagementSection';
import { WebhookConfigSection } from '@/components/settings/WebhookConfigSection';
import { NotificationHistorySection } from '@/components/settings/NotificationHistorySection';
import { ApiKeyManagementSection } from '@/components/settings/ApiKeyManagementSection';
import { SettingsTabs } from '@/components/settings/SettingsTabs';

/**
 * NotificationSettingsPage - settings panel for notification configuration
 */
export const NotificationSettingsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="p-4 md:p-8">
        <SettingsTabs />

        {/* Settings Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Email Management */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Mail className="h-4 w-4 text-zinc-400" />
                <h2 className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Email Addresses</h2>
              </div>
              <EmailManagementSection />
            </section>

            {/* Webhook Configuration */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Webhook className="h-4 w-4 text-zinc-400" />
                <h2 className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Webhooks</h2>
              </div>
              <WebhookConfigSection />
            </section>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* API Key Management */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Key className="h-4 w-4 text-zinc-400" />
                <h2 className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">API Keys</h2>
              </div>
              <ApiKeyManagementSection />
            </section>

            {/* Notification History */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <History className="h-4 w-4 text-zinc-400" />
                <h2 className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Notification History</h2>
              </div>
              <NotificationHistorySection />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};
