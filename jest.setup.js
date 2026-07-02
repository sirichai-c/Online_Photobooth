require("@testing-library/jest-dom");

const createTrack = (kind) => ({
  kind,
  enabled: true,
  stop: jest.fn(),
});

const createMockMediaStream = () => ({
  id: "mock-media-stream",
  active: true,
  getTracks: jest.fn(() => [createTrack("video"), createTrack("audio")]),
  getVideoTracks: jest.fn(() => [createTrack("video")]),
  getAudioTracks: jest.fn(() => [createTrack("audio")]),
  addTrack: jest.fn(),
  removeTrack: jest.fn(),
});

Object.defineProperty(global, "MediaStream", {
  writable: true,
  value: jest.fn().mockImplementation(createMockMediaStream),
});

Object.defineProperty(navigator, "mediaDevices", {
  writable: true,
  value: {
    getUserMedia: jest.fn().mockResolvedValue(createMockMediaStream()),
  },
});

Object.defineProperty(HTMLMediaElement.prototype, "srcObject", {
  writable: true,
  value: null,
});

HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue(undefined);
HTMLMediaElement.prototype.pause = jest.fn();

const canvasContextMock = {
  beginPath: jest.fn(),
  clearRect: jest.fn(),
  closePath: jest.fn(),
  drawImage: jest.fn(),
  fillRect: jest.fn(),
  fillText: jest.fn(),
  lineTo: jest.fn(),
  moveTo: jest.fn(),
  restore: jest.fn(),
  save: jest.fn(),
  stroke: jest.fn(),
  measureText: jest.fn(() => ({ width: 120 })),
  set fillStyle(value) {
    this._fillStyle = value;
  },
  get fillStyle() {
    return this._fillStyle;
  },
  set font(value) {
    this._font = value;
  },
  get font() {
    return this._font;
  },
  set lineWidth(value) {
    this._lineWidth = value;
  },
  get lineWidth() {
    return this._lineWidth;
  },
  set strokeStyle(value) {
    this._strokeStyle = value;
  },
  get strokeStyle() {
    return this._strokeStyle;
  },
  set textAlign(value) {
    this._textAlign = value;
  },
  get textAlign() {
    return this._textAlign;
  },
};

HTMLCanvasElement.prototype.getContext = jest.fn(() => canvasContextMock);
HTMLCanvasElement.prototype.toDataURL = jest.fn(() => "data:image/png;base64,mock-strip");

global.Image = class {
  set src(value) {
    this._src = value;
    setTimeout(() => this.onload?.(), 0);
  }

  get src() {
    return this._src;
  }
};

afterEach(() => {
  jest.clearAllMocks();
  navigator.mediaDevices.getUserMedia.mockResolvedValue(createMockMediaStream());
});
