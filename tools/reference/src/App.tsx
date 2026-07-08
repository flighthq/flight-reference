import { useEffect, useMemo, useRef, useState } from 'react';

import { cases } from 'virtual:openfl-reference-cases';

type CorpusFilter = 'all' | 'functional' | 'samples';
type LayoutMode = 'single' | 'split';

interface PreviewRenderer {
  id: string;
  label: string;
  url: string;
}

interface ImplementationSummary {
  id: string;
  mode: 'preview' | 'source';
  path: string;
  fileCount: number;
  previewUrl?: string;
}

interface ReferenceCase {
  id: string;
  framework: 'openfl';
  corpus: string;
  name: string;
  title: string;
  summary: string;
  previewRenderers: PreviewRenderer[];
  flightPreviewLabel?: string;
  flightPreviewUrl?: string;
  implementations: ImplementationSummary[];
}

const corpusLabels: Record<CorpusFilter, string> = {
  all: 'All',
  functional: 'Functional',
  samples: 'Samples',
};

const allCases = cases as ReferenceCase[];
const fallbackCase: ReferenceCase = {
  id: 'openfl/empty',
  framework: 'openfl',
  corpus: 'samples',
  name: 'empty',
  title: 'No OpenFL cases',
  summary: 'Add OpenFL reference implementations under reference/frameworks/openfl.',
  previewRenderers: [],
  implementations: [],
};

function corpusSortOrder(corpus: string): number {
  if (corpus === 'samples') return 0;
  if (corpus === 'functional') return 1;
  return 2;
}

function rendererLabel(id: string): string {
  if (id === 'default') return 'Default';
  return id.toUpperCase();
}

function readUrlState(): {
  corpusFilter: CorpusFilter;
  layoutMode: LayoutMode;
  selectedCaseId: string;
  selectedRendererId: string;
} {
  if (typeof window === 'undefined') {
    return {
      corpusFilter: 'samples',
      layoutMode: 'split',
      selectedCaseId: allCases[0]?.id ?? fallbackCase.id,
      selectedRendererId: '',
    };
  }

  const url = new URL(window.location.href);
  const corpus = url.searchParams.get('corpus');
  const layout = url.searchParams.get('layout');

  return {
    corpusFilter: corpus === 'all' || corpus === 'functional' || corpus === 'samples' ? corpus : 'samples',
    layoutMode: layout === 'single' || layout === 'split' ? layout : 'split',
    selectedCaseId: url.searchParams.get('case') ?? allCases[0]?.id ?? fallbackCase.id,
    selectedRendererId: url.searchParams.get('renderer') ?? '',
  };
}

function PreviewFrame({ src, title }: { src: string; title: string }) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [activeSrc, setActiveSrc] = useState<string | null>(src);

  useEffect(() => {
    if (frameRef.current) frameRef.current.src = 'about:blank';
    setActiveSrc(null);
    const handle = window.setTimeout(() => setActiveSrc(src), 0);
    return () => window.clearTimeout(handle);
  }, [src]);

  useEffect(() => {
    return () => {
      if (frameRef.current) frameRef.current.src = 'about:blank';
    };
  }, []);

  if (activeSrc === null) {
    return (
      <div className="pane__loading">
        <span>Loading preview…</span>
      </div>
    );
  }

  return <iframe key={activeSrc} ref={frameRef} className="pane__iframe" src={activeSrc} title={title} />;
}

export default function App() {
  const initialState = readUrlState();
  const [corpusFilter, setCorpusFilter] = useState<CorpusFilter>(initialState.corpusFilter);
  const [selectedCaseId, setSelectedCaseId] = useState(initialState.selectedCaseId);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(initialState.layoutMode);
  const [selectedRendererId, setSelectedRendererId] = useState(initialState.selectedRendererId);

  const visibleCases = useMemo(() => {
    const filtered =
      corpusFilter === 'all' ? allCases : allCases.filter((referenceCase) => referenceCase.corpus === corpusFilter);

    return [...filtered].sort((left, right) => {
      const corpusDelta = corpusSortOrder(left.corpus) - corpusSortOrder(right.corpus);
      if (corpusDelta !== 0) return corpusDelta;
      return left.title.localeCompare(right.title);
    });
  }, [corpusFilter]);

  const selectedCase = useMemo(
    () => visibleCases.find((referenceCase) => referenceCase.id === selectedCaseId) ?? visibleCases[0] ?? fallbackCase,
    [selectedCaseId, visibleCases],
  );

  useEffect(() => {
    if (!visibleCases.some((referenceCase) => referenceCase.id === selectedCaseId)) {
      setSelectedCaseId(visibleCases[0]?.id ?? fallbackCase.id);
    }
  }, [selectedCaseId, visibleCases]);

  useEffect(() => {
    const previewRenderers = selectedCase.previewRenderers;
    const firstRenderer = previewRenderers[0];

    if (!firstRenderer) {
      setSelectedRendererId('');
      return;
    }

    if (!previewRenderers.some((renderer) => renderer.id === selectedRendererId)) {
      setSelectedRendererId(firstRenderer.id);
    }
  }, [selectedCase, selectedRendererId]);

  const selectedRenderer =
    selectedCase.previewRenderers.find((renderer) => renderer.id === selectedRendererId) ??
    selectedCase.previewRenderers[0];
  const hasFlightImplementation = selectedCase.implementations.some((implementation) => implementation.id === 'flight');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    url.searchParams.set('corpus', corpusFilter);
    url.searchParams.set('layout', layoutMode);
    url.searchParams.set('case', selectedCase.id);

    if (selectedRenderer?.id) url.searchParams.set('renderer', selectedRenderer.id);
    else url.searchParams.delete('renderer');

    window.history.replaceState({}, '', url);
  }, [corpusFilter, layoutMode, selectedCase.id, selectedRenderer?.id]);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__header">
          <h1>flight-reference</h1>
        </div>

        <div className="sidebar__section">
          <span className="sidebar__label">Corpus</span>
          <div className="segmented segmented--full" role="tablist" aria-label="Corpus filter">
            {(Object.keys(corpusLabels) as CorpusFilter[]).map((filter) => (
              <button
                key={filter}
                type="button"
                className={
                  corpusFilter === filter ? 'segmented__button segmented__button--active' : 'segmented__button'
                }
                onClick={() => setCorpusFilter(filter)}>
                {corpusLabels[filter]}
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar__section">
          <span className="sidebar__label">OpenFL Cases</span>
          <ul className="scenario-list">
            {visibleCases.length === 0 ? (
              <li className="scenario-list__empty">No OpenFL cases matched the current filter.</li>
            ) : (
              visibleCases.map((referenceCase) => (
                <li key={referenceCase.id}>
                  <button
                    type="button"
                    className={
                      referenceCase.id === selectedCase.id
                        ? 'scenario-list__item scenario-list__item--active'
                        : 'scenario-list__item'
                    }
                    onClick={() => setSelectedCaseId(referenceCase.id)}>
                    <strong>{referenceCase.title}</strong>
                    <small>
                      {referenceCase.corpus} ·{' '}
                      {referenceCase.previewRenderers.length > 0 || referenceCase.flightPreviewUrl
                        ? 'preview'
                        : 'source only'}
                    </small>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </aside>

      <section className="workspace">
        <header className="toolbar">
          <div className="toolbar__meta">
            <h2>{selectedCase.title}</h2>
            <p>{selectedCase.summary}</p>
          </div>

          <div className="toolbar__controls">
            <div className="segmented" role="tablist" aria-label="Layout mode">
              <button
                type="button"
                className={
                  layoutMode === 'single' ? 'segmented__button segmented__button--active' : 'segmented__button'
                }
                onClick={() => setLayoutMode('single')}>
                Preview
              </button>
              <button
                type="button"
                className={layoutMode === 'split' ? 'segmented__button segmented__button--active' : 'segmented__button'}
                onClick={() => setLayoutMode('split')}>
                Split
              </button>
            </div>

            {selectedCase.previewRenderers.length > 0 ? (
              <div className="segmented" role="tablist" aria-label="Preview renderer">
                {selectedCase.previewRenderers.map((renderer) => (
                  <button
                    key={renderer.id}
                    type="button"
                    className={
                      selectedRenderer?.id === renderer.id
                        ? 'segmented__button segmented__button--active'
                        : 'segmented__button'
                    }
                    onClick={() => setSelectedRendererId(renderer.id)}>
                    {rendererLabel(renderer.label)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </header>

        <section className={layoutMode === 'split' ? 'pane-grid pane-grid--compare' : 'pane-grid pane-grid--single'}>
          <section className="pane">
            <header className="pane__header">
              <div>
                <h3>Preview</h3>
                <p>
                  {selectedRenderer
                    ? `Live OpenFL renderer: ${rendererLabel(selectedRenderer.label)}`
                    : 'This case currently ships source only.'}
                </p>
              </div>
              <div className="pane__status">
                <span className="pane__pill">{selectedCase.framework}</span>
                <span className="pane__pill pane__pill--subtle">{selectedCase.corpus}</span>
              </div>
            </header>

            {selectedRenderer ? (
              <div className="pane__iframe-wrap">
                <PreviewFrame src={selectedRenderer.url} title={`${selectedCase.title} preview`} />
              </div>
            ) : (
              <div className="pane__empty">
                <strong>No runnable OpenFL TS preview</strong>
                <p>
                  This case currently exists as imported source only. Use the details pane to inspect the available
                  implementation directories.
                </p>
              </div>
            )}
          </section>

          {layoutMode === 'split' ? (
            <section className="pane">
              <header className="pane__header">
                <div>
                  <h3>Flight</h3>
                  <p>
                    {selectedCase.flightPreviewUrl
                      ? `Live Flight renderer: ${rendererLabel(selectedCase.flightPreviewLabel ?? 'default')}`
                      : hasFlightImplementation
                        ? 'Flight source is present, but runnable preview requires a local Flight checkout.'
                        : 'This case does not currently have a Flight implementation.'}
                  </p>
                </div>
                <div className="pane__status">
                  <span className="pane__pill">flight</span>
                  <span className="pane__pill pane__pill--subtle">{selectedCase.name}</span>
                </div>
              </header>

              {selectedCase.flightPreviewUrl ? (
                <div className="pane__iframe-wrap">
                  <PreviewFrame src={selectedCase.flightPreviewUrl} title={`${selectedCase.title} flight preview`} />
                </div>
              ) : (
                <div className="pane__empty">
                  <strong>
                    {hasFlightImplementation
                      ? 'Configure a local Flight checkout to enable preview'
                      : 'No Flight implementation'}
                  </strong>
                  <p>
                    {hasFlightImplementation
                      ? 'Clone Flight under .cache/upstream/flight or set FLIGHT_REPO, install its dependencies, then restart the dev server.'
                      : 'This imported case currently only exposes the OpenFL preview or source directories.'}
                  </p>
                </div>
              )}
            </section>
          ) : null}
        </section>
      </section>
    </main>
  );
}
