import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import GroceryList from "../donation_coordination/grocerylist";
import supabase from "../supabaseClient";

// Mock Supabase calls
jest.mock("../supabaseClient", () => ({
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    insert: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    then: jest.fn(),
  })),
}));

describe("GroceryList Component", () => {
  const mockFoodItems = [
    { fooditemid: "f001", name: "Milk", Measure_per_Unit: "1L", Unit: "bottle", quantity: 5, expirydate: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString() }, // not expiring in 48h
    { fooditemid: "f002", name: "Bread", Measure_per_Unit: "1", Unit: "loaf", quantity: 2, expirydate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }, // expiring in 48h
  ];

  beforeEach(() => {
    // Mock fetching food items
    supabase.from.mockImplementation((table) => {
      if (table === "fooditemdb") {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          then: (cb) => cb({ data: mockFoodItems, error: null }),
        };
      }
      if (table === "stakeholderdb") {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockReturnValue({ data: { capacity: 10 }, error: null }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
    });
  });

  it("shows only items not expiring in the next 48 hours", async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: "/", state: { foodbank: { stakeholderid: "c001", name: "Charity A" }, userId: "u001" } }]}>
        <Routes>
          <Route path="/" element={<GroceryList />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      // Milk should appear (72h ahead)
      expect(screen.getByText(/Milk/i)).toBeInTheDocument();
      // Bread should NOT appear (24h ahead)
      expect(screen.queryByText(/Bread/i)).not.toBeInTheDocument();
    });
  });

  it("allows selecting and deselecting items", async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: "/", state: { foodbank: { stakeholderid: "c001", name: "Charity A" }, userId: "u001" } }]}>
        <Routes>
          <Route path="/" element={<GroceryList />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      const milkCheckbox = screen.getByRole("checkbox", { name: /Milk/i });
      expect(milkCheckbox.checked).toBe(false);

      // Select item
      fireEvent.click(milkCheckbox);
      expect(milkCheckbox.checked).toBe(true);

      // Deselect item
      fireEvent.click(milkCheckbox);
      expect(milkCheckbox.checked).toBe(false);
    });
  });

  it("shows warning if trying to send donation with no items selected", async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: "/", state: { foodbank: { stakeholderid: "c001", name: "Charity A" }, userId: "u001" } }]}>
        <Routes>
          <Route path="/" element={<GroceryList />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      fireEvent.click(screen.getByText("Send Donation"));
      expect(screen.getByText("Please select at least one item to donate.")).toBeInTheDocument();
    });
  });
});
