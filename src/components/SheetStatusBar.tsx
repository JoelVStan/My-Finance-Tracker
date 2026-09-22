import React, { useState } from 'react';
import { SheetConnectionConfig } from '../types';
import { Database, RefreshCw, CheckCircle2, Sliders, ExternalLink } from 'lucide-react';

interface SheetStatusBarProps {
  config: SheetConnectionConfig;
  onRefresh: () => Promise<void>;
  onUpdateConfig: (newConfig: SheetConnectionConfig) => void;
  openCategoryManager: () => void;
}

export const SheetStatusBar: React.FC<SheetStatusBarProps> = ({
  config,
  onRefresh,
  onUpdateConfig,
  openCategoryManager,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [tempSheetId, setTempSheetId] = useState(config.spreadsheetId);

  const handleRefreshClick = async () => {
    try {
      setIsRefreshing(true);
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSaveConfig = () => {
    let id = tempSheetId.trim();
    const match = id.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      id = match[1];
    }
    onUpdateConfig({
      ...config,
      spreadsheetId: id || config.spreadsheetId,
      lastSyncedAt: new Date().toISOString(),
    });
    setShowConfigModal(false);
  };

  return (
    <>
      <div
        id="sheet-connection-bar"
        className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3 mb-6 flex flex-wrap items-center justify-between gap-3 text-xs"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <div className="flex items-center gap-1.5 font-medium text-neutral-200">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Google Sheets REST API</span>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Link to open Google Sheet directly */}
          <a
            href={
              config.spreadsheetId && config.spreadsheetId !== 'personal-finances-tracker-sheet'
                ? `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/edit`
                : '#google-workspace-auth-section'
            }
            target={
              config.spreadsheetId && config.spreadsheetId !== 'personal-finances-tracker-sheet'
                ? '_blank'
                : undefined
            }
            rel="noopener noreferrer"
            id="status-bar-open-sheet"
            onClick={(e) => {
              if (
                !config.spreadsheetId ||
                config.spreadsheetId === 'personal-finances-tracker-sheet'
              ) {
                const el = document.getElementById('google-workspace-auth-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="px-2.5 py-1 rounded-lg border border-emerald-700/60 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 hover:text-emerald-100 transition-colors flex items-center gap-1.5 text-[11px] font-medium"
            title="Open live Google Spreadsheet (Excel format)"
          >
            <ExternalLink className="w-3 h-3 text-emerald-400" />
            <span>Open Google Sheet</span>
          </a>

          {/* Category Management Button */}
          <button
            type="button"
            onClick={openCategoryManager}
            className="px-2.5 py-1 rounded-lg border border-neutral-700 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-neutral-100 transition-colors flex items-center gap-1 text-[11px]"
          >
            <span>Edit Categories</span>
          </button>

          {/* Sync Button */}
          <button
            type="button"
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="px-2.5 py-1 rounded-lg border border-neutral-700 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-neutral-100 transition-colors flex items-center gap-1.5 text-[11px]"
            title="Refresh spreadsheet data"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync'}</span>
          </button>

          {/* Config Settings Button */}
          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
            title="Spreadsheet REST API Configuration"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-700 bg-neutral-900 p-5 shadow-2xl">
            <h4 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              Google Sheets REST API Configuration
            </h4>
            <p className="text-xs text-neutral-400 mt-1">
              The environment automatically manages the active spreadsheet connection and authorization.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Spreadsheet ID
                </label>
                <input
                  type="text"
                  value={tempSheetId}
                  onChange={(e) => setTempSheetId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-neutral-950 border border-neutral-700 text-neutral-100 focus:outline-none focus:border-neutral-500"
                />
              </div>

              <div className="rounded-lg bg-neutral-950 p-3 border border-neutral-800 space-y-1.5 text-[11px] text-neutral-400">
                <div className="font-semibold text-neutral-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Active REST Endpoints:
                </div>
                <div>• <code className="text-neutral-300">GET /spreadsheets/.../values/Categories!A:B</code></div>
                <div>• <code className="text-neutral-300">GET /spreadsheets/.../values/Transactions!A:E</code></div>
                <div>• <code className="text-neutral-300">POST /spreadsheets/.../values/Transactions!A:E:append</code></div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-3 py-1.5 rounded-lg border border-neutral-700 text-xs text-neutral-300 hover:bg-neutral-800"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSaveConfig}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                Apply Sheet ID
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
