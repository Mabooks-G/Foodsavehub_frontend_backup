/* Author: Bethlehem Shimelis
   Event: Sprint 1: Test frontend login, registration.
   LatestUpdate: Fixed axios mocks and label issues for Jest tests
   Description: Unit tests for LoginForm and RegisterForm components.
   Purpose: Ensures user authentication flows (login + register) behave correctly.
*/

// -------------------- Imports --------------------
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom"; // extends jest matchers (toBeInTheDocument, etc.)
import axios from "axios";

// Mock axios functions (we override get and post so no real network calls are made)
jest.mock("axios", () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

// Components under test
import LoginForm from "../auth/Components/LoginForm.jsx";
import RegisterForm from "../auth/Components/RegisterForm.jsx";

// Mock axios globally (ensures even if re-imported, the same mock is used)
jest.mock("axios");

// -------------------- Global Test Setup --------------------

// Silence console.error so failing tests don’t clutter output with React warnings
beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});

// Cleanup after each test to avoid test pollution
afterEach(() => {
  jest.clearAllMocks(); // reset axios mocks
  jest.useRealTimers(); // reset timers in case fake timers were used
  localStorage.clear(); // clear saved users between tests
});

// -------------------- Mock Data --------------------
const mockUser = { email: "test@example.com", name: "Tester" };
const mockFoodItems = [
  { fooditemid: 1, name: "Milk", expirydate: "2099-12-31", quantity: 1, foodcategory: "Dairy & Eggs", Measure_per_Unit: 1, Unit: "L" },
  { fooditemid: 2, name: "Bread", expirydate: "2099-12-20", quantity: 2, foodcategory: "Bakery", Measure_per_Unit: 1, Unit: "g" },
  { fooditemid: 3, name: "Old Bread", expirydate: "2000-01-01", quantity: 1, foodcategory: "Bakery", Measure_per_Unit: 1, Unit: "g" },
];

// ----------------------
// LOGINFORM TESTS
// ----------------------
describe("LoginForm", () => {
  test("handles successful login and sets localStorage", async () => {
    // Mock backend success response
    axios.post.mockResolvedValue({ data: { message: "Login successful!", user: mockUser } });

    const onLogin = jest.fn(); // mock callback for parent component

    // Render login form
    render(<LoginForm goToRegister={jest.fn()} onLogin={onLogin} />);

    // Fill in email + password inputs
    fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: mockUser.email, name: "email" } });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: "secret", name: "password" } });

    // Submit login
    fireEvent.click(screen.getByText(/Login/i));

    // Wait until success message appears
    await waitFor(() => expect(screen.getByText(/Login successful/i)).toBeInTheDocument());

    // Verify callback was triggered with user object
    expect(onLogin).toHaveBeenCalledWith(mockUser);

    // Verify user was saved in localStorage
    expect(JSON.parse(localStorage.getItem("loggedInUser")).email).toBe(mockUser.email);
  });

  test("handles login error with API message", async () => {
    // Mock API rejection with error response
    axios.post.mockRejectedValue({ response: { data: { error: "Invalid credentials" } } });

    render(<LoginForm goToRegister={jest.fn()} onLogin={jest.fn()} />);

    // Enter invalid credentials
    fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: "wrong@mail.com", name: "email" } });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: "badpass", name: "password" } });

    // Submit login
    fireEvent.click(screen.getByText(/Login/i));

    // Expect specific error message from API to be displayed
    await waitFor(() => expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument());
  });

  test("handles login error with generic error", async () => {
    // Mock axios rejecting with a network error (no structured response)
    axios.post.mockRejectedValue(new Error("Network error"));

    render(<LoginForm goToRegister={jest.fn()} onLogin={jest.fn()} />);

    // Enter credentials
    fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: "x@y.com", name: "email" } });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: "pw", name: "password" } });

    // Submit login
    fireEvent.click(screen.getByText(/Login/i));

    // Component should fallback to generic error text
    await waitFor(() => expect(screen.getByText(/Invalid email or password/i)).toBeInTheDocument());
  });
});

// ----------------------
// REGISTERFORM TESTS
// ----------------------
describe("RegisterForm", () => {
  test("validates capacity for charity users", async () => {
    render(<RegisterForm goToLogin={jest.fn()} onLogin={jest.fn()} />);

    // Change account type to "Charity/Foodbank"
    fireEvent.change(screen.getByDisplayValue("Household/Individual"), { target: { value: "Charity/Foodbank", name: "accountType" } });

    // Try submitting without capacity input
    fireEvent.click(screen.getByText(/Create Account/i));

    // Should show validation error
    await waitFor(() => expect(screen.getByText(/Please enter a valid capacity/i)).toBeInTheDocument());
  });

  test("handles successful registration", async () => {
    // Mock API success
    axios.post.mockResolvedValue({ data: { message: "Registered!", user: mockUser } });

    const onLogin = jest.fn();

    render(<RegisterForm goToLogin={jest.fn()} onLogin={onLogin} />);

    // Fill out registration form
    fireEvent.change(screen.getByPlaceholderText(/Name/i), { target: { value: "Tester", name: "name" } });
    fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: mockUser.email, name: "email" } });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: "secret", name: "password" } });

    // Submit form
    fireEvent.click(screen.getByText(/Create Account/i));

    // Verify success message
    await waitFor(() => expect(screen.getByText(/Registered!/i)).toBeInTheDocument());

    // Verify parent callback is called with user object
    expect(onLogin).toHaveBeenCalledWith(mockUser);
  });
});
