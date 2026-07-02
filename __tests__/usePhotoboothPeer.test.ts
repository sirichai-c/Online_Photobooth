import { act, renderHook, waitFor } from "@testing-library/react";
import { usePhotoboothPeer } from "@/hooks/usePhotoboothPeer";
import { createRoomCode } from "@/lib/roomCode";

jest.mock("peerjs");

const { __peerMock } = jest.requireMock("peerjs");

function createLocalStream() {
  return new MediaStream();
}

describe("createRoomCode", () => {
  it("generates a 4-6 character uppercase room code", () => {
    for (let index = 0; index < 20; index += 1) {
      expect(createRoomCode()).toMatch(/^[A-Z2-9]{4,6}$/);
    }
  });
});

describe("usePhotoboothPeer", () => {
  beforeEach(() => {
    __peerMock.reset();
  });

  it("opens the room as host using the room code as the peer id", async () => {
    const onMessage = jest.fn();
    const localStream = createLocalStream();
    const { result } = renderHook(() =>
      usePhotoboothPeer({ roomCode: "BQPCRQ", localStream, onMessage }),
    );

    await waitFor(() => expect(result.current.status).toBe("waiting"));

    expect(result.current.isHost).toBe(true);
    expect(__peerMock.lastPeer().id).toBe("BQPCRQ");
  });

  it("moves to connected when a data connection opens and receives data messages", async () => {
    const onMessage = jest.fn();
    const localStream = createLocalStream();
    const { result } = renderHook(() =>
      usePhotoboothPeer({ roomCode: "BQPCRQ", localStream, onMessage }),
    );

    await waitFor(() => expect(result.current.status).toBe("waiting"));

    const connection = __peerMock.createDataConnection("guest-peer");
    act(() => {
      __peerMock.lastPeer().emit("connection", connection);
      connection.openConnection();
      connection.emit("data", { type: "capture:start", at: 1234 });
    });

    await waitFor(() => expect(result.current.status).toBe("connected"));
    expect(onMessage).toHaveBeenCalledWith({ type: "capture:start", at: 1234 });
  });

  it("falls back to guest mode when the room code peer id is already taken", async () => {
    __peerMock.failNextPeerWith({ type: "unavailable-id", message: "ID is taken" });
    const localStream = createLocalStream();

    const { result } = renderHook(() =>
      usePhotoboothPeer({ roomCode: "BQPCRQ", localStream, onMessage: jest.fn() }),
    );

    await waitFor(() => expect(result.current.status).toBe("connected"));

    expect(result.current.isHost).toBe(false);
    expect(__peerMock.firstPeer().destroyed).toBe(true);
    expect(__peerMock.lastPeer().connect).toHaveBeenCalledWith("BQPCRQ", { reliable: true });
    expect(__peerMock.lastPeer().call).toHaveBeenCalledWith("BQPCRQ", expect.any(Object));
  });

  it("updates state when the peer disconnects", async () => {
    const localStream = createLocalStream();
    const { result } = renderHook(() =>
      usePhotoboothPeer({ roomCode: "BQPCRQ", localStream, onMessage: jest.fn() }),
    );

    await waitFor(() => expect(result.current.status).toBe("waiting"));

    act(() => {
      __peerMock.lastPeer().emit("disconnected");
    });

    expect(result.current.status).toBe("disconnected");
  });
});
