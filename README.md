# LiquidAudioBook

AudioBook Generation Based on Liquid.AI Models

## Quick Start

### Prerequisites
- Node.js 20+ installed
- npm package manager

### Installation

1. Navigate to the app directory:
```bash
cd app
```

2. Install dependencies:
```bash
npm install
```

### Running the Development Server

1. Start the dev server:
```bash
npm run dev
```

2. Open your browser and navigate to:
```
http://127.0.0.1:5000
```

You should see the LiquidAudioBook application with the image upload interface.

### Using the Application

1. **Upload Images** - Drag and drop JPG/PNG images (max 5MB each, up to 50 images)
2. **Process Images** - Click "Start Processing" to begin conversion
3. **View Progress** - Monitor the three processing stages: Extract → Refine → Generate
4. **Play Audio** - Use the audio player controls (Play, Pause, Stop, Seek)
5. **Download** - Click Download to save the generated audio file

### Other Commands

- **Type checking:** `npm run check`
- **Run tests:** `npm run test:run`
- **Test dashboard:** `npm run test:ui`
- **Build for production:** `npm run build`
- **Start production build:** `npm start`

## Project Structure

```
app/
├── client/              # React frontend
│   └── src/
│       ├── pages/       # Page components
│       ├── components/  # Reusable UI components
│       └── lib/         # Utilities and helpers
├── server/              # Express backend
│   ├── index.ts         # Server entry point
│   └── routes.ts        # API routes
├── test/                # Test configuration
└── package.json         # Dependencies and scripts
```

## Notes

- The dev server serves both the API and the React frontend on the same port
- Frontend hot reloading is enabled during development
- Currently uses mock audio; full Liquid.AI integration pending backend implementation
