# Lacerta E2EE Spatial Canvas — Handoff Document

This document outlines the architecture, interactive features, implementation patterns, and recommendations for future enhancements of the zero-knowledge end-to-end encrypted (E2EE) spatial collaboration canvas.

---

## 1. System Architecture & Flow

The canvas is designed around a zero-knowledge security model. Document files are stored encrypted on the server, and real-time collaboration updates are broadcasted through WebSockets utilizing AES-GCM client-side encryption.

```mermaid
graph TD
    Client1[Editor Client A] -- Decrypted State in RAM -- UI[React Canvas View]
    Client1 -- Encrypts Update -- WS[Socket.io Server]
    WS -- Relays Encrypted Payload -- Client2[Editor Client B]
    Client2 -- Decrypts with Room Key -- RAM2[Decrypted State Client B]
    Client1 -- Save Trigger -- PUT[NestJS REST API]
```

### Core Components
* **[CanvasEditor.tsx](file:///C:/Users/akari/OneDrive/Documents/GitHub/Runa/apps/frontend/src/components/rrComponents/lacerta/CanvasEditor.tsx)**: Main coordinator. Manages canvas zooming, panning, drag-and-drop operations, card selections, mouse events, context menus, and Socket.io broadcasts.
* **[TiptapNode.tsx](file:///C:/Users/akari/OneDrive/Documents/GitHub/Runa/apps/frontend/src/components/rrComponents/lacerta/TiptapNode.tsx)**: Inline rich text document editor wrapper using Tiptap. Configured with modular floating bubble/block-insertion menus.

---

## 2. Interactive Features & UX Behaviors

### 2.1 Spatial Controls & Resizing Hotkeys
* **Canvas Pan & Zoom**: Trackpad pinch-to-zoom and mouse scroll actions adjust scale. Right-click or spacebar drag pans the canvas viewport.
* **Unfocus (Escape & Background Click)**: Pressing `Escape` or left-clicking the empty canvas background deselects the active card, blurs the active text field, and resets mouse states.
* **Mouse Wheel Resize**: Selecting a card and holding `Shift + Mouse Wheel Scroll` resizes the card's width/height.
* **Arrow Keys Resize**: Selecting a card and holding `Shift + Arrow keys` resizes it in that direction.

### 2.2 Aesthetic Theming & Hover Borders
* **Headerless Minimalist Cards**: Standard cards (`document` and `sticky`) are borderless at the top—there are no static title headers. Card content stretches fully to boundaries.
* **Hover-Only Borders**: Cards render with `border-transparent` by default. Borders fade into view (`border-border`) only on mouse hover or selection, giving a lightweight, paper-like board design.
* **10 Color Preset Accents**: Right-clicking a card exposes a **Change Color** sub-menu with 10 presets: *Slate, Blue, Emerald, Amber, Rose, Purple, Teal, Fuchsia, Orange, and Indigo*.

### 2.3 Intelligent Drag Constraints
* **Inactive Cards**: Dragging an unselected card from any region moves it immediately.
* **Active Cards**: Once focused (for text selecting, drawing, or grid inputs), standard dragging is disabled. To move a selected card, users hold **`Ctrl`** (or **`Cmd`** on Mac) and drag *anywhere* on the card container.

### 2.4 Advanced Drawing Tools (Sketchpad)
* **Direct Vector Drawing**: Clicking inside a Sketchpad card starts sketching instantly (no mode toggles needed).
* **Brush Styling & Custom Colors**:
  * **Range Slider**: Controls brush size smoothly from `1px` to `40px`.
  * **5 Brush Presets**: `✏️ Pencil` (solid), `✒️ Calligraphy` (flat square-cap), `🖍️ Highlighter` (semi-transparent), `➖ Dashed`, and `💬 Dotted`.
  * **Custom Color Picker**: A hidden input inside the custom palette button opens the native color wheel, updating both color and button background.
* **Segment-Splitting Eraser**:
  * Triggered by holding the **Middle Mouse Button** and dragging.
  * Autoscroll is suppressed, and points within the eraser radius are discarded—splitting paths into contiguous vector strokes instead of deleting lines whole.
  * Renders a dashed **circular eraser guide** around the cursor to track erasure radius.

### 2.5 Adjacent Graph Settings Panel
* **Clean Visual Card**: Interactive Chart cards hide all inputs by default, dedicating 100% of their card size to the graph view.
* **Adjacent Settings Panel**: Selecting a Chart card spawns an editor panel directly to the right of the card, allowing users to toggle graph types (Bar, Line, Pie) and add/edit data rows.

---

## 3. Recommended Future Enhancements

### 3.1 Vector Path Simplification
* **Opportunity**: Drawing long brush strokes accumulates hundreds of mouse coordinates, which bloots WebSocket packets and JSON database saves.
* **Improvement**: Implement the **Ramer-Douglas-Peucker algorithm** on `onMouseUp` to simplify strokes. This reduces point counts by 70–80% without losing visual detail.

### 3.2 Dynamic Adjacent Panel Positioning
* **Opportunity**: Currently, the Chart settings panel floats at `left: node.x + node.width + 12`. If the chart card is near the right edge of the screen, the settings panel may overflow the viewport.
* **Improvement**: Check viewport bounds on selection. If the panel would exceed screen limits, float it to the left of the card (`left: node.x - panelWidth - 12`) or below it.

### 3.3 Collaborative Element Locking
* **Opportunity**: If two guest users attempt to edit the same card or draw on the same sketchpad at once, their modifications can overlap.
* **Improvement**: Add a lock socket message. When Client A starts typing/drawing in a card, broadcast a temporary "lock" so Client B sees a read-only indicator until Client A deselects it.

### 3.4 Custom Connectors (Edges)
* **Opportunity**: Connection lines use a default primary color.
* **Improvement**: Allow users to right-click an edge to label it, color-code it (matching card presets), or change line styles (solid, curved, or dashed).
