import { describe, expect, it } from "vitest";

import { fingerprintValue } from "./fingerprint.js";
import { createCaptureSession } from "./session.js";

describe("fingerprintValue", () => {
  it("stays stable across object key order", () => {
    const first = fingerprintValue({
      z: 1,
      a: {
        enabled: true,
        count: 4
      }
    });

    const second = fingerprintValue({
      a: {
        count: 4,
        enabled: true
      },
      z: 1
    });

    expect(first).toBe(second);
  });
});

describe("createCaptureSession", () => {
  it("records immutable snapshots and logs", () => {
    const session = createCaptureSession("compare");
    const mutable = {
      count: 1,
      note: "before"
    };

    session.recordSnapshot("initial", mutable);
    mutable.note = "after";
    session.recordLog("info", "updated", mutable);

    const snapshots = session.getSnapshots();
    const logs = session.getLogs();

    expect(snapshots).toHaveLength(1);
    expect(logs).toHaveLength(1);
    expect(snapshots[0]?.value).toEqual({
      count: 1,
      note: "before"
    });
    expect(logs[0]?.data).toEqual({
      count: 1,
      note: "after"
    });
    expect(session.getFingerprint()).toHaveLength(64);
  });
});
