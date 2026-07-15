import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { cases } from 'virtual:reference-cases';

type LayoutMode = 'single' | 'split';
type NavigationDirection = 'next' | 'prev' | 'first' | 'last';

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
  framework: string;
  corpus: string;
  name: string;
  title: string;
  summary: string;
  previewRenderers: PreviewRenderer[];
  flightPreviewRenderers?: PreviewRenderer[];
  implementations: ImplementationSummary[];
}

const baseUrl = import.meta.env.BASE_URL;
const allCases = cases as ReferenceCase[];
const fallbackCase: ReferenceCase = {
  id: 'empty',
  framework: 'openfl',
  corpus: 'samples',
  name: 'empty',
  title: 'No cases found',
  summary: 'Add reference implementations under reference/frameworks/.',
  previewRenderers: [],
  implementations: [],
};

const availableFrameworks = [...new Set(allCases.map((c) => c.framework))].sort();

function frameworkLabel(id: string): string {
  if (id === 'openfl') return 'OpenFL';
  if (id === 'starling') return 'Starling';
  return id.charAt(0).toUpperCase() + id.slice(1);
}

function corporaForFramework(framework: string): string[] {
  return [...new Set(allCases.filter((c) => c.framework === framework).map((c) => c.corpus))].sort((a, b) => {
    if (a === 'samples') return -1;
    if (b === 'samples') return 1;
    return a.localeCompare(b);
  });
}

function rendererLabel(id: string): string {
  if (id === 'default') return 'Default';
  if (id === 'webgl') return 'GL';
  if (id === 'webgpu') return 'GPU';
  if (id === 'canvas') return 'Canvas';
  if (id === 'dom') return 'DOM';
  return id.toUpperCase();
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.tagName === 'OPTION'
  );
}

function clampCaseIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(total - 1, index));
}

function navigationDirectionFromKey(event: KeyboardEvent): NavigationDirection | null {
  if (event.altKey || event.ctrlKey || event.metaKey) return null;
  if (isEditableTarget(event.target)) return null;

  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowDown':
    case 'PageDown':
      return 'next';
    case 'ArrowLeft':
    case 'ArrowUp':
    case 'PageUp':
      return 'prev';
    case ' ':
    case 'Space':
    case 'Spacebar':
      return event.shiftKey ? 'prev' : 'next';
    case 'Home':
      return 'first';
    case 'End':
      return 'last';
    default:
      return null;
  }
}

function readUrlState(): {
  framework: string;
  corpus: string;
  layoutMode: LayoutMode;
  selectedCaseId: string;
  selectedRendererId: string;
} {
  const defaults = {
    framework: availableFrameworks[0] ?? 'openfl',
    corpus: '',
    layoutMode: 'split' as LayoutMode,
    selectedCaseId: allCases[0]?.id ?? fallbackCase.id,
    selectedRendererId: '',
  };

  if (typeof window === 'undefined') return defaults;

  const url = new URL(window.location.href);

  const framework = url.searchParams.get('framework') ?? defaults.framework;
  const corpus = url.searchParams.get('corpus') ?? '';
  const layout = url.searchParams.get('layout');

  return {
    framework: availableFrameworks.includes(framework) ? framework : defaults.framework,
    corpus,
    layoutMode: layout === 'single' || layout === 'split' ? layout : 'split',
    selectedCaseId: url.searchParams.get('case') ?? defaults.selectedCaseId,
    selectedRendererId: url.searchParams.get('renderer') ?? '',
  };
}

const splitViewport = { width: 670, height: 400 };

function PreviewFrame({ src, title, miniaturized }: { src: string; title: string; miniaturized: boolean }) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const teardownMeasurementRef = useRef<(() => void) | null>(null);
  const [cropSize, setCropSize] = useState(splitViewport);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    return () => {
      teardownMeasurementRef.current?.();
      if (frameRef.current) frameRef.current.src = 'about:blank';
    };
  }, []);

  useEffect(() => {
    if (!miniaturized) {
      setScale(1);
      return;
    }

    const updateScale = () => {
      const wrap = wrapRef.current;
      if (!wrap) return;

      const bounds = wrap.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;

      const nextScale = Math.min(bounds.width / cropSize.width, bounds.height / cropSize.height, 1);
      setScale(Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1);
    };

    updateScale();

    const observer = new ResizeObserver(updateScale);
    if (wrapRef.current) observer.observe(wrapRef.current);

    return () => observer.disconnect();
  }, [cropSize.height, cropSize.width, miniaturized]);

  const handleLoad = () => {
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
    if (!doc) return;

    teardownMeasurementRef.current?.();

    if (!miniaturized) return;

    const measure = () => {
      let maxRight = 0;
      let maxBottom = 0;

      for (const child of Array.from(doc.body.querySelectorAll<HTMLElement>('*'))) {
        const rect = child.getBoundingClientRect();
        maxRight = Math.max(maxRight, rect.right);
        maxBottom = Math.max(maxBottom, rect.bottom);
      }

      const measuredWidth =
        maxRight > 64 ? maxRight : Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth, splitViewport.width);
      const measuredHeight =
        maxBottom > 64
          ? maxBottom
          : Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight, splitViewport.height);

      setCropSize({
        width: Math.max(64, Math.ceil(measuredWidth)),
        height: Math.max(64, Math.ceil(measuredHeight)),
      });
    };

    const timers = [0, 50, 150, 400, 1000].map((delay) => window.setTimeout(measure, delay));
    const mutationObserver = new MutationObserver(() => {
      window.requestAnimationFrame(measure);
    });
    mutationObserver.observe(doc.body, { attributes: true, childList: true, subtree: true });

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(doc.documentElement);
    resizeObserver.observe(doc.body);

    teardownMeasurementRef.current = () => {
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      for (const timer of timers) window.clearTimeout(timer);
    };
  };

  if (!miniaturized) {
    return <iframe ref={frameRef} className="pane__iframe" src={src} title={title} onLoad={handleLoad} />;
  }

  return (
    <div ref={wrapRef} className="pane__mini-stage">
      <div className="pane__mini-crop" style={{ width: cropSize.width * scale, height: cropSize.height * scale }}>
        <iframe
          ref={frameRef}
          className="pane__iframe pane__iframe--mini"
          src={src}
          title={title}
          onLoad={handleLoad}
          style={{
            width: cropSize.width,
            height: cropSize.height,
            transform: `scale(${scale})`,
          }}
        />
      </div>
    </div>
  );
}

export default function App() {
  const initialState = readUrlState();
  const [selectedFramework, setSelectedFramework] = useState(initialState.framework);
  const [selectedCorpus, setSelectedCorpus] = useState(initialState.corpus);
  const [selectedCaseId, setSelectedCaseId] = useState(initialState.selectedCaseId);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(initialState.layoutMode);
  const [selectedRendererId, setSelectedRendererId] = useState(initialState.selectedRendererId);

  const corpora = useMemo(() => corporaForFramework(selectedFramework), [selectedFramework]);
  const activeCorpus = corpora.includes(selectedCorpus) ? selectedCorpus : (corpora[0] ?? '');

  useEffect(() => {
    if (!corpora.includes(selectedCorpus)) {
      setSelectedCorpus(corpora[0] ?? '');
    }
  }, [corpora, selectedCorpus]);

  const visibleCases = useMemo(() => {
    return allCases
      .filter((c) => c.framework === selectedFramework && (activeCorpus === '' || c.corpus === activeCorpus))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [selectedFramework, activeCorpus]);

  const selectedCase = useMemo(
    () => visibleCases.find((c) => c.id === selectedCaseId) ?? visibleCases[0] ?? fallbackCase,
    [selectedCaseId, visibleCases],
  );

  useEffect(() => {
    if (!visibleCases.some((c) => c.id === selectedCaseId)) {
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
  const selectedCaseIndex = visibleCases.findIndex((c) => c.id === selectedCase.id);
  const selectedFlightRenderer =
    selectedCase.flightPreviewRenderers?.find((renderer) => renderer.id === selectedRenderer?.id) ??
    selectedCase.flightPreviewRenderers?.find((renderer) => renderer.id === 'webgl') ??
    selectedCase.flightPreviewRenderers?.[0];
  const hasFlightImplementation = selectedCase.implementations.some((impl) => impl.id === 'flight');

  useEffect(() => {
    const selectedButton = document.querySelector<HTMLElement>(`[data-case-id="${CSS.escape(selectedCase.id)}"]`);
    selectedButton?.scrollIntoView({ block: 'nearest' });
  }, [selectedCase.id]);

  const navigateCases = useCallback(
    (direction: NavigationDirection) => {
      let nextIndex = selectedCaseIndex;

      switch (direction) {
        case 'next':
          nextIndex = clampCaseIndex(selectedCaseIndex + 1, visibleCases.length);
          break;
        case 'prev':
          nextIndex = clampCaseIndex(selectedCaseIndex - 1, visibleCases.length);
          break;
        case 'first':
          nextIndex = 0;
          break;
        case 'last':
          nextIndex = clampCaseIndex(visibleCases.length - 1, visibleCases.length);
          break;
      }

      const nextCase = visibleCases[nextIndex];
      if (nextCase && nextCase.id !== selectedCase.id) setSelectedCaseId(nextCase.id);
    },
    [selectedCase.id, selectedCaseIndex, visibleCases],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    url.searchParams.set('framework', selectedFramework);
    url.searchParams.set('corpus', activeCorpus);
    url.searchParams.set('layout', layoutMode);
    url.searchParams.set('case', selectedCase.id);

    if (selectedRenderer?.id) url.searchParams.set('renderer', selectedRenderer.id);
    else url.searchParams.delete('renderer');

    window.history.replaceState({}, '', url);
  }, [selectedFramework, activeCorpus, layoutMode, selectedCase.id, selectedRenderer?.id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const direction = navigationDirectionFromKey(event);
      if (!direction) return;
      event.preventDefault();
      navigateCases(direction);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigateCases]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'reference:navigate' && typeof event.data.caseId === 'string') {
        const target = allCases.find((c) => c.id === event.data.caseId);
        if (target) {
          setSelectedFramework(target.framework);
          setSelectedCorpus(target.corpus);
          setSelectedCaseId(target.id);
        }
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const fwLabel = frameworkLabel(selectedFramework);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__header">
          <h1>flight-reference</h1>
        </div>

        {availableFrameworks.length > 1 ? (
          <div className="sidebar__section">
            <span className="sidebar__label">Framework</span>
            <div className="segmented segmented--full" role="tablist" aria-label="Framework">
              {availableFrameworks.map((fw) => (
                <button
                  key={fw}
                  type="button"
                  className={
                    selectedFramework === fw ? 'segmented__button segmented__button--active' : 'segmented__button'
                  }
                  onClick={() => setSelectedFramework(fw)}>
                  {frameworkLabel(fw)}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {corpora.length > 1 ? (
          <div className="sidebar__section">
            <span className="sidebar__label">Corpus</span>
            <div className="segmented segmented--full" role="tablist" aria-label="Corpus filter">
              {corpora.map((corpus) => (
                <button
                  key={corpus}
                  type="button"
                  className={
                    activeCorpus === corpus ? 'segmented__button segmented__button--active' : 'segmented__button'
                  }
                  onClick={() => setSelectedCorpus(corpus)}>
                  {corpus.charAt(0).toUpperCase() + corpus.slice(1)}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="sidebar__section sidebar__section--grow">
          <span className="sidebar__label">{fwLabel} Cases</span>
          <ul className="scenario-list">
            {visibleCases.length === 0 ? (
              <li className="scenario-list__empty">No cases matched the current filter.</li>
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
                    onClick={() => setSelectedCaseId(referenceCase.id)}
                    data-case-id={referenceCase.id}>
                    <strong>{referenceCase.title}</strong>
                    <small>
                      {referenceCase.corpus} ·{' '}
                      {referenceCase.previewRenderers.length > 0 ||
                      (referenceCase.flightPreviewRenderers?.length ?? 0) > 0
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
            {hasFlightImplementation || selectedCase.flightPreviewRenderers?.length ? (
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
                  className={
                    layoutMode === 'split' ? 'segmented__button segmented__button--active' : 'segmented__button'
                  }
                  onClick={() => setLayoutMode('split')}>
                  Split
                </button>
              </div>
            ) : null}

            {selectedCase.previewRenderers.length > 1 ? (
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

        <section
          className={
            layoutMode === 'split' && (hasFlightImplementation || selectedCase.flightPreviewRenderers?.length)
              ? 'pane-grid pane-grid--compare'
              : 'pane-grid pane-grid--single'
          }>
          <section className="pane">
            <header className="pane__header">
              <div>
                <h3>{fwLabel}</h3>
                <p>
                  {selectedRenderer
                    ? `Live ${fwLabel} renderer: ${rendererLabel(selectedRenderer.label)}`
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
                <PreviewFrame
                  key={selectedRenderer.url}
                  src={`${baseUrl}${selectedRenderer.url}`}
                  title={`${selectedCase.title} preview`}
                  miniaturized={
                    layoutMode === 'split' &&
                    selectedCase.framework !== 'awayjs' &&
                    !!(hasFlightImplementation || selectedCase.flightPreviewRenderers?.length)
                  }
                />
              </div>
            ) : (
              <div className="pane__empty">
                <strong>No runnable preview</strong>
                <p>
                  This case currently exists as imported source only. Use the details pane to inspect the available
                  implementation directories.
                </p>
              </div>
            )}
          </section>

          {layoutMode === 'split' && (hasFlightImplementation || selectedCase.flightPreviewRenderers?.length) ? (
            <section className="pane">
              <header className="pane__header">
                <div>
                  <h3>Flight</h3>
                  <p>
                    {selectedFlightRenderer
                      ? `Live Flight renderer: ${rendererLabel(selectedFlightRenderer.label)}`
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

              {selectedFlightRenderer ? (
                <div className="pane__iframe-wrap">
                  <PreviewFrame
                    key={selectedFlightRenderer.url}
                    src={`${baseUrl}${selectedFlightRenderer.url}`}
                    title={`${selectedCase.title} flight preview`}
                    miniaturized
                  />
                </div>
              ) : (
                <div className="pane__empty">
                  <strong>{hasFlightImplementation ? 'Flight preview unavailable' : 'No Flight implementation'}</strong>
                  <p>
                    {hasFlightImplementation
                      ? 'Flight source is present but no runnable preview entry was found.'
                      : 'This case does not have a Flight implementation.'}
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
