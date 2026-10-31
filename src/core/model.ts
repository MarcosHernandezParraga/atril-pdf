// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Non-destructive document model. The original files (sources) are never
// modified: a document is an ordered list of page references plus the
// annotations drawn on each page. Every coordinate is expressed in PDF points
// of the *unrotated, uncropped* page, with the origin at the top-left corner
// and the Y axis pointing down.

export type Rotation = 0 | 90 | 180 | 270;

export interface Size {
  width: number;
  height: number;
}

/** Margins removed from each side, as fractions (0..1) of the unrotated page size. */
export interface Margins {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export type PageKind = 'pdf' | 'blank' | 'staff' | 'image';

export interface StaffPaperConfig {
  /** Number of staves (or grand-staff systems when `piano` is true). */
  staves: number;
  piano: boolean;
}

interface PageRefBase {
  id: string;
  /** Page size in points (for PDF pages, the size reported by the source, already honouring /Rotate). */
  size: Size;
  /** Additional rotation chosen by the user. */
  rotation: Rotation;
  crop: Margins | null;
}

export interface PdfPageRef extends PageRefBase {
  kind: 'pdf';
  sourceId: string;
  pageIndex: number;
}

export interface BlankPageRef extends PageRefBase {
  kind: 'blank';
}

export interface StaffPageRef extends PageRefBase {
  kind: 'staff';
  staff: StaffPaperConfig;
}

export interface ImagePageRef extends PageRefBase {
  kind: 'image';
  sourceId: string;
}

export type PageRef = PdfPageRef | BlankPageRef | StaffPageRef | ImagePageRef;

// ---------------------------------------------------------------------------
// Annotations
// ---------------------------------------------------------------------------

/** x, y in points; pressure in 0..1 (0.5 when the device does not report it). */
export type InkPoint = [x: number, y: number, pressure: number];

interface AnnotationBase {
  id: string;
  layerId: string;
}

export interface InkAnnotation extends AnnotationBase {
  type: 'ink';
  tool: 'pen' | 'highlighter';
  color: string;
  /** Nominal stroke width in points. */
  width: number;
  points: InkPoint[];
}

export interface TextAnnotation extends AnnotationBase {
  type: 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  color: string;
  bold: boolean;
}

export type ShapeKind = 'line' | 'arrow' | 'ellipse' | 'rect';

export interface ShapeAnnotation extends AnnotationBase {
  type: 'shape';
  shape: ShapeKind;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width: number;
}

export interface StampAnnotation extends AnnotationBase {
  type: 'stamp';
  stamp: string;
  /** Centre of the stamp. */
  x: number;
  y: number;
  /** Height of the glyph box in points. */
  size: number;
  color: string;
}

export type ClefKind = 'treble' | 'bass' | 'alto' | 'tenor';

export interface StaffAnnotation extends AnnotationBase {
  type: 'staff';
  x: number;
  y: number;
  width: number;
  /** Number of staves (1-4). With `piano`, a grand staff (2 staves + brace). */
  staves: number;
  piano: boolean;
  clef: ClefKind | null;
  /** Distance between two staff lines, in points. */
  lineSpacing: number;
  lineWidth: number;
  /** Distance between two staves of the same block, in points. */
  staffGap: number;
  opaque: boolean;
}

export interface ImageAnnotation extends AnnotationBase {
  type: 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  sourceId: string;
}

export type Annotation =
  | InkAnnotation
  | TextAnnotation
  | ShapeAnnotation
  | StampAnnotation
  | StaffAnnotation
  | ImageAnnotation;

export interface AnnotationLayer {
  id: string;
  name: string;
  visible: boolean;
}

export const DEFAULT_LAYER_ID = 'default';

export interface DocumentModel {
  formatVersion: 1;
  pages: PageRef[];
  /** Annotations by page id. Pages without annotations may be absent. */
  annotations: Record<string, Annotation[]>;
  layers: AnnotationLayer[];
}

export function emptyModel(): DocumentModel {
  return {
    formatVersion: 1,
    pages: [],
    annotations: {},
    layers: [{ id: DEFAULT_LAYER_ID, name: '', visible: true }],
  };
}

export const PAPER_SIZES = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
} as const satisfies Record<string, Size>;

export type PaperSize = keyof typeof PAPER_SIZES;

/** Size of a page as displayed: crop applied, then rotation. */
export function displayedPageSize(page: PageRef): Size {
  const crop = page.crop ?? { left: 0, top: 0, right: 0, bottom: 0 };
  const w = page.size.width * Math.max(0.05, 1 - crop.left - crop.right);
  const h = page.size.height * Math.max(0.05, 1 - crop.top - crop.bottom);
  return page.rotation === 90 || page.rotation === 270 ? { width: h, height: w } : { width: w, height: h };
}

export function addRotation(a: Rotation, b: number): Rotation {
  const r = (((a + b) % 360) + 360) % 360;
  if (r === 0 || r === 90 || r === 180 || r === 270) return r;
  throw new Error(`Invalid rotation ${b}`);
}
