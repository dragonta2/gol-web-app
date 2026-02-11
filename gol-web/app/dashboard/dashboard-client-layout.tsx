'use client';

import { useState } from 'react';
import CollapsibleDashboardHeader from './collapsible-dashboard-header';
import DashboardTabs from './dashboard-tabs';
import type { DashboardHeaderProfile } from './collapsible-dashboard-header';
import type { DashboardTabsProps } from '@/lib/types';
import type { DayDeltas } from '@/lib/score-calculator';

const TAB_SCREEN_NAMES: Record<string, string> = {
  journal: '日誌',
  'todo-summary': 'ToDoサマリー',
  stats: '統計',
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
  ...tabsProps
}: DashboardClientLayoutProps) {
  const [activeTab, setActiveTab] = useState<
    'journal' | 'todo-summary' | 'stats'
  >('journal');
  const screenName = (TAB_SCREEN_NAMES[activeTab] ?? '')
    ? `${TAB_SCREEN_NAMES[activeTab]} 画面`
    : '';

  return (
    <>
      <CollapsibleDashboardHeader
        userProfile={userProfile}
        selectedDate={selectedDate}
        screenName={screenName}
        pendingDeltas={pendingDeltas ?? undefined}
      />
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <DashboardTabs
          {...tabsProps}
          activeTab={activeTab}
          onActiveTabChange={setActiveTab}
        />
      </div>
    </>
  );
}
