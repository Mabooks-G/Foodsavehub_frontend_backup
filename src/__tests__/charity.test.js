// src/donation_coordination/charity.test.js
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Charity from "../donation_coordination/charity";

// ✅ Inline Supabase mock
jest.mock("../supabaseClient", () => {
  const mockFrom = jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() =>
          Promise.resolve({ data: { id: 1, name: "Mock Offer" }, error: null })
        ),
      })),
    })),
    insert: jest.fn(() => Promise.resolve({ data: {}, error: null })),
    update: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: {}, error: null })),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: {}, error: null })),
    })),
  }));

  return {
    __esModule: true,
    default: {
      from: mockFrom,
      channel: jest.fn(() => ({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
      })),
    },
  };
});

// ✅ Prevent jsdom alert crash
beforeAll(() => {
  window.alert = jest.fn();

  // Silence React Router v7 warnings
  jest.spyOn(console, "warn").mockImplementation((msg) => {
    if (
      msg.includes("React Router Future Flag Warning") ||
      msg.includes("Relative route resolution")
    ) {
      return;
    }
    console.warn(msg);
  });
});

describe("Charity Component", () => {
  it("renders offers list", async () => {
    render(
      <MemoryRouter>
        <Charity currentUser={{ stakeholderID: "c001", name: "Charity A" }} />
      </MemoryRouter>
    );

    expect(screen.getByText(/Donations/i)).toBeInTheDocument();
    expect(screen.getByText(/Charity A/i)).toBeInTheDocument();
  });

  it("handles accept button click", async () => {
    render(
      <MemoryRouter>
        <Charity currentUser={{ stakeholderID: "c001", name: "Charity A" }} />
      </MemoryRouter>
    );

    const acceptButton = await screen.findByText(/ACCEPT/i);
    fireEvent.click(acceptButton);

    await waitFor(() =>
      expect(screen.queryByText(/Donor Joe/i)).not.toBeInTheDocument()
    );
  });

  it("handles decline button click", async () => {
    render(
      <MemoryRouter>
        <Charity currentUser={{ stakeholderID: "c001", name: "Charity A" }} />
      </MemoryRouter>
    );

    const declineButton = await screen.findByText(/DECLINE/i);
    fireEvent.click(declineButton);

    await waitFor(() =>
      expect(screen.queryByText(/Donor Joe/i)).not.toBeInTheDocument()
    );
  });
});
