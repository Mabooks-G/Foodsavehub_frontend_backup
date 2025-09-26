// donor.test.js
import { render, screen, fireEvent } from "@testing-library/react";
import Donor from "../donation_coordination/donor";
import { useNavigate } from "react-router-dom";

// --- Mock supabase ---
jest.mock("../supabaseClient", () => {
  return {
    __esModule: true,
    default: {
      from: jest.fn(),
      channel: jest.fn(),
      removeChannel: jest.fn(),
    },
  };
});
import supabase from "../supabaseClient";

// --- Mock router ---
jest.mock("react-router-dom", () => ({
  useNavigate: jest.fn(),
}));

describe("Donor Component", () => {
  const mockNavigate = jest.fn();
  const currentUser = { stakeholderID: "h0", name: "Bethlehem" };

  beforeEach(() => {
    jest.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate);

    const mockMaybeSingle = jest.fn(() =>
      Promise.resolve({ data: { region: "Durban, Kwa-Zulu Natal" } })
    );

    const mockEq = jest.fn(() =>
      Promise.resolve({
        data: [
          {
            stakeholderid: "c1",
            name: "Charity A",
            region: "Durban, Kwa-Zulu Natal",
          },
        ],
      })
    );

    const mockLike = jest.fn(() => ({ eq: mockEq }));

    supabase.from.mockImplementation((table) => {
      if (table === "stakeholderdb") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({ maybeSingle: mockMaybeSingle })),
            like: mockLike,
          })),
        };
      }
      return {};
    });

    supabase.channel.mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
    });
  });

  test("renders loading initially", () => {
    render(<Donor currentUser={currentUser} userType="User" />);
    expect(screen.getByText(/Loading charities/i)).toBeInTheDocument();
  });

  test("shows charities from the same region", async () => {
    render(<Donor currentUser={currentUser} userType="User" />);
    expect(await screen.findByText("Charity A")).toBeInTheDocument();
    expect(screen.getByText("Durban, Kwa-Zulu Natal")).toBeInTheDocument();
  });

  test("shows no charities message if none found", async () => {
    const mockMaybeSingle = jest.fn(() =>
      Promise.resolve({ data: { region: "Nowhere" } })
    );

    const mockEq = jest.fn(() => Promise.resolve({ data: [] }));
    const mockLike = jest.fn(() => ({ eq: mockEq }));

    supabase.from.mockImplementation((table) => {
      if (table === "stakeholderdb") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({ maybeSingle: mockMaybeSingle })),
            like: mockLike,
          })),
        };
      }
      return {};
    });

    render(<Donor currentUser={currentUser} userType="User" />);
    expect(
      await screen.findByText(/No charities found in your region/i)
    ).toBeInTheDocument();
  });

  test("navigates to grocerylist when donate button clicked", async () => {
    render(<Donor currentUser={currentUser} userType="Business" />);
    expect(await screen.findByText("Charity A")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Offer Donation"));
    expect(mockNavigate).toHaveBeenCalledWith("/grocerylist", {
      state: expect.objectContaining({
        foodbank: expect.objectContaining({ name: "Charity A" }),
        userId: "h0",
      }),
    });
  });

  test("toggles popup visibility when bubble clicked", async () => {
    render(<Donor currentUser={currentUser} userType="User" />);
    expect(await screen.findByText("Charity A")).toBeInTheDocument();

    const bubble = document.querySelector(".notification-bubble");
    fireEvent.click(bubble);

    expect(await screen.findByText(/No recent updates/i)).toBeInTheDocument();
  });
});
