// specs/005-drag-drop-ordering plan.md ADR-23 (native HTML5 drag, no library). Distinct
// dataTransfer MIME keys let a card drop zone and a list drop zone coexist over the same
// screen region without a shared "what's being dragged" React state — only `.types` is
// readable during dragover (browsers block `.getData()` until `drop`), so a zone checks
// `event.dataTransfer.types.includes(...)` to decide whether it's a valid target at all.
export const CARD_DRAG_DATA_TYPE = "application/x-flowboard-card";
export const LIST_DRAG_DATA_TYPE = "application/x-flowboard-list";
