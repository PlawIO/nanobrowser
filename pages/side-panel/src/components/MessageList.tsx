import type { Message } from '@extension/storage';
import { ACTOR_PROFILES } from '../types/message';
import { memo } from 'react';

interface MessageListProps {
  messages: Message[];
}

export default memo(function MessageList({ messages }: MessageListProps) {
  return (
    <div className="max-w-full space-y-4">
      {messages.map((message, index) => (
        <MessageBlock
          key={`${message.actor}-${message.timestamp}-${index}`}
          message={message}
          isSameActor={index > 0 ? messages[index - 1].actor === message.actor : false}
        />
      ))}
    </div>
  );
});

interface MessageBlockProps {
  message: Message;
  isSameActor: boolean;
}

function MessageBlock({ message, isSameActor }: MessageBlockProps) {
  if (!message.actor) {
    console.error('No actor found');
    return <div />;
  }
  const actor = ACTOR_PROFILES[message.actor as keyof typeof ACTOR_PROFILES];
  const isProgress = message.content === 'Showing progress...';
  const isUser = message.actor === 'user';

  return (
    <div
      className={`flex max-w-full gap-3 ${
        !isSameActor ? 'mt-4 border-t border-[var(--border-subtle)] pt-4 first:mt-0 first:border-t-0 first:pt-0' : ''
      }`}>
      {!isSameActor && (
        <div
          className="flex size-7 shrink-0 items-center justify-center"
          style={{ backgroundColor: actor.iconBackground }}>
          <img src={actor.icon} alt={actor.name} className="size-6" />
        </div>
      )}
      {isSameActor && <div className="w-7" />}

      <div className="min-w-0 flex-1">
        {!isSameActor && (
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>
            {actor.name}
          </div>
        )}

        <div className="group space-y-0.5">
          <div
            className={`whitespace-pre-wrap break-words text-sm ${isUser ? 'px-3 py-2' : ''}`}
            style={{
              color: isUser ? 'var(--text-secondary)' : 'var(--text-primary)',
              ...(isUser ? { backgroundColor: 'var(--bg-user)' } : {}),
            }}>
            {isProgress ? (
              <div className="h-0.5 overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                <div className="h-full animate-progress rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
              </div>
            ) : (
              message.content
            )}
          </div>
          {!isProgress && (
            <div
              className="text-right text-xs opacity-0 transition-opacity group-hover:opacity-100"
              style={{ color: 'var(--text-muted)' }}>
              {formatTimestamp(message.timestamp)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Formats a timestamp (in milliseconds) to a readable time string
 * @param timestamp Unix timestamp in milliseconds
 * @returns Formatted time string
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();

  // Check if the message is from today
  const isToday = date.toDateString() === now.toDateString();

  // Check if the message is from yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  // Check if the message is from this year
  const isThisYear = date.getFullYear() === now.getFullYear();

  // Format the time (HH:MM)
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isToday) {
    return timeStr; // Just show the time for today's messages
  }

  if (isYesterday) {
    return `Yesterday, ${timeStr}`;
  }

  if (isThisYear) {
    // Show month and day for this year
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
  }

  // Show full date for older messages
  return `${date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}, ${timeStr}`;
}
