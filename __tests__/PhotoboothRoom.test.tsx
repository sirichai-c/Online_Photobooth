import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PhotoboothRoom } from "@/components/PhotoboothRoom";
import { usePhotoboothPeer } from "@/hooks/usePhotoboothPeer";

jest.mock("@/hooks/usePhotoboothPeer");

const sendMessage = jest.fn();
const mockedUsePhotoboothPeer = jest.mocked(usePhotoboothPeer);

function mockConnectedPeer() {
  mockedUsePhotoboothPeer.mockReturnValue({
    status: "connected",
    error: null,
    isHost: true,
    remoteStream: new MediaStream(),
    sendMessage,
  });
}

describe("PhotoboothRoom", () => {
  beforeEach(() => {
    sendMessage.mockClear();
    mockConnectedPeer();
  });

  it("renders room details and video panels", async () => {
    render(<PhotoboothRoom roomCode="BQPCRQ" />);

    expect(screen.getByRole("heading", { name: /room bqpcrq/i })).toBeInTheDocument();
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByText("Partner")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /start capture/i })).toBeEnabled();
  });

  it("requests camera access on mount", async () => {
    render(<PhotoboothRoom roomCode="BQPCRQ" />);

    await waitFor(() => expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(expect.objectContaining({
      audio: true,
      video: expect.objectContaining({ facingMode: "user" }),
    })));
  });

  it("sends a synchronized capture event when Start Capture is clicked", async () => {
    const user = userEvent.setup();
    render(<PhotoboothRoom roomCode="BQPCRQ" />);

    await user.click(await screen.findByRole("button", { name: /start capture/i }));

    expect(sendMessage).toHaveBeenCalledWith({
      type: "capture:start",
      at: expect.any(Number),
    });
  });

  it("shows an error when camera permissions are denied", async () => {
    navigator.mediaDevices.getUserMedia = jest.fn().mockRejectedValue(new Error("Permission denied"));

    render(<PhotoboothRoom roomCode="BQPCRQ" />);

    expect(await screen.findByText("Permission denied")).toBeInTheDocument();
  });

  it("disables capture until the PeerJS connection is established", async () => {
    mockedUsePhotoboothPeer.mockReturnValue({
      status: "waiting",
      error: null,
      isHost: true,
      remoteStream: null,
      sendMessage,
    });

    render(<PhotoboothRoom roomCode="BQPCRQ" />);

    expect(await screen.findByRole("button", { name: /start capture/i })).toBeDisabled();
    expect(screen.getByText(/waiting for partner/i)).toBeInTheDocument();
  });
});
