# Signity — Beautiful Digital Signatures, Privately

A premium, minimalist, and private-by-design digital signature creator. Draw your signature with a stylus, trackpad, or mouse, or type your name using elegant cursive fonts. Signity smooths wobbly lines in real time, crops empty margins automatically, and lets you copy or download transparent high-resolution PNGs ready for professional document signing.

Built with absolute data privacy in mind, all computations and image rendering occur locally in the browser sandbox. Your signature data never leaves your device.

---

## 🎨 Key Features

### 1. Dual Creator Modes
- **Draw Signature**: Expressive hand-drawn signatures. Includes a **High Precision** curve smoothing mode that leverages quadratic curve interpolation to turn shaky movements into elegant, professional lines.
- **Type Signature**: Instantly generate cursive signatures. Choose from 6 handpicked calligraphy and cursive styles:
  - **Great Vibes** (Clean, flowing modern cursive)
  - **Alex Brush** (Standard professional script)
  - **Ornate Script** (Elegant ornate loop script)
  - **Modern Cursive** (Neat monoline cursive)
  - **Calligraphy** (Formal slanted handwriting)
  - **Casual Hand** (Casual, natural script)

### 2. Styling & Customization
- **6 Premium Ink Colors**: Toggle between Onyx Black, Royal Indigo, Crimson Red, Forest Green, Midnight Navy, and Plum Purple, designed for dark and light screen readability.
- **Advanced Brush Controls**: A smooth range slider adjusting pen weight from `2px` to `16px` with quick presets (Thin, Medium, Thick) and a dynamic live brush preview dot showing the actual selected color and thickness.
- **Text Refinements**: Adjust font size (`32px` to `96px`), toggle italic slant, and select normal or bold weight settings.

### 3. Smart Exports & Transparency
- **Auto-Cropping**: Automatically detects the exact boundaries of your signature (scanning pixels for alpha values on typed text) to crop away empty space.
- **Transparent PNGs**: Exports with a transparent alpha channel, blending perfectly onto white, gray, or colored digital documents.
- **Instant Actions**: Copy directly to your clipboard or download the high-resolution PNG file in one click.

### 4. Theme & Scrollbars
- **Theme toggle**: Clean light and dark theme mode controls.
- **Custom Scrollbars**: Minimalist, translucent scrollbar tracks and handles styled for a premium feel on WebKit browsers and Firefox.

---

## 🔒 Private-by-Design
Signity is fully serverless and runs 100% client-side in the browser:
- **No analytics tracking** or external tracking cookies.
- **No data collection** or remote server transfers.
- **Zero database storage**. Your inputs, coordinates, and typed keys exist only in your browser memory.

---

## 🛠️ Technology Stack
- **Framework**: React 19 (Vite build system)
- **Styling**: Tailwind CSS
- **Animations**: Motion (formerly Framer Motion)
- **Icons**: Lucide React

---

## ⚖️ License
Licensed under the Apache License, Version 2.0.

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed.

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```

### Development Server
Run the local dev server (default port 3000):
   ```bash
   npm run dev
   ```

### Production Build
Build the optimized production bundle inside the `/dist` directory:
   ```bash
   npm run build
   ```
