import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PhotoboothRoom } from "@/components/PhotoboothRoom";
import { LanguageProvider } from "@/components/LanguageProvider";
import { usePhotoboothPeer } from "@/hooks/usePhotoboothPeer";
import { LANGUAGE_STORAGE_KEY } from "@/lib/i18n";

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

function renderRoom() {
  return render(
    <LanguageProvider>
      <PhotoboothRoom roomCode="BQPCRQ" />
    </LanguageProvider>,
  );
}

beforeEach(() => {
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, "en");
});

describe("PhotoboothRoom", () => {
  beforeEach(() => {
    sendMessage.mockClear();
    mockConnectedPeer();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders room details and video panels", async () => {
    renderRoom();

    expect(screen.getByRole("heading", { name: /room bqpcrq/i })).toBeInTheDocument();
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByText("Partner")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /start capture/i })).toBeEnabled();
  });

  it("renders Thai by default and can switch the room to English", async () => {
    window.localStorage.clear();
    const user = userEvent.setup();
    renderRoom();

    expect(screen.getByRole("heading", { name: "ห้อง BQPCRQ" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "เริ่มถ่ายภาพ" })).toBeEnabled();
    expect(screen.getByText("เชื่อมต่อแล้ว")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "English" }));

    expect(screen.getByRole("heading", { name: /room bqpcrq/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start capture/i })).toBeEnabled();
  });

  it("requests camera access on mount", async () => {
    renderRoom();

    await waitFor(() => expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(expect.objectContaining({
      audio: true,
      video: expect.objectContaining({ facingMode: "user" }),
    })));
  });

  it("sends a synchronized capture event when Start Capture is clicked", async () => {
    const user = userEvent.setup();
    renderRoom();

    await user.click(await screen.findByRole("button", { name: /start capture/i }));

    expect(sendMessage).toHaveBeenCalledWith({
      type: "capture:start",
      at: expect.any(Number),
      reset: true,
    });
  });

  it("shows host controls to retake or continue after a shot is captured", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderRoom();

    await user.click(await screen.findByRole("button", { name: /start capture/i }));
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    expect(await screen.findByRole("button", { name: "Retake" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
    expect(screen.getByAltText(/preview shot 1/i)).toBeInTheDocument();
  });

  it("moves to host frame selection after the fourth accepted shot", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderRoom();

    await user.click(await screen.findByRole("button", { name: /start capture/i }));

    for (let index = 0; index < 3; index += 1) {
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });
      await user.click(await screen.findByRole("button", { name: "Continue" }));
    }

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    await user.click(await screen.findByRole("button", { name: "Finish" }));

    expect(await screen.findByRole("heading", { name: /choose frame style/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /classic rose/i }));
    expect(sendMessage).toHaveBeenCalledWith({ type: "frame:selected", styleId: "classic" });
  });

  it("shows an error when camera permissions are denied", async () => {
    navigator.mediaDevices.getUserMedia = jest.fn().mockRejectedValue(new Error("Permission denied"));

    renderRoom();

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

    renderRoom();

    expect(await screen.findByRole("button", { name: /start capture/i })).toBeDisabled();
    expect(screen.getByText(/waiting for partner/i)).toBeInTheDocument();
  });
});
  it("keeps the guest capture control disabled", async () => {
    mockedUsePhotoboothPeer.mockReturnValue({
      status: "connected",
      error: null,
      isHost: false,
      remoteStream: new MediaStream(),
      sendMessage,
    });

    renderRoom();

    expect(await screen.findByRole("button", { name: /start capture/i })).toBeDisabled();
    expect(screen.getByText(/your host will start/i)).toBeInTheDocument();
  });

describe("shared photo output", () => {
  afterEach(() => jest.useRealTimers());

  it("sends the host's captured shot to the guest", async () => {
    mockConnectedPeer();
    sendMessage.mockClear();
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderRoom();

    await user.click(await screen.findByRole("button", { name: /start capture/i }));
    const start = sendMessage.mock.calls.find(([message]) => message.type === "capture:start")?.[0];
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    expect(sendMessage).toHaveBeenCalledWith({
      type: "capture:shot",
      at: start.at,
      image: "data:image/png;base64,mock-strip",
    });
  });

  it("uses the host's shot and final PNG on the guest", async () => {
    let onMessage: Parameters<typeof usePhotoboothPeer>[0]["onMessage"] | undefined;
    mockedUsePhotoboothPeer.mockImplementation((options) => {
      onMessage = options.onMessage;
      return {
        status: "connected", error: null, isHost: false,
        remoteStream: new MediaStream(), sendMessage,
      };
    });
    window.localStorage.clear();
    renderRoom();
    await act(async () => {
      await Promise.resolve();
    });
    const at = Date.now() + 10000;

    act(() => onMessage?.({ type: "capture:start", at, reset: true }));
    act(() => onMessage?.({ type: "capture:shot", at, image: "data:image/png;base64,host-shot" }));
    expect(screen.getByAltText("ตัวอย่างภาพที่ 1")).toHaveAttribute("src", "data:image/png;base64,host-shot");

    act(() => onMessage?.({ type: "capture:accept", next: "frame" }));
    act(() => onMessage?.({ type: "frame:result", styleId: "film", image: "data:image/png;base64,host-result" }));
    expect(screen.getByRole("link", { name: "ดาวน์โหลดภาพ" })).toHaveAttribute("href", "data:image/png;base64,host-result");
  });
});
