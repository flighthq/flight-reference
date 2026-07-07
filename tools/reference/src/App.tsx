import { useEffect, useMemo, useState } from 'react';

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
}

interface ReferenceCase {
  id: string;
  framework: 'openfl';
  corpus: string;
  name: string;
  title: string;
  summary: string;
  previewRenderers: PreviewRenderer[];
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

function implementationLabel(id: string): string {
  if (id === 'openfl') return 'OpenFL TS';
  if (id === 'openfl-haxe') return 'OpenFL Haxe';
  return id;
}

function rendererLabel(id: string): string {
  return id.toUpperCase();
}

export default function App() {
  const [corpusFilter, setCorpusFilter] = useState<CorpusFilter>('samples');
  const [selectedCaseId, setSelectedCaseId] = useState(allCases[0]?.id ?? fallbackCase.id);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('split');
  const [selectedRendererId, setSelectedRendererId] = useState('');

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

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__header">
          <h1>flight-reference</h1>
          <p>OpenFL reference corpus in the current standalone harness.</p>
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
                    <span>{referenceCase.summary}</span>
                    <small>
                      {referenceCase.corpus} · {referenceCase.previewRenderers.length > 0 ? 'preview' : 'source only'}
                    </small>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="sidebar__section sidebar__section--tight">
          <span className="sidebar__label">Repository rules</span>
          <ul className="sidebar__notes">
            <li>Keep the current harness shell.</li>
            <li>Serve committed OpenFL assets from this repo.</li>
            <li>Show imported corpus content directly.</li>
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
                <iframe className="pane__iframe" src={selectedRenderer.url} title={`${selectedCase.title} preview`} />
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
                  <h3>Details</h3>
                  <p>Imported implementation inventory for the selected OpenFL case.</p>
                </div>
                <div className="pane__status">
                  <span className="pane__pill pane__pill--subtle">{selectedCase.name}</span>
                </div>
              </header>

              <div className="detail-list">
                <div className="detail-card">
                  <span className="sidebar__label">Preview Routes</span>
                  {selectedCase.previewRenderers.length === 0 ? (
                    <p className="detail-card__empty">No live preview route is currently available.</p>
                  ) : (
                    <ul className="detail-card__list">
                      {selectedCase.previewRenderers.map((renderer) => (
                        <li key={renderer.id}>
                          <strong>{rendererLabel(renderer.label)}</strong>
                          <code>{renderer.url}</code>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="detail-card">
                  <span className="sidebar__label">Implementations</span>
                  <ul className="detail-card__list">
                    {selectedCase.implementations.map((implementation) => (
                      <li key={implementation.id}>
                        <strong>{implementationLabel(implementation.id)}</strong>
                        <span>
                          {implementation.mode === 'preview' ? 'runnable preview' : 'source only'} ·{' '}
                          {implementation.fileCount} files
                        </span>
                        <code>{implementation.path}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          ) : null}
        </section>
      </section>
    </main>
  );
}
