/* eslint-disable react/prop-types */
import { FaTrash } from 'react-icons/fa';
import { BsBookmark } from 'react-icons/bs';
import { t } from '@extension/i18n';

interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
}

interface ChatHistoryListProps {
  sessions: ChatSession[];
  onSessionSelect: (sessionId: string) => void;
  onSessionDelete: (sessionId: string) => void;
  onSessionBookmark: (sessionId: string) => void;
  visible: boolean;
}

const ChatHistoryList: React.FC<ChatHistoryListProps> = ({
  sessions,
  onSessionSelect,
  onSessionDelete,
  onSessionBookmark,
  visible,
}) => {
  if (!visible) return null;

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="h-full overflow-y-auto p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>
        {t('chat_history_title')}
      </h2>
      {sessions.length === 0 ? (
        <div
          className="p-4 text-center text-sm"
          style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }}>
          {t('chat_history_empty')}
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map(session => (
            <div
              key={session.id}
              className="group relative rounded-none px-3 py-2.5 transition-all duration-150 hover:opacity-90"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <button onClick={() => onSessionSelect(session.id)} className="w-full text-left" type="button">
                <h3 className="truncate text-sm font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
                  {session.title}
                </h3>
                <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {formatDate(session.createdAt)}
                </p>
              </button>

              {/* Bookmark button - top right */}
              {onSessionBookmark && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onSessionBookmark(session.id);
                  }}
                  className="absolute right-2 top-2 p-1.5 opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ color: 'var(--accent)' }}
                  aria-label={t('chat_history_bookmark')}
                  type="button">
                  <BsBookmark size={12} />
                </button>
              )}

              {/* Delete button - bottom right */}
              <button
                onClick={e => {
                  e.stopPropagation();
                  onSessionDelete(session.id);
                }}
                className="absolute bottom-2 right-2 p-1.5 opacity-0 transition-opacity group-hover:opacity-100"
                style={{ color: 'var(--text-muted)' }}
                aria-label={t('chat_history_delete')}
                type="button">
                <FaTrash size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatHistoryList;
