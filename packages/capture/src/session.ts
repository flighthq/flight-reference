import { fingerprintValue } from "./fingerprint.js";

export type CaptureLogLevel = "debug" | "info" | "warn" | "error";

export interface CaptureLogEntry {
  at: string;
  level: CaptureLogLevel;
  message: string;
  data?: unknown;
  fingerprint: string;
}

export interface CaptureSnapshot {
  at: string;
  label: string;
  value: unknown;
  fingerprint: string;
}

export interface CaptureSession {
  readonly name: string;
  recordLog(level: CaptureLogLevel, message: string, data?: unknown): CaptureLogEntry;
  recordSnapshot(label: string, value: unknown): CaptureSnapshot;
  getLogs(): CaptureLogEntry[];
  getSnapshots(): CaptureSnapshot[];
  getFingerprint(): string;
  toJSON(): {
    name: string;
    logs: CaptureLogEntry[];
    snapshots: CaptureSnapshot[];
  };
}

function cloneValue<T>(value: T): T {
  if (value === undefined) {
    return value;
  }

  try {
    return structuredClone(value);
  } catch {
    return value;
  }
}

export function createCaptureSession(name: string): CaptureSession {
  const logs: CaptureLogEntry[] = [];
  const snapshots: CaptureSnapshot[] = [];

  const stamp = () => new Date().toISOString();

  return {
    name,
    recordLog(level, message, data) {
      const entry: CaptureLogEntry = {
        at: stamp(),
        level,
        message,
        data: cloneValue(data),
        fingerprint: fingerprintValue({
          level,
          message,
          data
        })
      };

      logs.push(entry);
      return cloneValue(entry);
    },
    recordSnapshot(label, value) {
      const snapshot: CaptureSnapshot = {
        at: stamp(),
        label,
        value: cloneValue(value),
        fingerprint: fingerprintValue(value)
      };

      snapshots.push(snapshot);
      return cloneValue(snapshot);
    },
    getLogs() {
      return cloneValue(logs);
    },
    getSnapshots() {
      return cloneValue(snapshots);
    },
    getFingerprint() {
      return fingerprintValue({
        name,
        logs,
        snapshots
      });
    },
    toJSON() {
      return {
        name,
        logs: cloneValue(logs),
        snapshots: cloneValue(snapshots)
      };
    }
  };
}
