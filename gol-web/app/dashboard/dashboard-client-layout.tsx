'use client';

import { useState } from 'react';
import { CalendarDialogProvider } from '@/contexts/calendar-dialog-context';
import CollapsibleDashboardHeader from './collapsible-dashboard-header';
import DashboardTabs from './dashboard-tabs';
import ApplyNewUserDefaultsBanner from './apply-new-user-defaults-banner';
import DateSelector from '@/components/date-selector';
import type { DashboardHeaderProfile } from './collapsible-dashboard-header';
import type { DashboardTabsProps } from '@/lib/types';
import type { DayDeltas } from '@/lib/score-calculator';

const TAB_SCREEN_NAMES: Record<string, string> = {
  journal: '日誌',
  'todo-summary': 'ToDoサマリー',
  stats: '統計',
  journals: '過去の日誌',
  announcements: 'お知らせ',
};

export interface DashboardClientLayoutProps extends DashboardTabsProps {
  userProfile: DashboardHeaderProfile;
  selectedDate: string;
  /** 未確定の日誌がある日の仮スコア（確定時に反映されるデルタ） */
  pendingDeltas?: DayDeltas | null;
}

export default function DashboardClientLayout({
  userProfile,
  selectedDate,
  pendingDeltas,
  dailyLog,
  ...tabsProps
}: DashboardClientLayoutProps) {
  const [activeTab, setActiveTab] = useState<
    'journal' | 'todo-summary' | 'stats' | 'journals' | 'announcements'
  >('journal');
  const screenName = (TAB_SCREEN_NAMES[activeTab] ?? '')
    ? `${TAB_SCREEN_NAMES[activeTab]} 画面`
    : '';

  return (
    <CalendarDialogProvider>
      <CollapsibleDashboardHeader
        userProfile={userProfile}
        selectedDate={selectedDate}
        screenName={screenName}
        activeTab={activeTab}
        pendingDeltas={pendingDeltas ?? undefined}
        isConfirmed={dailyLog?.is_confirmed ?? false}
      />
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex justify-end mb-4 sm:mb-6">
          <DateSelector />
        </div>
        <ApplyNewUserDefaultsBanner />
        <DashboardTabs
          {...tabsProps}
          dailyLog={dailyLog}
          activeTab={activeTab}
          onActiveTabChange={setActiveTab}
        />
      </div>
    </CalendarDialogProvider>
  );
}
