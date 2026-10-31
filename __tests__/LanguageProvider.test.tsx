import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageProvider, useLanguage } from "@/components/LanguageProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LANGUAGE_STORAGE_KEY } from "@/lib/i18n";

function LanguageProbe() {
  const { language } = useLanguage();
  return <output aria-label="current language">{language}</output>;
}

function renderLanguageControls() {
  return render(
    <LanguageProvider>
      <LanguageSwitcher />
      <LanguageProbe />
    </LanguageProvider>,
  );
}

describe("LanguageProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = "en";
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("starts in Thai when there is no saved preference", () => {
    renderLanguageControls();

    expect(screen.getByLabelText("current language")).toHaveTextContent("th");
    expect(screen.getByRole("button", { name: "ภาษาไทย" })).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement).toHaveAttribute("lang", "th");
  });

  it("switches to English and remembers the selection", async () => {
    const user = userEvent.setup();
    renderLanguageControls();

    await user.click(screen.getByRole("button", { name: "English" }));

    expect(screen.getByLabelText("current language")).toHaveTextContent("en");
    expect(document.documentElement).toHaveAttribute("lang", "en");
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("en");
  });

  it("restores a valid saved preference", async () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, "en");
    renderLanguageControls();

    await waitFor(() => expect(screen.getByLabelText("current language")).toHaveTextContent("en"));
    expect(document.documentElement).toHaveAttribute("lang", "en");
  });

  it("ignores an unsupported saved preference", () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, "fr");
    renderLanguageControls();

    expect(screen.getByLabelText("current language")).toHaveTextContent("th");
    expect(document.documentElement).toHaveAttribute("lang", "th");
  });

  it("falls back to Thai when browser storage cannot be read", () => {
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Storage denied", "SecurityError");
    });

    renderLanguageControls();

    expect(screen.getByLabelText("current language")).toHaveTextContent("th");
    expect(document.documentElement).toHaveAttribute("lang", "th");
  });

  it("still switches the UI and document language when storage cannot be written", async () => {
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage full", "QuotaExceededError");
    });
    const user = userEvent.setup();
    renderLanguageControls();

    await user.click(screen.getByRole("button", { name: "English" }));

    expect(screen.getByLabelText("current language")).toHaveTextContent("en");
    expect(document.documentElement).toHaveAttribute("lang", "en");
  });
});
