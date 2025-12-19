// Mock for hls.js to prevent bundling issues
// hls.js is a dependency of @react-three/drei VideoTexture but causes circular dependencies

class HlsMock {
  static isSupported() {
    return false;
  }

  static Events = {
    MEDIA_ATTACHED: 'hlsMediaAttached',
    MANIFEST_PARSED: 'hlsManifestParsed',
    ERROR: 'hlsError',
    LEVEL_SWITCHED: 'hlsLevelSwitched',
    BUFFER_APPENDED: 'hlsBufferAppended',
    BUFFER_EOS: 'hlsBufferEos',
  };

  static ErrorTypes = {
    NETWORK_ERROR: 'networkError',
    MEDIA_ERROR: 'mediaError',
    MUX_ERROR: 'muxError',
    OTHER_ERROR: 'otherError',
  };

  static ErrorDetails = {
    MANIFEST_LOAD_ERROR: 'manifestLoadError',
    MANIFEST_PARSING_ERROR: 'manifestParsingError',
    LEVEL_LOAD_ERROR: 'levelLoadError',
    AUDIO_TRACK_LOAD_ERROR: 'audioTrackLoadError',
    FRAG_LOAD_ERROR: 'fragLoadError',
    BUFFER_APPEND_ERROR: 'bufferAppendError',
    BUFFER_APPENDING_ERROR: 'bufferAppendingError',
    BUFFER_STALLED_ERROR: 'bufferStalledError',
    BUFFER_FULL_ERROR: 'bufferFullError',
    LEVEL_SWITCH_ERROR: 'levelSwitchError',
    AUDIO_TRACK_SWITCH_ERROR: 'audioTrackSwitchError',
  };

  loadSource(url: string) {
    console.warn('hls.js mocked - loadSource called with:', url);
  }

  attachMedia(_element: HTMLMediaElement) {
    console.warn('hls.js mocked - attachMedia called');
  }

  on(_event: string, _callback: (...args: any[]) => void) {
    console.warn('hls.js mocked - on called for event:', _event);
  }

  off(_event: string, _callback?: (...args: any[]) => void) {
    console.warn('hls.js mocked - off called for event:', _event);
  }

  destroy() {
    console.warn('hls.js mocked - destroy called');
  }

  startLoad(_startPosition?: number) {
    console.warn('hls.js mocked - startLoad called');
  }

  stopLoad() {
    console.warn('hls.js mocked - stopLoad called');
  }

  recoverMediaError() {
    console.warn('hls.js mocked - recoverMediaError called');
  }
}

// Export for ESM
export default HlsMock;
export { HlsMock as ErrorDetails, HlsMock as ErrorTypes, HlsMock as Events, HlsMock as Hls };

// For CommonJS environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HlsMock;
  module.exports.default = HlsMock;
  module.exports.Hls = HlsMock;
  module.exports.Events = HlsMock;
  module.exports.ErrorTypes = HlsMock;
  module.exports.ErrorDetails = HlsMock;
}

// For global usage
if (typeof window !== 'undefined') {
  (window as any).Hls = HlsMock;
  (window as any).Hls.Events = HlsMock.Events;
  (window as any).Hls.ErrorTypes = HlsMock.ErrorTypes;
  (window as any).Hls.ErrorDetails = HlsMock.ErrorDetails;
}
