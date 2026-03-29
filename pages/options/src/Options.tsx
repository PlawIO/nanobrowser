import { useState, useEffect } from 'react';
import '@src/Options.css';
import { Button } from '@extension/ui';
import { withErrorBoundary, withSuspense } from '@extension/shared';
import { t } from '@extension/i18n';
import { FiSettings, FiCpu, FiShield, FiTrendingUp, FiHelpCircle, FiLock } from 'react-icons/fi';
import { GeneralSettings } from './components/GeneralSettings';
import { ModelSettings } from './components/ModelSettings';
import { FirewallSettings } from './components/FirewallSettings';
import { AnalyticsSettings } from './components/AnalyticsSettings';
import { VetoSettings } from './components/VetoSettings';

type TabTypes = 'general' | 'models' | 'firewall' | 'veto' | 'analytics' | 'help';

const TABS: { id: TabTypes; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { id: 'general', icon: FiSettings, label: t('options_tabs_general') },
  { id: 'models', icon: FiCpu, label: t('options_tabs_models') },
  { id: 'firewall', icon: FiShield, label: t('options_tabs_firewall') },
  { id: 'veto', icon: FiLock, label: 'Veto' },
  { id: 'analytics', icon: FiTrendingUp, label: 'Analytics' },
  { id: 'help', icon: FiHelpCircle, label: t('options_tabs_help') },
];

const Options = () => {
  const [activeTab, setActiveTab] = useState<TabTypes>('models');
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(darkModeMediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };

    darkModeMediaQuery.addEventListener('change', handleChange);
    return () => darkModeMediaQuery.removeEventListener('change', handleChange);
  }, []);

  const handleTabClick = (tabId: TabTypes) => {
    if (tabId === 'help') {
      window.open('https://nanobrowser.ai/docs', '_blank');
    } else {
      setActiveTab(tabId);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralSettings isDarkMode={isDarkMode} />;
      case 'models':
        return <ModelSettings isDarkMode={isDarkMode} />;
      case 'firewall':
        return <FirewallSettings isDarkMode={isDarkMode} />;
      case 'veto':
        return <VetoSettings isDarkMode={isDarkMode} />;
      case 'analytics':
        return <AnalyticsSettings isDarkMode={isDarkMode} />;
      default:
        return null;
    }
  };

  return (
    <div
      className="flex min-h-screen min-w-[768px]"
      style={{
        backgroundColor: isDarkMode ? '#080808' : '#f5f5f5',
        color: isDarkMode ? '#fafafa' : '#080808',
        fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}>
      {/* Vertical Navigation Bar */}
      <nav
        className="w-48 border-r"
        style={{
          borderColor: isDarkMode ? '#1f1f1f' : '#e5e5e5',
          backgroundColor: isDarkMode ? '#0d0d0d' : '#ffffff',
        }}>
        <div className="p-4">
          <h1 className="mb-6 text-xl font-bold" style={{ color: isDarkMode ? '#fafafa' : '#080808' }}>
            {t('options_nav_header')}
          </h1>
          <ul className="space-y-1">
            {TABS.map(item => (
              <li key={item.id}>
                <Button
                  onClick={() => handleTabClick(item.id)}
                  className="flex w-full items-center space-x-2 px-4 py-2 text-left text-sm transition-colors"
                  style={{
                    backgroundColor: activeTab === item.id ? (isDarkMode ? '#1a1a1a' : '#f2f2f2') : 'transparent',
                    color: activeTab === item.id ? '#F97316' : isDarkMode ? '#b8b8b8' : '#525252',
                    borderLeft: activeTab === item.id ? '2px solid #F97316' : '2px solid transparent',
                  }}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-8" style={{ backgroundColor: isDarkMode ? '#080808' : '#f5f5f5' }}>
        <div className="mx-auto min-w-[512px] max-w-screen-lg">{renderTabContent()}</div>
      </main>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Options, <div>Loading...</div>), <div>Error Occurred</div>);
