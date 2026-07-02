import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LandingPage } from "@/components/LandingPage";

const push = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("LandingPage", () => {
  beforeEach(() => {
    push.mockClear();
  });

  it("renders the primary landing actions", () => {
    render(<LandingPage />);

    expect(screen.getByRole("button", { name: /create a room/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/join room/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^join$/i })).toBeInTheDocument();
  });

  it("lets users type a room code and join", async () => {
    const user = userEvent.setup();
    render(<LandingPage />);

    await user.type(screen.getByLabelText(/join room/i), "bqpcrq");
    await user.click(screen.getByRole("button", { name: /^join$/i }));

    expect(push).toHaveBeenCalledWith("/room/BQPCRQ");
  });

  it("does not navigate when the room code is empty or invalid", async () => {
    const user = userEvent.setup();
    render(<LandingPage />);

    await user.click(screen.getByRole("button", { name: /^join$/i }));
    await user.type(screen.getByLabelText(/join room/i), "A1");
    await user.click(screen.getByRole("button", { name: /^join$/i }));

    expect(push).not.toHaveBeenCalled();
  });

  it("creates a room with a generated 4-6 character code", async () => {
    const user = userEvent.setup();
    render(<LandingPage />);

    await user.click(screen.getByRole("button", { name: /create a room/i }));

    expect(push).toHaveBeenCalledWith(expect.stringMatching(/^\/room\/[A-Z2-9]{4,6}$/));
  });
});
