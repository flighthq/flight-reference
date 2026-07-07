import { type CSSProperties, useMemo, useRef, useState } from "react";

import {
  createCaptureSession,
  fingerprintValue,
  type CaptureLogEntry,
  type CaptureSession
} from "@flighthq/capture";
import scenarioManifest from "../../../reference/frameworks/openfl/samples/manifest.json";

type PaneId = "flight" | "alternative";
type Mode = "single" | "compare";
type Accent = "cyan" | "amber" | "rose";

interface DriverState {
  count: number;
  note: string;
  accent: Accent;
  enabled: boolean;
}

interface ScenarioDefinition {
  id: string;
  title: string;
  summary: string;
  status: string;
  initialState: DriverState;
}

type HarnessState = Record<PaneId, DriverState>;

const scenarios = scenarioManifest as ScenarioDefinition[];
const paneOrder: PaneId[] = ["flight", "alternative"];
const paneLabels: Record<PaneId, string> = {
  flight: "Flight GL",
  alternative: "Alternative GL"
};
const paneSummaries: Record<PaneId, string> = {
  flight: "Reference renderer surface",
  alternative: "Comparison renderer surface"
};
const accentLabels: Accent[] = ["cyan", "amber", "rose"];
const fallbackScenario: ScenarioDefinition = {
  id: "empty",
  title: "Empty manifest",
  summary: "Add scenarios to scenarios/manifest.json.",
  status: "needs-scenarios",
  initialState: {
    count: 0,
    note: "",
    accent: "cyan",
    enabled: true
  }
};

function createHarnessState(initialState: DriverState): HarnessState {
  return {
    flight: structuredClone(initialState),
    alternative: structuredClone(initialState)
  };
}

function createSessionSet(scenarioId: string): Record<PaneId, CaptureSession> {
  const sessions = {
    flight: createCaptureSession(`flight:${scenarioId}`),
    alternative: createCaptureSession(`alternative:${scenarioId}`)
  };

  sessions.flight.recordLog("info", "Scenario selected", {
    scenarioId
  });
  sessions.alternative.recordLog("info", "Scenario selected", {
    scenarioId
  });

  return sessions;
}

function summarizeLogs(session: CaptureSession): CaptureLogEntry[] {
  return session.getLogs().slice(-4).reverse();
}

interface PaneProps {
  paneId: PaneId;
  state: DriverState;
  session: CaptureSession;
  mirrorInputs: boolean;
  onCountDelta(delta: number): void;
  onNoteChange(value: string): void;
  onAccentChange(value: Accent): void;
  onEnabledChange(value: boolean): void;
}

function RendererPane({
  paneId,
  state,
  session,
  mirrorInputs,
  onCountDelta,
  onNoteChange,
  onAccentChange,
  onEnabledChange
}: PaneProps) {
  const logs = summarizeLogs(session);
  const fingerprint = fingerprintValue(state).slice(0, 12);
  const accentToken = `var(--accent-${state.accent})`;

  return (
    <section className="pane">
      <header className="pane__header">
        <div>
          <h3>{paneLabels[paneId]}</h3>
          <p>{paneSummaries[paneId]}</p>
        </div>
        <div className="pane__status">
          <span className="pane__pill">{mirrorInputs ? "Lockstep" : "Independent"}</span>
          <span className="pane__pill pane__pill--subtle">{fingerprint}</span>
        </div>
      </header>

      <div className="pane__stage" style={{ "--accent-color": accentToken } as CSSProperties}>
        <div className="stage__metric">
          <span className="stage__label">count</span>
          <strong>{state.count}</strong>
        </div>
        <div className="stage__metric">
          <span className="stage__label">enabled</span>
          <strong>{state.enabled ? "true" : "false"}</strong>
        </div>
        <div className="stage__note">
          <span className="stage__label">note</span>
          <p>{state.note || "No note set."}</p>
        </div>
      </div>

      <div className="pane__controls">
        <div className="control control--compact">
          <span className="control__label">Counter</span>
          <div className="stepper">
            <button type="button" onClick={() => onCountDelta(-1)} aria-label={`Decrease ${paneLabels[paneId]}`}>
              -
            </button>
            <span>{state.count}</span>
            <button type="button" onClick={() => onCountDelta(1)} aria-label={`Increase ${paneLabels[paneId]}`}>
              +
            </button>
          </div>
        </div>

        <label className="control">
          <span className="control__label">Note</span>
          <input
            type="text"
            value={state.note}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder="Describe the current interaction"
          />
        </label>

        <label className="control control--compact">
          <span className="control__label">Accent</span>
          <select value={state.accent} onChange={(event) => onAccentChange(event.target.value as Accent)}>
            {accentLabels.map((accent) => (
              <option key={accent} value={accent}>
                {accent}
              </option>
            ))}
          </select>
        </label>

        <label className="toggle">
          <input
            type="checkbox"
            checked={state.enabled}
            onChange={(event) => onEnabledChange(event.target.checked)}
          />
          <span>Enabled</span>
        </label>
      </div>

      <dl className="pane__meta">
        <div>
          <dt>session</dt>
          <dd>{session.name}</dd>
        </div>
        <div>
          <dt>snapshots</dt>
          <dd>{session.getSnapshots().length}</dd>
        </div>
        <div>
          <dt>capture</dt>
          <dd>{session.getFingerprint().slice(0, 12)}</dd>
        </div>
      </dl>

      <div className="pane__logs">
        <div className="pane__logs-header">
          <h4>Recent logs</h4>
          <span>{logs.length}</span>
        </div>
        <ul>
          {logs.map((entry) => (
            <li key={`${entry.at}-${entry.message}`}>
              <span>{entry.level}</span>
              <strong>{entry.message}</strong>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function App() {
  const initialScenario = scenarios[0] ?? fallbackScenario;
  const [selectedScenarioId, setSelectedScenarioId] = useState(initialScenario.id);
  const [mode, setMode] = useState<Mode>("compare");
  const [mirrorInputs, setMirrorInputs] = useState(true);
  const [harnessState, setHarnessState] = useState<HarnessState>(() => createHarnessState(initialScenario.initialState));
  const sessionsRef = useRef<Record<PaneId, CaptureSession>>(createSessionSet(initialScenario.id));

  const selectedScenario = useMemo(
    () => scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? initialScenario,
    [initialScenario, selectedScenarioId]
  );

  const applyUpdate = (target: PaneId, message: string, updater: (current: DriverState) => DriverState) => {
    setHarnessState((current) => {
      const recipients = mirrorInputs ? paneOrder : [target];
      const nextState = {
        ...current
      };

      for (const paneId of recipients) {
        const updated = updater(current[paneId]);
        nextState[paneId] = updated;
        sessionsRef.current[paneId].recordLog("info", message, updated);
        sessionsRef.current[paneId].recordSnapshot(message, updated);
      }

      return nextState;
    });
  };

  const selectScenario = (scenario: ScenarioDefinition) => {
    setSelectedScenarioId(scenario.id);
    sessionsRef.current = createSessionSet(scenario.id);

    const nextState = createHarnessState(scenario.initialState);
    paneOrder.forEach((paneId) => {
      sessionsRef.current[paneId].recordSnapshot("reset", nextState[paneId]);
    });

    setHarnessState(nextState);
  };

  const visiblePanes = mode === "compare" ? paneOrder : (["flight"] as PaneId[]);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__header">
          <h1>flight-reference</h1>
          <p>Reference harness first. Tests and snapshots support the app, not the other way around.</p>
        </div>

        <div className="sidebar__section">
          <span className="sidebar__label">Scenarios</span>
          <ul className="scenario-list">
            {scenarios.length === 0 ? (
              <li className="scenario-list__empty">Add entries to `reference/frameworks/openfl/samples/manifest.json`.</li>
            ) : (
              scenarios.map((scenario) => (
                <li key={scenario.id}>
                  <button
                    type="button"
                    className={scenario.id === selectedScenario.id ? "scenario-list__item scenario-list__item--active" : "scenario-list__item"}
                    onClick={() => selectScenario(scenario)}
                  >
                    <strong>{scenario.title}</strong>
                    <span>{scenario.summary}</span>
                    <small>{scenario.status}</small>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="sidebar__section sidebar__section--tight">
          <span className="sidebar__label">Repository rules</span>
          <ul className="sidebar__notes">
            <li>`@flighthq/capture` stays reusable.</li>
            <li>Assets live in this repo.</li>
            <li>Side-by-side comparison is the default mode.</li>
          </ul>
        </div>
      </aside>

      <section className="workspace">
        <header className="toolbar">
          <div className="toolbar__meta">
            <h2>{selectedScenario.title}</h2>
            <p>{selectedScenario.summary}</p>
          </div>

          <div className="toolbar__controls">
            <div className="segmented" role="tablist" aria-label="Harness mode">
              <button
                type="button"
                className={mode === "single" ? "segmented__button segmented__button--active" : "segmented__button"}
                onClick={() => setMode("single")}
              >
                Single
              </button>
              <button
                type="button"
                className={mode === "compare" ? "segmented__button segmented__button--active" : "segmented__button"}
                onClick={() => setMode("compare")}
              >
                Compare
              </button>
            </div>

            <label className="toggle">
              <input
                type="checkbox"
                checked={mirrorInputs}
                onChange={(event) => setMirrorInputs(event.target.checked)}
              />
              <span>Mirror inputs</span>
            </label>
          </div>
        </header>

        <section className={mode === "compare" ? "pane-grid pane-grid--compare" : "pane-grid pane-grid--single"}>
          {visiblePanes.map((paneId) => (
            <RendererPane
              key={paneId}
              paneId={paneId}
              state={harnessState[paneId]}
              session={sessionsRef.current[paneId]}
              mirrorInputs={mirrorInputs}
              onCountDelta={(delta) =>
                applyUpdate(paneId, delta > 0 ? "Increment counter" : "Decrement counter", (current) => ({
                  ...current,
                  count: current.count + delta
                }))
              }
              onNoteChange={(value) =>
                applyUpdate(paneId, "Edit note", (current) => ({
                  ...current,
                  note: value
                }))
              }
              onAccentChange={(value) =>
                applyUpdate(paneId, "Change accent", (current) => ({
                  ...current,
                  accent: value
                }))
              }
              onEnabledChange={(value) =>
                applyUpdate(paneId, "Toggle enabled", (current) => ({
                  ...current,
                  enabled: value
                }))
              }
            />
          ))}
        </section>
      </section>
    </main>
  );
}
