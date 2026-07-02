class MockEmitter {
  constructor() {
    this.handlers = new Map();
  }

  on(event, handler) {
    const handlers = this.handlers.get(event) ?? [];
    handlers.push(handler);
    this.handlers.set(event, handlers);
    return this;
  }

  emit(event, ...args) {
    const handlers = this.handlers.get(event) ?? [];
    handlers.forEach((handler) => handler(...args));
  }
}

class MockDataConnection extends MockEmitter {
  constructor(peer = "remote-peer") {
    super();
    this.peer = peer;
    this.open = false;
    this.send = jest.fn();
  }

  openConnection() {
    this.open = true;
    this.emit("open");
  }

  close() {
    this.open = false;
    this.emit("close");
  }
}

class MockMediaConnection extends MockEmitter {
  constructor(peer = "remote-peer") {
    super();
    this.peer = peer;
    this.answer = jest.fn();
  }

  close() {
    this.emit("close");
  }
}

const peerState = {
  peers: [],
  nextError: null,
  reset() {
    this.peers = [];
    this.nextError = null;
  },
  lastPeer() {
    return this.peers[this.peers.length - 1];
  },
  firstPeer() {
    return this.peers[0];
  },
  failNextPeerWith(error) {
    this.nextError = error;
  },
  createDataConnection(peer) {
    return new MockDataConnection(peer);
  },
  createMediaConnection(peer) {
    return new MockMediaConnection(peer);
  },
};

class MockPeer extends MockEmitter {
  constructor(id) {
    super();
    this.id = id ?? `generated-${peerState.peers.length + 1}`;
    this.destroyed = false;
    this.disconnected = false;
    this.connect = jest.fn((peer) => {
      const connection = new MockDataConnection(peer);
      setTimeout(() => connection.openConnection(), 0);
      return connection;
    });
    this.call = jest.fn((peer) => {
      const call = new MockMediaConnection(peer);
      setTimeout(() => call.emit("stream", new MediaStream()), 0);
      return call;
    });
    peerState.peers.push(this);

    setTimeout(() => {
      if (peerState.nextError) {
        const error = peerState.nextError;
        peerState.nextError = null;
        this.emit("error", error);
        return;
      }

      this.emit("open", this.id);
    }, 0);
  }

  destroy() {
    this.destroyed = true;
  }

  disconnect() {
    this.disconnected = true;
    this.emit("disconnected");
  }
}

module.exports = MockPeer;
module.exports.default = MockPeer;
module.exports.__peerMock = peerState;
