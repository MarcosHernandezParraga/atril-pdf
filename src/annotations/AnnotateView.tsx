// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// "Annotate" mode for the current page: pen, highlighter, eraser, text, and
// "move" for the staves and images placed on the page.
// The finger can be excluded ("stylus only") so only the pencil writes and the
// palm resting on the screen never leaves marks.

import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import {
  GestureDetector,
  PointerType,
  useCompetingGestures,
  usePanGesture,
  useTapGesture,
} from 'react-native-gesture-handler';

import { newId } from '../core/ids';
import {
  DEFAULT_LAYER_ID,
  type Annotation,
  type InkAnnotation,
  type InkPoint,
  type PageRef,
  type TextAnnotation,
} from '../core/model';
import { pageToView, viewScale, viewToPage } from '../core/pageTransform';
import type { DisplayFilter, InputMode } from '../settings/defaults';
import { RADIUS, SPACING, useTheme } from '../theme';
import { IconButton } from '../ui/primitives';
import { fitWidth, PageView, pageHeightForWidth } from '../reader/PageView';
import { InkCanvas } from './AnnotationLayer';
import { ObjectEditor } from './ObjectEditor';
import { duplicateObject, isPlacedObject, objectHit, type PlacedObject } from './objects';
import { pointerAllowed } from './input';
import {
  hasRealPressure,
  measureText,
  penOutlinePath,
  polylinePath,
  simplify,
  strokesHit,
  textHit,
} from './ink';

export type AnnotationTool = 'pen' | 'highlighter' | 'eraser' | 'text' | 'select';

export interface ToolState {
  tool: AnnotationTool;
  penColor: string;
  highlighterColor: string;
  penWidth: number;
  highlighterWidth: number;
  textColor: string;
  textSize: number;
}

export const DEFAULT_TOOL_STATE: ToolState = {
  tool: 'pen',
  penColor: '#111111',
  highlighterColor: '#FFEB3B',
  penWidth: 2,
  highlighterWidth: 12,
  textColor: '#111111',
  textSize: 16,
};

interface Editing {
  ann: TextAnnotation;
  isNew: boolean;
}

export function AnnotateView({
  page,
  annotations,
  boxWidth,
  boxHeight,
  tools,
  inputMode,
  filter,
  brightness,
  onAdd,
  onRemove,
  onUpdate,
  selectedId,
  onSelect,
}: {
  page: PageRef;
  annotations: Annotation[];
  boxWidth: number;
  boxHeight: number;
  tools: ToolState;
  inputMode: InputMode;
  filter: DisplayFilter;
  brightness: number;
  onAdd: (a: Annotation[]) => void;
  onRemove: (ids: string[]) => void;
  onUpdate: (a: Annotation) => void;
  /** Staff or image selected with the "move" tool. */
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const w = fitWidth(page, boxWidth, boxHeight);
  const h = pageHeightForWidth(page, w);
  const scale = viewScale(page, w);
  const [live, setLive] = useState<InkPoint[]>([]);
  const [erasing, setErasing] = useState<string[]>([]);
  const [editing, setEditing] = useState<Editing | null>(null);
  const ignore = useRef(false);
  const points = useRef<InkPoint[]>([]);
  const erased = useRef<Set<string>>(new Set());
  const raf = useRef<number | null>(null);

  const inks = useMemo(() => annotations.filter((a): a is InkAnnotation => a.type === 'ink'), [annotations]);
  const texts = useMemo(
    () => annotations.filter((a): a is TextAnnotation => a.type === 'text'),
    [annotations],
  );
  const objects = useMemo(() => annotations.filter(isPlacedObject), [annotations]);
  const [draft, setDraft] = useState<PlacedObject | null>(null);
  const selecting = tools.tool === 'select';
  const selected = selecting ? (objects.find((o) => o.id === selectedId) ?? null) : null;

  // Saves the text being written (empty text = nothing / removed).
  const commit = () => {
    if (!editing) return;
    const text = editing.ann.text.replace(/\s+$/, '');
    if (!text) {
      if (!editing.isNew) onRemove([editing.ann.id]);
    } else {
      const size = measureText(text, editing.ann.fontSize);
      const ann = { ...editing.ann, text, ...size };
      if (editing.isNew) onAdd([ann]);
      else onUpdate(ann);
    }
    setEditing(null);
  };
  // Leaving the page or changing tool also saves it.
  const commitFromEffect = useEffectEvent(() => commit());
  useEffect(() => () => commitFromEffect(), [page.id]);
  useEffect(() => {
    // Synchronises the text being edited with the document when the tool changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tools.tool !== 'text') commitFromEffect();
  }, [tools.tool]);

  const flushLive = () => {
    if (raf.current !== null) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = null;
      setLive([...points.current]);
    });
  };

  const eraseAt = (x: number, y: number) => {
    const p = viewToPage(page, w, { x, y });
    const hits = strokesHit(inks, p.x, p.y, 10 / scale);
    let changed = false;
    for (const id of hits) {
      if (!erased.current.has(id)) {
        erased.current.add(id);
        changed = true;
      }
    }
    if (changed) setErasing([...erased.current]);
  };

  const drawing = tools.tool !== 'text' && tools.tool !== 'select';
  const pan = usePanGesture({
    runOnJS: true,
    enabled: drawing,
    minDistance: 0,
    maxPointers: 1,
    onBegin: (e) => {
      ignore.current = !pointerAllowed(inputMode, e.pointerType);
      if (ignore.current) return;
      if (tools.tool === 'eraser') {
        erased.current = new Set();
        eraseAt(e.x, e.y);
        return;
      }
      const pressure = e.pointerType === PointerType.STYLUS && e.stylusData ? e.stylusData.pressure : 0.5;
      points.current = [[e.x, e.y, pressure]];
      flushLive();
    },
    onUpdate: (e) => {
      if (ignore.current) return;
      if (tools.tool === 'eraser') {
        eraseAt(e.x, e.y);
        return;
      }
      const pressure = e.pointerType === PointerType.STYLUS && e.stylusData ? e.stylusData.pressure : 0.5;
      points.current.push([e.x, e.y, pressure]);
      flushLive();
    },
    onFinalize: () => {
      if (ignore.current) return;
      if (tools.tool === 'eraser') {
        const ids = [...erased.current];
        erased.current = new Set();
        setErasing([]);
        if (ids.length > 0) onRemove(ids);
        return;
      }
      const pts = points.current;
      points.current = [];
      setLive([]);
      if (pts.length === 0) return;
      const pagePts = simplify(
        pts.map(([x, y, p]) => {
          const q = viewToPage(page, w, { x, y });
          return [q.x, q.y, p] as InkPoint;
        }),
        0.25,
      );
      const highlighter = tools.tool === 'highlighter';
      const stroke: InkAnnotation = {
        id: newId(),
        layerId: DEFAULT_LAYER_ID,
        type: 'ink',
        tool: highlighter ? 'highlighter' : 'pen',
        color: highlighter ? tools.highlighterColor : tools.penColor,
        width: highlighter ? tools.highlighterWidth : tools.penWidth,
        points: pagePts,
      };
      onAdd([stroke]);
    },
  });

  const tap = useTapGesture({
    runOnJS: true,
    enabled: tools.tool === 'text' || selecting,
    maxDistance: 10,
    onActivate: (e) => {
      if (!pointerAllowed(inputMode === 'off' ? 'both' : inputMode, e.pointerType)) return;
      const p = viewToPage(page, w, { x: e.x, y: e.y });
      if (selecting) {
        // Touch a staff or an image to select it; touch elsewhere to unselect.
        onSelect(objectHit(objects, p.x, p.y, 10 / scale)?.id ?? null);
        return;
      }
      commit();
      const hit = textHit(texts, p.x, p.y);
      if (hit) {
        setEditing({ ann: hit, isNew: false });
        return;
      }
      const fontSize = tools.textSize;
      setEditing({
        isNew: true,
        ann: {
          id: newId(),
          layerId: DEFAULT_LAYER_ID,
          type: 'text',
          x: p.x,
          y: Math.max(0, p.y - fontSize * 0.7),
          width: fontSize * 4,
          height: fontSize * 1.3,
          text: '',
          fontSize,
          color: tools.textColor,
          bold: false,
        },
      });
    },
  });

  const gestures = useCompetingGestures(pan, tap);

  // (React Compiler memoises this; no manual useMemo needed.)
  const livePath = (() => {
    if (live.length === 0) return [];
    const highlighter = tools.tool === 'highlighter';
    return [
      {
        id: 'live',
        d: highlighter
          ? polylinePath(live.map(([x, y]) => ({ x, y })))
          : penOutlinePath(live, Math.max(1, tools.penWidth * scale), hasRealPressure(live)),
        color: highlighter ? tools.highlighterColor : tools.penColor,
        highlighter,
        strokeWidth: tools.highlighterWidth * scale,
      },
    ];
  })();

  const hidden = new Set([
    ...erasing,
    ...(editing && !editing.isNew ? [editing.ann.id] : []),
    ...(draft ? [draft.id] : []),
  ]);
  const editPos = editing ? pageToView(page, w, { x: editing.ann.x, y: editing.ann.y }) : null;
  const setEdit = (patch: Partial<TextAnnotation>) =>
    setEditing((e) => (e ? { ...e, ann: { ...e.ann, ...patch } } : e));

  return (
    <View style={styles.center} testID="annotate-view">
      <View style={{ width: w, height: h }}>
        <PageView
          page={page}
          width={w}
          filter={filter}
          brightness={brightness}
          annotations={annotations}
          hiddenIds={hidden}
        />
        <GestureDetector gesture={gestures}>
          <View
            testID="annotate-surface"
            style={[
              StyleSheet.absoluteFill,
              Platform.OS === 'web'
                ? ({
                    cursor: tools.tool === 'text' ? 'text' : selecting ? 'default' : 'crosshair',
                    touchAction: 'none',
                  } as object)
                : null,
            ]}
            collapsable={false}
          >
            <InkCanvas paths={livePath} width={w} height={h} />
          </View>
        </GestureDetector>
        {selected ? (
          <ObjectEditor
            key={selected.id}
            page={page}
            viewWidth={w}
            viewHeight={h}
            object={selected}
            draft={draft?.id === selected.id ? draft : null}
            onDraft={setDraft}
            onCommit={(o) => onUpdate(o)}
            onDuplicate={() => {
              const copy = duplicateObject(selected, newId());
              onAdd([copy]);
              onSelect(copy.id);
            }}
            onDelete={() => {
              onRemove([selected.id]);
              onSelect(null);
            }}
            onToggleBackground={() =>
              selected.type === 'staff' && onUpdate({ ...selected, opaque: !selected.opaque })
            }
            onDone={() => onSelect(null)}
          />
        ) : null}
        {editing && editPos ? (
          <View style={[styles.editor, { left: Math.min(editPos.x, w - 160), top: editPos.y }]}>
            <View style={[styles.editBar, { backgroundColor: theme.overlay }]}>
              <IconButton
                icon="format-font-size-decrease"
                label={t('annotate.smallerText')}
                color="#FFFFFF"
                size={20}
                onPress={() => setEdit({ fontSize: Math.max(8, editing.ann.fontSize - 2) })}
              />
              <IconButton
                icon="format-font-size-increase"
                label={t('annotate.largerText')}
                color="#FFFFFF"
                size={20}
                onPress={() => setEdit({ fontSize: Math.min(72, editing.ann.fontSize + 2) })}
              />
              <IconButton
                icon="format-bold"
                label={t('annotate.bold')}
                color={editing.ann.bold ? theme.primary : '#FFFFFF'}
                size={20}
                onPress={() => setEdit({ bold: !editing.ann.bold })}
              />
              {['#111111', '#D32F2F', '#1565C0', '#2E7D32'].map((c) => (
                <IconButton
                  key={c}
                  icon={editing.ann.color === c ? 'checkbox-blank-circle' : 'circle'}
                  label={c}
                  color={c === '#111111' ? '#FFFFFF' : c}
                  size={18}
                  onPress={() => setEdit({ color: c })}
                />
              ))}
              <IconButton
                icon="trash-can-outline"
                label={t('annotate.deleteText')}
                color="#FFFFFF"
                size={20}
                onPress={() => {
                  if (!editing.isNew) onRemove([editing.ann.id]);
                  setEditing(null);
                }}
              />
              <IconButton
                icon="check"
                label={t('common.done')}
                color="#FFFFFF"
                size={22}
                onPress={commit}
                testID="text-done"
              />
            </View>
            <TextInput
              testID="annotation-text-input"
              autoFocus
              multiline
              value={editing.ann.text}
              onChangeText={(text) => setEdit({ text })}
              placeholder={t('annotate.typeHere')}
              placeholderTextColor="#8A8178"
              style={[
                styles.input,
                {
                  color: editing.ann.color,
                  fontSize: editing.ann.fontSize * scale,
                  lineHeight: editing.ann.fontSize * scale * 1.3,
                  fontWeight: editing.ann.bold ? '700' : '400',
                  borderColor: theme.accent,
                  minWidth: 160,
                },
              ]}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  editor: { position: 'absolute' },
  editBar: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: SPACING.xs,
    flexDirection: 'row',
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.xs,
  },
  input: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 6,
    paddingHorizontal: 2,
    paddingVertical: 0,
    backgroundColor: 'rgba(255,255,255,0.7)',
    textAlignVertical: 'top',
  },
});
