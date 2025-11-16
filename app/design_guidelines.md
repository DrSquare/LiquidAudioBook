# LiquidAudio Reader - Design Guidelines

## Design Approach

**System Selected:** Material Design with custom liquid-style enhancements
**Justification:** This is a utility-focused desktop application requiring clear information hierarchy, processing feedback, and intuitive controls. Material Design provides robust patterns for file upload, progress indication, and media playback while allowing creative freedom for the liquid background aesthetic.

**Key Principles:**
- Clarity over decoration - every element serves the conversion workflow
- Layered depth with liquid background as foundation, content floating above
- Consistent feedback during multi-stage processing
- Professional polish with fluid motion accents

---

## Typography

**Font Family:** Inter (primary), JetBrains Mono (mono for status/technical)

**Hierarchy:**
- App Title/Branding: 32px, weight 700
- Section Headers: 24px, weight 600
- Body Text: 16px, weight 400
- Captions/Labels: 14px, weight 500
- Status/Technical: 13px, weight 400 (mono)
- Micro-copy: 12px, weight 400

---

## Layout System

**Container Structure:**
- Main window: Fixed 1280x800px (desktop app)
- Content container: max-w-6xl with px-8 horizontal padding
- Vertical spacing rhythm: py-6, py-8, py-12 for major sections

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, 8, 12, 16, 24
- Component internal: p-4, p-6
- Between sections: gap-8, gap-12
- Margins: m-2, m-4, m-8

**Grid System:**
- Image upload preview grid: grid-cols-4 gap-4 (shows 4 thumbnails per row)
- Progress stages: flex with equal spacing
- Audio controls: centered flex layout

---

## Component Library

### 1. Liquid Background Layer
- Full-screen animated gradient mesh background
- Smooth, slow-moving fluid shapes (think lava lamp)
- Semi-transparent organic blob shapes with blur effects
- 3-4 gradient layers moving at different speeds
- CSS/JS animation keyframes for continuous motion
- Positioned as fixed background behind all content

### 2. Main Content Container
- Centered card-style container floating above liquid background
- Subtle backdrop blur (backdrop-filter: blur(20px))
- Semi-transparent background with soft shadow
- Rounded corners: rounded-2xl (16px radius)
- Padding: p-8

### 3. Image Upload Zone
**Initial State:**
- Large dashed border rectangle (h-64)
- Upload icon (cloud with arrow) centered
- Primary text: "Drop book page images here"
- Secondary text: "or click to browse (JPG, PNG up to 5MB, max 50 images)"
- Drag-and-drop active state with subtle scale animation

**Loaded State:**
- Grid of image thumbnails (4 columns)
- Each thumbnail: 160px square with page number overlay
- Remove button (× icon) on hover for each image
- "Add More Images" card at end of grid
- Total count display: "24 / 50 images uploaded"

### 4. Multi-Stage Progress Indicator
**Layout:** Horizontal stepper with 3 stages
- Stage 1: "Extracting Text" (Vision Model)
- Stage 2: "Refining Content" (Text Extraction)
- Stage 3: "Generating Audio" (TTS)

**Visual Elements:**
- Circular stage indicators (48px diameter)
- Connecting lines between stages
- Active stage: pulsing animation
- Completed stage: checkmark icon
- Current progress: animated progress bar below active stage
- Status text: Current item count "Processing image 12 of 24"

### 5. Audio Player Section
**Appears after audio generation complete**

**Components:**
- Large play/pause button (64px circular, center)
- Secondary controls flanking play button:
  - Stop button (left)
  - Download button (right)
- Seek bar: Full-width progress slider
  - Current time / Total duration labels
  - Hover preview tooltip
- Waveform visualization (optional enhancement): Subtle amplitude bars

**Layout:**
- Player controls: flex justify-center items-center gap-4
- Seek bar: Full width with px-8
- Time stamps: text-sm at edges

### 6. Action Buttons
**Primary Button (Start Processing):**
- Large size: px-8 py-4
- Rounded: rounded-full
- Bold text: font-semibold text-base
- Full width or min-w-64

**Secondary Buttons:**
- Medium size: px-6 py-3
- Rounded: rounded-lg
- Icon + text combination

**Icon Buttons (Player Controls):**
- Circular: w-12 h-12 or w-16 h-16 for primary
- Icon-only with hover tooltip
- Subtle background with hover state

### 7. Status Messages
- Toast-style notifications for errors
- Inline validation messages below upload zone
- Success checkmark with message after completion

### 8. File Validation Feedback
- File size indicator on each thumbnail
- Error state for oversized/invalid files
- Warning icon for problematic uploads

---

## Interaction & Animation

**Liquid Background:**
- Continuous slow motion (60-90 second loop)
- No user interaction - purely ambient

**Component Transitions:**
- Upload zone → Image grid: Fade + slide up (300ms)
- Progress stages: Sequential pulse + fade in
- Audio player reveal: Slide up + fade (400ms)

**Micro-interactions:**
- Button hover: Subtle scale (1.02) + shadow increase
- Thumbnail hover: Scale (1.05) + show remove button
- Drag over upload zone: Border style change + scale

**Performance Note:** Minimize animations during processing stages to reduce CPU usage

---

## Images

**No hero images required** - This is a utility application focused on workflow.

**Image Usage:**
- User-uploaded book page images displayed as thumbnails in grid
- Icons: Use Heroicons for all UI icons (upload, play, pause, stop, download, check, close)

---

## Accessibility

- Keyboard navigation for all controls (Tab, Space, Enter)
- ARIA labels for player controls and progress stages
- Focus visible states on all interactive elements
- Screen reader announcements for progress updates
- Sufficient contrast for text over liquid background (use semi-opaque overlays)

---

## Desktop-Specific Considerations

- Window controls: Standard minimize/maximize/close in title bar
- Drag-drop: Full window drop zone when no images uploaded
- File dialogs: Native OS file picker integration
- Tooltips: Appear on hover (desktop pattern)
- Right-click context menu for thumbnails (delete, view full)

---

**Design Completeness:** This creates a polished, professional audiobook conversion application with distinctive liquid-style visual identity while maintaining excellent usability for the 3-step workflow (upload → process → listen).