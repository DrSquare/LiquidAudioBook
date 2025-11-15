import React, { useState, useCallback } from 'react';

/**
 * A utility function to simulate network/processing delay.
 * @param {number} ms - The number of milliseconds to sleep.
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Creates a mock audio WAV file as a Blob.
 * This simulates the output of the TTS engine.
 * @returns {Promise<Blob>} A Promise that resolves with a WAV Blob.
 */
const createMockAudio = () => {
  return new Promise(resolve => {
    // We'll generate 1 second of silence to keep the file minimal
    const duration = 1; // 1 second
    const sampleRate = 44100;
    const numFrames = duration * sampleRate;
    const numChannels = 1;

    // Create an empty audio buffer
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const buffer = audioContext.createBuffer(numChannels, numFrames, sampleRate);
    
    // The buffer is already filled with silence, so we just need to encode it
    const wavBlob = audioBufferToWav(buffer);
    resolve(wavBlob);
  });
};

/**
 * Converts an AudioBuffer to a WAV Blob.
 * This is a helper function to make the mock audio file downloadable.
 * @param {AudioBuffer} buffer - The AudioBuffer to convert.
 * @returns {Blob} A Blob containing the WAV file data.
 */
function audioBufferToWav(buffer) {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44; // 2 bytes per sample
  const dataView = new DataView(new ArrayBuffer(length));
  let offset = 0;

  const writeString = (str) => {
    for (let i = 0; i < str.length; i++) {
      dataView.setUint8(offset++, str.charCodeAt(i));
    }
  };

  // WAV Header
  writeString('RIFF');
  dataView.setUint32(offset, length - 8, true); offset += 4;
  writeString('WAVE');
  writeString('fmt ');
  dataView.setUint32(offset, 16, true); offset += 4; // Subchunk1 size
  dataView.setUint16(offset, 1, true); offset += 2; // Audio format (1 = PCM)
  dataView.setUint16(offset, numOfChan, true); offset += 2;
  dataView.setUint32(offset, buffer.sampleRate, true); offset += 4;
  dataView.setUint32(offset, buffer.sampleRate * numOfChan * 2, true); offset += 4; // Byte rate
  dataView.setUint16(offset, numOfChan * 2, true); offset += 2; // Block align
  dataView.setUint16(offset, 16, true); offset += 2; // Bits per sample
  writeString('data');
  dataView.setUint32(offset, length - offset - 4, true); offset += 4; // Subchunk2 size

  // PCM Data
  const pcm = buffer.getChannelData(0); // Assuming mono
  for (let i = 0; i < buffer.length; i++) {
    let s = Math.max(-1, Math.min(1, pcm[i]));
    s = s < 0 ? s * 0x8000 : s * 0x7FFF; // Convert to 16-bit PCM
    dataView.setInt16(offset, s, true);
    offset += 2;
  }

  return new Blob([dataView], { type: 'audio/wav' });
}


/**
 * Main Application Component
 */
const App = () => {
  // 'idle' | 'processing' | 'complete'
  const [appState, setAppState] = useState('idle');
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);

  /**
   * Resets the application to its initial state.
   */
  const resetApp = () => {
    setAppState('idle');
    setFiles([]);
    setProgress('');
    setError(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl); // Clean up the blob URL
    }
    setAudioUrl(null);
  };

  /**
   * Handles the file selection from the input.
   * @param {React.ChangeEvent<HTMLInputElement>} e - The change event.
   */
  const handleFileChange = (e) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
  };

  /**
   * Handles files from a drag-and-drop operation.
   * @param {React.DragEvent<HTMLDivElement>} e - The drag event.
   */
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('border-blue-500', 'bg-gray-700');
    if (e.dataTransfer.files) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  /**
   * Handles drag-over event.
   */
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('border-blue-500', 'bg-gray-700');
  };

  /**
   * Handles drag-leave event.
   */
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('border-blue-500', 'bg-gray-700');
  };

  /**
   * Validates and sets the files in state.
   * @param {File[]} fileList - An array of files.
   */
  const processFiles = (fileList) => {
    setError(null);
    const allowedTypes = ['image/jpeg', 'image/png'];
    const validFiles = fileList.filter(file => {
      if (!allowedTypes.includes(file.type)) {
        setError(`Invalid file type: ${file.name}. Only JPG and PNG are allowed.`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit per FR-001
        setError(`File is too large: ${file.name}. Max 5MB per image.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0 && fileList.length > 0) {
      // Don't proceed if there were files, but none were valid
      return;
    }

    const totalFiles = [...files, ...validFiles];
    
    if (totalFiles.length > 50) { // Max 50 images per NFR
      setError('You can upload a maximum of 50 images per session.');
      setFiles(totalFiles.slice(0, 50));
    } else {
      setFiles(totalFiles);
    }
  };

  /**
   * Removes a specific file from the list.
   * @param {string} fileName - The name of the file to remove.
   */
  const removeFile = (fileName) => {
    setFiles(files.filter(file => file.name !== fileName));
  };

  /**
   * Starts the mock conversion process.
   */
  const handleConversion = async () => {
    if (files.length === 0) {
      setError('Please upload at least one image.');
      return;
    }
    setAppState('processing');
    setError(null);

    try {
      // 1. Simulate Vision Model (FR-003)
      for (let i = 0; i < files.length; i++) {
        setProgress(`Step 1/3: Extracting text from page ${i + 1}/${files.length}...`);
        // Simulate extraction time per image (NFR: < 2s)
        await sleep(250 + Math.random() * 500); // 250-750ms
      }

      // 2. Simulate Text Refinement (FR-004)
      setProgress('Step 2/3: Refining extracted text...');
      // Simulate refinement time (NFR: < 3s)
      await sleep(1000 + Math.random() * 1000); // 1-2s

      // 3. Simulate TTS Generation (FR-007)
      setProgress('Step 3/3: Generating audio file...');
      // Simulate TTS time (NFR: < 5s per 1000 words)
      await sleep(1500 + Math.random() * 1500); // 1.5-3s

      // 4. Create Mock Audio
      const audioBlob = await createMockAudio();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      setAppState('complete');
      
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred during conversion.');
      setAppState('idle');
    }
  };

  /**
   * Renders the UI for the 'idle' state (file upload).
   */
  const renderIdleState = () => (
    <>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className="border-4 border-dashed border-gray-600 rounded-lg p-12 text-center cursor-pointer transition-colors duration-200"
      >
        <input
          id="file-upload"
          type="file"
          multiple
          accept="image/png, image/jpeg"
          className="hidden"
          onChange={handleFileChange}
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8a4 4 0 01-4 4H20a4 4 0 01-4-4v-4m16-14l-4-4m0 0l-4 4m4-4v12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="mt-2 text-lg">
            <span className="font-medium text-blue-400">Upload book pages</span> or drag and drop
          </p>
          <p className="text-sm text-gray-500">PNG or JPG, up to 5MB each. Max 50 images.</p>
        </label>
      </div>

      {files.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold">Uploaded Pages ({files.length}/50):</h3>
          <ul className="mt-2 max-h-40 overflow-y-auto divide-y divide-gray-700 rounded-lg border border-gray-700">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`} className="flex items-center justify-between p-2.5 text-sm">
                <span className="truncate">
                  <span className="font-medium">{index + 1}. </span>
                  {file.name}
                </span>
                <button
                  onClick={() => removeFile(file.name)}
                  className="ml-4 text-red-500 hover:text-red-400 font-medium"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={handleConversion}
        disabled={files.length === 0}
        className="mt-8 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg"
      >
        {`Convert ${files.length} ${files.length === 1 ? 'Page' : 'Pages'} to Audio`}
      </button>
    </>
  );

  /**
   * Renders the UI for the 'processing' state.
   */
  const renderProcessingState = () => (
    <div className="flex flex-col items-center justify-center h-64">
      <svg className="animate-spin h-12 w-12 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p className="mt-6 text-xl font-medium text-gray-300">{progress}</p>
      <p className="mt-2 text-gray-400">Please wait, this may take a moment...</p>
    </div>
  );

  /**
   * Renders the UI for the 'complete' state (audio player).
   */
  const renderCompleteState = () => (
    <div className="text-center">
      <h2 className="text-2xl font-semibold text-green-400 mb-4">Conversion Complete!</h2>
      <p className="text-gray-300 mb-6">Your audiobook is ready to play or download.</p>
      
      {/* Audio Player (FR-009, FR-010, FR-011) */}
      <audio controls src={audioUrl} className="w-full rounded-lg">
        Your browser does not support the audio element.
      </audio>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Audio Download (FR-012) */}
        <a
          href={audioUrl}
          download="liquid-audiobook.wav" // Changed to .wav to match mock
          className="block w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg text-center"
        >
          Download Audio
        </a>
        <button
          onClick={resetApp}
          className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg"
        >
          Start New Conversion
        </button>
      </div>
    </div>
  );

  /**
   * Selects which UI to render based on the current appState.
   */
  const renderContent = () => {
    switch (appState) {
      case 'processing':
        return renderProcessingState();
      case 'complete':
        return renderCompleteState();
      case 'idle':
      default:
        return renderIdleState();
    }
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-2xl bg-gray-800 rounded-2xl shadow-xl p-8 transition-all duration-300">
        <header className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white">LiquidAudio Reader</h1>
          <p className="text-gray-400">Convert your book pages to an audiobook</p>
        </header>
        
        <main>
          {error && (
            <div className="mb-6 bg-red-900 border border-red-700 text-red-200 p-4 rounded-lg text-center">
              <span className="font-medium">Error:</span> {error}
            </div>
          )}
          
          {renderContent()}
        </main>

        <footer className="text-center mt-8 text-sm text-gray-500">
          Powered by <span className="font-semibold text-blue-400">Liquid.ai</span> - Hackathon MVP
        </footer>
      </div>
    </div>
  );
};

export default App;