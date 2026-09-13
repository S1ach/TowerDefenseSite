/** Pointer travel (px) between down and up beyond which a click is treated as a camera drag. */
export const DRAG_THRESHOLD_PX = 5;
export const isDrag = (event: { delta: number }) => event.delta >= DRAG_THRESHOLD_PX;
/** Tower positions snap to half-cell steps. */
export const GRID_STEP = 0.5;
export const snapToGrid = (value: number) => Math.round(value / GRID_STEP) * GRID_STEP;
