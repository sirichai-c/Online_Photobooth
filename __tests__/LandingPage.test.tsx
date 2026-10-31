import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LandingPage } from "@/components/LandingPage";
import { LanguageProvider } from "@/components/LanguageProvider";

const push = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

function renderLandingPage() {
  return render(
    <LanguageProvider>
      <LandingPage />
    </LanguageProvider>,
  );
}

describe("LandingPage", () => {
  beforeEach(() => {
    push.mockClear();
    window.localStorage.clear();
  });

  it("renders the primary landing actions in Thai by default", () => {
    renderLandingPage();

    expect(screen.getByRole("button", { name: "สร้างห้อง" })).toBeInTheDocument();
    expect(screen.getByLabelText("เข้าร่วมห้อง")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "เข้าร่วม" })).toBeInTheDocument();
  });

  it("switches all primary landing actions to English", async () => {
    const user = userEvent.setup();
    renderLandingPage();

    await user.click(screen.getByRole("button", { name: "English" }));

    expect(screen.getByRole("button", { name: /create a room/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/join room/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^join$/i })).toBeInTheDocument();
  });

  it("lets users type a room code and join", async () => {
    const user = userEvent.setup();
    renderLandingPage();

    await user.type(screen.getByLabelText("เข้าร่วมห้อง"), "bqpcrq");
    await user.click(screen.getByRole("button", { name: "เข้าร่วม" }));

    expect(push).toHaveBeenCalledWith("/room/BQPCRQ");
  });

  it("does not navigate when the room code is empty or invalid", async () => {
    const user = userEvent.setup();
    renderLandingPage();

    await user.click(screen.getByRole("button", { name: "เข้าร่วม" }));
    await user.type(screen.getByLabelText("เข้าร่วมห้อง"), "A1");
    await user.click(screen.getByRole("button", { name: "เข้าร่วม" }));

    expect(push).not.toHaveBeenCalled();
  });

  it("creates a room with a generated 4-6 character code", async () => {
    const user = userEvent.setup();
    renderLandingPage();

    await user.click(screen.getByRole("button", { name: "สร้างห้อง" }));

    expect(push).toHaveBeenCalledWith(expect.stringMatching(/^\/room\/[A-Z2-9]{4,6}$/));
  });
});
