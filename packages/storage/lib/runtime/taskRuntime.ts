import { createStorage } from '../base/base';
import { StorageEnum } from '../base/enums';
import type { BaseStorage } from '../base/types';
import {
  type AgentEvent,
  type ContentRuntimeSnapshot,
  type RuntimeExecutionEvent,
  RuntimeTaskStatus,
  type TaskRuntimeState,
  type TrustSignal,
  type VerificationResult,
} from './protocol';

const MAX_RUNTIME_EVENTS = 200;
const MAX_TRUST_SIGNALS = 20;

const defaultRuntimeState: TaskRuntimeState = {
  activeTask: null,
};

const storage = createStorage<TaskRuntimeState>('task-runtime-state', defaultRuntimeState, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

const toRuntimeExecutionEvent = (event: AgentEvent): RuntimeExecutionEvent => ({
  ...event,
  eventId: crypto.randomUUID(),
});

export type TaskRuntimeStorage = BaseStorage<TaskRuntimeState> & {
  startTask: (taskId: string, task: string, tabId: number | null) => Promise<void>;
  setStatus: (status: RuntimeTaskStatus) => Promise<void>;
  recordEvent: (event: AgentEvent) => Promise<RuntimeExecutionEvent>;
  recordTrustSignal: (taskId: string, message: string) => Promise<TrustSignal>;
  setVerification: (verification: VerificationResult) => Promise<void>;
  setContentRuntime: (snapshot: ContentRuntimeSnapshot) => Promise<void>;
  clearActiveTask: () => Promise<void>;
};

export const taskRuntimeStore: TaskRuntimeStorage = {
  ...storage,
  async startTask(taskId: string, task: string, tabId: number | null) {
    const now = Date.now();
    await storage.set({
      activeTask: {
        taskId,
        task,
        tabId,
        status: RuntimeTaskStatus.RUNNING,
        startedAt: now,
        updatedAt: now,
        events: [],
        trustSignals: [],
        verification: null,
        contentRuntime: null,
      },
    });
  },
  async setStatus(status: RuntimeTaskStatus) {
    await storage.set(current => ({
      activeTask: current.activeTask
        ? {
            ...current.activeTask,
            status,
            updatedAt: Date.now(),
          }
        : null,
    }));
  },
  async recordEvent(event: AgentEvent) {
    const runtimeEvent = toRuntimeExecutionEvent(event);
    await storage.set(current => ({
      activeTask: current.activeTask
        ? {
            ...current.activeTask,
            updatedAt: Date.now(),
            events: [...current.activeTask.events, runtimeEvent].slice(-MAX_RUNTIME_EVENTS),
          }
        : null,
    }));
    return runtimeEvent;
  },
  async recordTrustSignal(taskId: string, message: string) {
    const signal: TrustSignal = {
      id: crypto.randomUUID(),
      taskId,
      message,
      timestamp: Date.now(),
    };
    await storage.set(current => ({
      activeTask:
        current.activeTask && current.activeTask.taskId === taskId
          ? {
              ...current.activeTask,
              updatedAt: Date.now(),
              trustSignals: [...current.activeTask.trustSignals, signal].slice(-MAX_TRUST_SIGNALS),
            }
          : current.activeTask,
    }));
    return signal;
  },
  async setVerification(verification: VerificationResult) {
    await storage.set(current => ({
      activeTask:
        current.activeTask && current.activeTask.taskId === verification.taskId
          ? {
              ...current.activeTask,
              updatedAt: Date.now(),
              verification,
            }
          : current.activeTask,
    }));
  },
  async setContentRuntime(snapshot: ContentRuntimeSnapshot) {
    await storage.set(current => ({
      activeTask:
        current.activeTask && current.activeTask.tabId === snapshot.tabId
          ? {
              ...current.activeTask,
              updatedAt: Date.now(),
              contentRuntime: snapshot,
            }
          : current.activeTask,
    }));
  },
  async clearActiveTask() {
    await storage.set(defaultRuntimeState);
  },
};
