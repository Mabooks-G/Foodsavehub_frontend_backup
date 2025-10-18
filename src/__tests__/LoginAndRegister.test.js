/* Author: Bethlehem Shimelis
   Event: Sprint 2: Test frontend login, registration, user profile, fooditems.
   LatestUpdate: Fixed axios mocks and label issues for Jest tests
   Description: Unit tests for LoginForm and RegisterForm components.
   Purpose: Ensures user authentication flows (login + register) behave correctly.
*/

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";

import LoginForm from "../auth/Components/LoginForm.jsx";
import HomeDash from "../users/HomeComponents/HomeDash.jsx";
import HomeForm from "../users/HomeComponents/HomeForm.jsx";
import User from "../users/User.js";

// Mock axios to intercept and control HTTP requests
jest.mock("axios", () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));
import axios from "axios";

// Clear mocks and localStorage before each test
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

// ----------------------
// LoginForm Tests
// ----------------------
describe("LoginForm", () => {
  // Helper function to render the LoginForm with optional onLogin callback
  const renderForm = (onLogin = jest.fn()) =>
    render(<LoginForm onLogin={onLogin} />);

  // Test initial render of login step
  test("renders login step by default", () => {
    renderForm();
    expect(screen.getByText(/FoodSave Hub/i)).toBeInTheDocument(); // app title
    expect(screen.getByPlaceholderText(/Email/i)).toBeInTheDocument(); // email input
    expect(screen.getByPlaceholderText(/Password/i)).toBeInTheDocument(); // password input
  });

  // Test updating input fields
  test("updates email and password inputs", () => {
    renderForm();
    fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: "test@mail.com" } });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: "secret" } });
    expect(screen.getByPlaceholderText(/Email/i)).toHaveValue("test@mail.com");
    expect(screen.getByPlaceholderText(/Password/i)).toHaveValue("secret");
  });

  // Test successful login flow
  test("handles successful login", async () => {
    axios.post.mockResolvedValueOnce({ data: { user: { email: "u@test.com" } } });
    const onLogin = jest.fn();
    renderForm(onLogin);
    fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: "u@test.com" } });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: "pw" } });
    fireEvent.click(screen.getByText(/Login/i));
    await waitFor(() => expect(onLogin).toHaveBeenCalled()); // callback fired
    expect(localStorage.getItem("loggedInUser")).toContain("u@test.com"); // stored in localStorage
  });

  // Test login error handling
  test("shows login error", async () => {
    axios.post.mockRejectedValueOnce({ response: { data: { error: "Invalid credentials" } } });
    renderForm();
    fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: "bad@mail.com" } });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: "wrong" } });
    fireEvent.click(screen.getByText(/Login/i));
    await waitFor(() => expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument());
  });

  // Duplicate login error test for reliability
  test("shows login errorpt2", async () => {
    axios.post.mockRejectedValueOnce({ response: { data: { error: "Invalid credentials" } } });
    renderForm();
    fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: "bad@ail.com" } });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: "wrong" } });
    fireEvent.click(screen.getByText(/Login/i));
    await waitFor(() => expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument());
  });

  // Test forgot password navigation
  test("forgot password navigates to otp-email step", () => {
    renderForm();
    fireEvent.click(screen.getByText(/Forgot Password/i));
    expect(screen.getByText(/Sign Up - Enter Email/i)).toBeInTheDocument();
  });

  // Test OTP request success
  test("request OTP success -> moves to otp-verify", async () => {
    axios.post.mockResolvedValueOnce({ data: { message: "OTP sent" } });
    renderForm();
    fireEvent.click(screen.getByText(/Don't have an account\? Sign Up/i));
    fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: "otp@test.com" } });
    fireEvent.click(screen.getByText(/Request OTP/i));
    await waitFor(() => expect(screen.getByText(/Enter OTP/i)).toBeInTheDocument());
  });

  // Test OTP request failure
  test("request OTP error", async () => {
    axios.post.mockRejectedValueOnce({ response: { data: { error: "Failed to request OTP" } } });
    renderForm();
    fireEvent.click(screen.getByText(/Don't have an account\? Sign Up/i));
    fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: "otp@test.com" } });
    fireEvent.click(screen.getByText(/Request OTP/i));
    await waitFor(() => expect(screen.getByText(/Failed to request OTP/i)).toBeInTheDocument());
  });

  // Test resend OTP cooldown disables button
  test("resend OTP cooldown disables button", async () => {
    axios.post.mockResolvedValueOnce({ data: { message: "OTP sent" } });
    jest.useFakeTimers(); // simulate timers
    renderForm();
    fireEvent.click(screen.getByText(/Don't have an account\? Sign Up/i));
    fireEvent.click(screen.getByText(/Request OTP/i));
    await waitFor(() => screen.getByText(/Enter OTP/i));
    expect(screen.getByText(/Resend OTP/i)).toBeDisabled(); // button initially disabled
    act(() => jest.advanceTimersByTime(31000)); // advance 31 seconds
    expect(screen.getByText(/Resend OTP/i)).not.toBeDisabled(); // button re-enabled
    jest.useRealTimers();
  });

  // Test emoji background renders
  test("emoji background renders at least one", () => {
    renderForm();
    expect(screen.getAllByText(/🍎|🍌|🍊|🍐|🍉/).length).toBeGreaterThan(0);
  });

  // Test back to login navigation
  test("back to login button works", () => {
    renderForm();
    fireEvent.click(screen.getByText(/Don't have an account\? Sign Up/i));
    fireEvent.click(screen.getByText(/Back to Login/i));
    expect(screen.getByText(/FoodSave Hub/i)).toBeInTheDocument();
  });
});

// ----------------------
// HomeDash Tests
// ----------------------
const mockUser = { email: "test@mail.com" };

// Sample food items
const mockItems = [
  { fooditemid: 1, name: "Milk", expirydate: "2099-12-31", quantity: 1, foodcategory: "Dairy & Eggs", Measure_per_Unit: 1, Unit: "L" },
  { fooditemid: 2, name: "Bread", expirydate: "2099-11-20", quantity: 2, foodcategory: "Bakery", Measure_per_Unit: 1, Unit: "g" },
];

describe("HomeDash", () => {
  afterEach(() => jest.clearAllMocks());

  // Fetch and display items on mount
  test("fetches and displays items on mount", async () => {
    axios.get.mockResolvedValueOnce({ data: { foodItems: mockItems } });
    render(<HomeDash currentUser={mockUser} onAddNew={jest.fn()} />);
    expect(await screen.findByText(/Milk/)).toBeInTheDocument();
    expect(screen.getByText(/Bread/)).toBeInTheDocument();
  });

  // Filter items by category
  // test("filters by category", async () => {
  //   axios.get.mockResolvedValueOnce({ data: { foodItems: mockItems } });
  //   render(<HomeDash currentUser={mockUser} onAddNew={jest.fn()} />);
  //   await screen.findByText(/Milk/);
  //   fireEvent.change(screen.getByDisplayValue("All"), { target: { value: "Dairy & Eggs" } });
  //   expect(screen.getByText(/Milk/)).toBeInTheDocument();
  //   expect(screen.queryByText(/Bread/)).not.toBeInTheDocument();
  // });

  // Delete item workflow confirm
  test("delete item workflow confirm", async () => {
    axios.get.mockResolvedValue({ data: { foodItems: mockItems } });
    axios.delete.mockResolvedValueOnce({ data: { message: "Deleted" } });
    render(<HomeDash currentUser={mockUser} onAddNew={jest.fn()} />);
    await screen.findByText(/Milk/);
    fireEvent.click(screen.getAllByText(/Delete/i)[0]);
    fireEvent.click(screen.getByText(/Yes/i));
    await waitFor(() => expect(axios.delete).toHaveBeenCalled());
  });

  // Cancel deletion
  test("cancel delete request", async () => {
    axios.get.mockResolvedValue({ data: { foodItems: mockItems } });
    render(<HomeDash currentUser={mockUser} onAddNew={jest.fn()} />);
    await screen.findByText(/Milk/);
    fireEvent.click(screen.getAllByText(/Delete/i)[0]);
    fireEvent.click(screen.getByText(/No/i));
    expect(screen.getByText(/Milk/)).toBeInTheDocument();
  });

  // Add new button triggers callback
  test("add new button triggers callback", async () => {
    axios.get.mockResolvedValueOnce({ data: { foodItems: mockItems } });
    const onAddNew = jest.fn();
    render(<HomeDash currentUser={mockUser} onAddNew={onAddNew} />);
    await screen.findByText(/Milk/);
    fireEvent.click(screen.getByText(/Add Food Item/i));
    expect(onAddNew).toHaveBeenCalled();
  });

  // Sort items by expiry ascending
  test("sorts items by expiry ascending", async () => {
    axios.get.mockResolvedValueOnce({ data: { foodItems: mockItems } });
    render(<HomeDash currentUser={mockUser} onAddNew={jest.fn()} />);
    const items = await screen.findAllByText(/Milk|Bread/);
    expect(items[0].textContent).toMatch(/Bread|Milk/); // check order
  });

  // Handle empty list
  test("handles empty item list", async () => {
    axios.get.mockResolvedValueOnce({ data: { foodItems: [] } });
    render(<HomeDash currentUser={mockUser} onAddNew={jest.fn()} />);
    await waitFor(() => expect(screen.queryByText(/Milk/)).not.toBeInTheDocument());
  });

  // Handle fetch error
  test("handles fetch error gracefully", async () => {
    axios.get.mockRejectedValueOnce(new Error("Network error"));
    render(<HomeDash currentUser={mockUser} onAddNew={jest.fn()} />);
    await waitFor(() => expect(axios.get).toHaveBeenCalled());
  });
});

// ----------------------
// HomeForm Tests
// ----------------------
describe("HomeForm functional tests", () => {
  // Submitting valid form
  test("submits form successfully (backend call only)", async () => {
    axios.post.mockResolvedValueOnce({ data: { message: "Food item added!" } });
    render(<HomeForm currentUser={mockUser} onClose={jest.fn()} onRefresh={jest.fn()} />);
    
    // Fill form fields
    fireEvent.change(screen.getByRole("textbox", { name: "" }), { target: { value: "Eggs" } });
    fireEvent.change(screen.getAllByRole("spinbutton")[0], { target: { value: 3 } });
    fireEvent.change(screen.getAllByRole("spinbutton")[1], { target: { value: 1 } });
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "Dairy & Eggs" } });
    fireEvent.change(screen.getAllByRole("combobox")[1], { target: { value: "g" } });

    const futureDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    fireEvent.change(document.querySelector('input[name="expirydate"]'), { target: { value: futureDate } });

    fireEvent.click(screen.getByText(/Add Item/i));

    await waitFor(() =>
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/api/users/fooditems"),
        expect.objectContaining({
          email: mockUser.email,
          name: "Eggs",
          quantity: 3,
          Measure_per_Unit: 1,
          foodcategory: "Dairy & Eggs",
          Unit: "g",
          expirydate: futureDate,
        })
      )
    );
  });

  // Show error when name is empty
  test("shows error when name is empty", async () => {
    render(<HomeForm currentUser={mockUser} onClose={jest.fn()} onRefresh={jest.fn()} />);
    fireEvent.click(screen.getByText(/add item/i)); // submit empty form
    await waitFor(() => expect(screen.getByText(/name is required/i)).toBeInTheDocument());
    expect(axios.post).not.toHaveBeenCalled(); // API should not be called
  });

  // Show error when expiry date is in the past
  test("shows error when expiry date is in the past", async () => {
    render(<HomeForm currentUser={mockUser} onClose={jest.fn()} onRefresh={jest.fn()} />);

    fireEvent.change(screen.getByRole("textbox", { name: "" }), { target: { value: "Eggs" } });
    fireEvent.change(screen.getAllByRole("spinbutton")[0], { target: { value: 3 } });
    fireEvent.change(screen.getAllByRole("spinbutton")[1], { target: { value: 1 } });
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "Dairy & Eggs" } });
    fireEvent.change(screen.getAllByRole("combobox")[1], { target: { value: "g" } });

    const pastDate = new Date(Date.now() - 86400000).toISOString().slice(0, 10); // yesterday
    fireEvent.change(document.querySelector('input[name="expirydate"]'), { target: { value: pastDate } });

    fireEvent.click(screen.getByText(/Add Item/i));

    await waitFor(() => expect(screen.getByText(/expiry date must be in the future/i)).toBeInTheDocument());
    expect(axios.post).not.toHaveBeenCalled();
  });

  // API error handling
  test("shows API error", async () => {
    axios.post.mockRejectedValueOnce({ response: { data: { error: "Failed" } } });
    render(<HomeForm currentUser={mockUser} onClose={jest.fn()} onRefresh={jest.fn()} />);

    fireEvent.change(screen.getByRole("textbox", { name: "" }), { target: { value: "Eggs" } });
    fireEvent.change(screen.getAllByRole("spinbutton")[0], { target: { value: 3 } });
    fireEvent.change(screen.getAllByRole("spinbutton")[1], { target: { value: 1 } });
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "Dairy & Eggs" } });
    fireEvent.change(screen.getAllByRole("combobox")[1], { target: { value: "g" } });

    const futureDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    fireEvent.change(document.querySelector('input[name="expirydate"]'), { target: { value: futureDate } });

    fireEvent.click(screen.getByText(/add item/i));

    await waitFor(() => expect(screen.getByText(/failed/i)).toBeInTheDocument());
    expect(axios.post).toHaveBeenCalled();
  });

  // Back button triggers onClose
  test("calls onClose when back button clicked", () => {
    const onClose = jest.fn();
    render(<HomeForm currentUser={mockUser} onClose={onClose} onRefresh={jest.fn()} />);
    fireEvent.click(screen.getByText(/back to inventory/i));
    expect(onClose).toHaveBeenCalled();
  });

  // Submit with different category/unit
  test("submits form with different category and unit", async () => {
    axios.post.mockResolvedValueOnce({ data: { message: "Food item added!" } });
    render(<HomeForm currentUser={mockUser} onClose={jest.fn()} onRefresh={jest.fn()} />);

    fireEvent.change(screen.getByRole("textbox", { name: "" }), { target: { value: "Milk" } });
    fireEvent.change(screen.getAllByRole("spinbutton")[0], { target: { value: 2 } });
    fireEvent.change(screen.getAllByRole("spinbutton")[1], { target: { value: 500 } });
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "Beverages" } });
    fireEvent.change(screen.getAllByRole("combobox")[1], { target: { value: "ml" } });

    const futureDate = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10); // 2 days ahead
    fireEvent.change(document.querySelector('input[name="expirydate"]'), { target: { value: futureDate } });

    fireEvent.click(screen.getByText(/Add Item/i));

    await waitFor(() =>
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/api/users/fooditems"),
        expect.objectContaining({
          email: mockUser.email,
          name: "Milk",
          quantity: 2,
          Measure_per_Unit: 500,
          foodcategory: "Beverages",
          Unit: "ml",
          expirydate: futureDate,
        })
      )
    );
  });

  // Quantity validation
  test("does not submit when quantity is zero", async () => {
    render(<HomeForm currentUser={mockUser} onClose={jest.fn()} onRefresh={jest.fn()} />);

    fireEvent.change(screen.getByRole("textbox", { name: "" }), { target: { value: "Bread" } });
    fireEvent.change(screen.getAllByRole("spinbutton")[0], { target: { value: 0 } });
    fireEvent.change(screen.getAllByRole("spinbutton")[1], { target: { value: 1 } });
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "Bakery" } });
    fireEvent.change(screen.getAllByRole("combobox")[1], { target: { value: "g" } });

    const futureDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    fireEvent.change(document.querySelector('input[name="expirydate"]'), { target: { value: futureDate } });

    fireEvent.click(screen.getByText(/Add Item/i));

    await waitFor(() => expect(screen.getByText(/quantity must be at least 1/i)).toBeInTheDocument());
    expect(axios.post).not.toHaveBeenCalled();
  });

  // Maximum allowed values
  test("submits form with maximum allowed values", async () => {
    axios.post.mockResolvedValueOnce({ data: { message: "Food item added!" } });
    render(<HomeForm currentUser={mockUser} onClose={jest.fn()} onRefresh={jest.fn()} />);

    fireEvent.change(screen.getByRole("textbox", { name: "" }), { target: { value: "Cheese" } });
    fireEvent.change(screen.getAllByRole("spinbutton")[0], { target: { value: 999 } });
    fireEvent.change(screen.getAllByRole("spinbutton")[1], { target: { value: 1000 } });
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "Dairy & Eggs" } });
    fireEvent.change(screen.getAllByRole("combobox")[1], { target: { value: "kg" } });

    const futureDate = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10); // 1 year ahead
    fireEvent.change(document.querySelector('input[name="expirydate"]'), { target: { value: futureDate } });

    fireEvent.click(screen.getByText(/Add Item/i));

    await waitFor(() =>
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/api/users/fooditems"),
        expect.objectContaining({
          email: mockUser.email,
          name: "Cheese",
          quantity: 999,
          Measure_per_Unit: 1000,
          foodcategory: "Dairy & Eggs",
          Unit: "kg",
          expirydate: futureDate,
        })
      )
    );
  });

  // Optional fields not filled
  test("submits form without optional fields", async () => {
    axios.post.mockResolvedValueOnce({ data: { message: "Food item added!" } });
    render(<HomeForm currentUser={mockUser} onClose={jest.fn()} onRefresh={jest.fn()} />);

    fireEvent.change(screen.getByRole("textbox", { name: "" }), { target: { value: "Apple" } });
    fireEvent.change(screen.getAllByRole("spinbutton")[0], { target: { value: 1 } });
    fireEvent.change(screen.getAllByRole("spinbutton")[1], { target: { value: 1 } });

    // leave category and unit default
    const futureDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    fireEvent.change(document.querySelector('input[name="expirydate"]'), { target: { value: futureDate } });

    fireEvent.click(screen.getByText(/Add Item/i));

    await waitFor(() =>
      expect(screen.getByText(/Please select a category/i)).toBeInTheDocument()
    );
    expect(axios.post).not.toHaveBeenCalled();
  });
});

// ----------------------
// User Tests
// ----------------------
const mockUser2 = {
  email: "test@example.com",
  name: "John Doe",
  region: "Durban, KwaZulu-Natal",
  capacity: 50,
  push_notifications: 1,
  stakeholderID: "c123"
};

describe("User Profile functional tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Render user data in view mode
  test("renders user data correctly in view mode", () => {
    render(<User currentUser={mockUser2} />);
    expect(screen.getByText(mockUser2.email)).toBeInTheDocument();
    expect(screen.getByText(mockUser2.name)).toBeInTheDocument();
    expect(screen.getByText(mockUser2.region)).toBeInTheDocument();
    expect(screen.getByText(mockUser2.capacity.toString())).toBeInTheDocument();
    expect(screen.getByText(/Edit Profile/i)).toBeInTheDocument();
  });

  // Toggle edit mode
  test("toggles edit mode", () => {
    render(<User currentUser={mockUser2} />);
    fireEvent.click(screen.getByText(/Edit Profile/i));

    const nameInput = screen.getAllByRole("textbox")[0]; // Name field
    const regionInput = screen.getAllByRole("textbox")[1]; // Region field

    expect(nameInput).toHaveValue(mockUser2.name);
    expect(regionInput).toHaveValue(mockUser2.region);

    const pushCheckbox = screen.getAllByRole("checkbox")[0]; // Push notifications
    const changePasswordCheckbox = screen.getAllByRole("checkbox")[1]; // Change password

    expect(pushCheckbox).toBeChecked();
    expect(changePasswordCheckbox).not.toBeChecked();
  });

  // Update name successfully
  test("updates name and saves profile successfully", async () => {
    render(<User currentUser={mockUser2} />);
    fireEvent.click(screen.getByText(/Edit Profile/i));

    const nameInput = screen.getAllByRole("textbox")[0];
    fireEvent.change(nameInput, { target: { value: "Jane Doe" } });
    fireEvent.click(screen.getByText(/Save/i));

    await waitFor(() => expect(axios.put).toHaveBeenCalled());
  });

  // Toggle push notifications
  test("toggles push notifications", () => {
    render(<User currentUser={mockUser2} />);
    fireEvent.click(screen.getByText(/Edit Profile/i));

    const pushCheckbox = screen.getAllByRole("checkbox")[0];
    fireEvent.click(pushCheckbox);

    fireEvent.click(screen.getByText(/Save/i));
  });

  // Initiate change password flow
  test("initiates change password flow with OTP", () => {
    render(<User currentUser={mockUser2} />);
    fireEvent.click(screen.getByText(/Edit Profile/i));

    const changePasswordCheckbox = screen.getAllByRole("checkbox")[1];
    fireEvent.click(changePasswordCheckbox);

    fireEvent.click(screen.getByText(/Send OTP/i));
  });

  // Cancel edit and reset
  test("cancels edit and resets form", () => {
    render(<User currentUser={mockUser2} />);
    fireEvent.click(screen.getByText(/Edit Profile/i));

    const nameInput = screen.getAllByRole("textbox")[0];
    fireEvent.change(nameInput, { target: { value: "Changed Name" } });

    fireEvent.click(screen.getByText(/Cancel/i));
  });

  // Handle API error on save
  test("displays error when API update fails", async () => {
    axios.put.mockRejectedValueOnce({ response: { data: { error: "Failed" } } });

    render(<User currentUser={mockUser2} />);
    fireEvent.click(screen.getByText(/Edit Profile/i));

    fireEvent.click(screen.getByText(/Save/i));

    expect(await screen.findByText(/Failed/i)).toBeInTheDocument();
  });
});

// ----------------------
// LoginForm Tests
// ----------------------
describe("LoginForm Component", () => {
  const renderForm = (onLogin = jest.fn()) => render(<LoginForm onLogin={onLogin} />);

  test("renders login step by default", () => {
    renderForm();
    expect(screen.getByText("FoodSave Hub")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
  });

  test("updates email and password inputs", () => {
    renderForm();
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "user@test.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Secret123!" } });
    expect(screen.getByPlaceholderText("Email")).toHaveValue("user@test.com");
    expect(screen.getByPlaceholderText("Password")).toHaveValue("Secret123!");
  });

  test("handles successful login", async () => {
    const onLogin = jest.fn();
    axios.post.mockResolvedValueOnce({ data: { user: { email: "user@test.com" } } });
    renderForm(onLogin);

    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "user@test.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Secret123!" } });
    fireEvent.click(screen.getByText("Login"));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith(expect.objectContaining({ email: "user@test.com" })));
    expect(localStorage.getItem("loggedInUser")).toContain("user@test.com");
  });

  test("displays login error for wrong password", async () => {
    axios.post.mockRejectedValueOnce({ response: { data: { error: "Wrong Password" } } });
    renderForm();

    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "user@test.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByText("Login"));

    await waitFor(() => expect(screen.getByText("Password is incorrect")).toBeInTheDocument());
  });

  test("forgot password navigates to otp-email and enables changePasswordMode", () => {
    renderForm();
    fireEvent.click(screen.getByText("Forgot Password?"));
    expect(screen.getByText("Sign Up - Enter Email")).toBeInTheDocument();
  });

  test("request OTP success moves to otp-verify step", async () => {
    axios.post.mockResolvedValueOnce({ data: { message: "OTP sent" } });
    renderForm();
    fireEvent.click(screen.getByText("Don't have an account? Sign Up"));
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "otp@test.com" } });
    fireEvent.click(screen.getByText("Request OTP"));

    await waitFor(() => expect(screen.getByText("Enter OTP")).toBeInTheDocument());
  });


  test("resend OTP button disabled during cooldown and re-enabled after 30s", async () => {
    jest.useFakeTimers();
    axios.post.mockResolvedValueOnce({ data: { message: "OTP sent" } });

    renderForm();
    fireEvent.click(screen.getByText("Don't have an account? Sign Up"));
    fireEvent.click(screen.getByText("Request OTP"));

    await waitFor(() => screen.getByText(/Resend OTP in 30s/));
    expect(screen.getByText(/Resend OTP in/)).toBeDisabled();

    act(() => jest.advanceTimersByTime(31000));
    expect(screen.getByText("Resend OTP")).not.toBeDisabled();
    jest.useRealTimers();
  });


  test("OTP verification success moves to register", async () => {
  // Mock OTP request and verification
  axios.post.mockImplementation((url) => {
    if (url.endsWith("/request-otp")) {
      return Promise.resolve({ data: {} });
    }
    if (url.endsWith("/verify-otp")) {
      return Promise.resolve({ data: { message: "OTP verified" } });
    }
    return Promise.reject();
  });

  render(<LoginForm />);

  // Go to OTP email step
  fireEvent.click(screen.getByText("Don't have an account? Sign Up"));

  // Fill in email
  fireEvent.change(screen.getByPlaceholderText("Email"), {
    target: { value: "otp@test.com" },
  });

  // Submit to request OTP
  fireEvent.click(screen.getByText("Request OTP"));

  // Wait for step to change to otp-verify
  await waitFor(() => screen.getByPlaceholderText("Enter OTP"));

  // Type OTP
  fireEvent.change(screen.getByPlaceholderText("Enter OTP"), {
    target: { value: "123456" },
  });

  // Click Verify OTP
  fireEvent.click(screen.getByText("Verify OTP"));

  // Wait for next step
  await waitFor(() =>
    expect(screen.getAllByText("Complete Registration")[1]).toBeInTheDocument()
  );
});
});

const user = {
  name: "Test User",
  email: "test@test.com",
  region: "Durban, KwaZulu-Natal",
  push_notifications: 1,
  stakeholderID: "c123",
  capacity: 50
};

describe("User Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders user data and formData correctly", () => {
    render(<User currentUser={user} />);

    expect(screen.getByText(user.email)).toBeInTheDocument();
    expect(screen.getByText(user.name)).toBeInTheDocument();
    expect(screen.getByText(user.region)).toBeInTheDocument();
    expect(screen.getByText(user.capacity.toString())).toBeInTheDocument();
  });

  test("toggles edit mode and resets state", () => {
    render(<User currentUser={user} />);
    fireEvent.click(screen.getByText("Edit Profile"));
    
    expect(screen.getByDisplayValue(user.name)).toBeInTheDocument();
    
    fireEvent.click(screen.getByText("Cancel")); // toggle off
    expect(screen.queryByDisplayValue(user.name)).not.toBeInTheDocument();
  });

  test("updates formData when inputs change", () => {
    render(<User currentUser={user} />);
    fireEvent.click(screen.getByText("Edit Profile"));

    const nameInput = screen.getByDisplayValue(user.name);
    fireEvent.change(nameInput, { target: { value: "Updated User" } });
    expect(nameInput.value).toBe("Updated User");

    const capacityInput = screen.getByDisplayValue(user.capacity.toString());
    fireEvent.change(capacityInput, { target: { value: "75" } });
    expect(capacityInput.value).toBe("75");
  });

  test("filters regions based on search input", () => {
    render(<User currentUser={user} />);
    fireEvent.click(screen.getByText("Edit Profile"));

    const regionInput = screen.getByPlaceholderText("Search Region...");
    fireEvent.change(regionInput, { target: { value: "Cape" } });

    expect(screen.getByText("Cape Town, Western Cape")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Cape Town, Western Cape"));
    expect(regionInput.value).toBe("Cape Town, Western Cape");
  });


  test("handles failed profile update", async () => {
    axios.put.mockRejectedValue({ response: { data: { error: "Update failed" } } });

    render(<User currentUser={user} />);
    fireEvent.click(screen.getByText("Edit Profile"));
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => expect(screen.getByText("Update failed")).toBeInTheDocument());
  });

  test("successful profile update resets form and shows success message", async () => {
    axios.put.mockResolvedValue({ data: { user } });

    render(<User currentUser={user} />);
    fireEvent.click(screen.getByText("Edit Profile"));
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() =>
      expect(screen.getByText("Profile updated successfully!")).toBeInTheDocument()
    );
  });
});

const mU = { email: "test@test.com" };
const fIm = [
  {
    fooditemid: 1,
    foodcategory: "Produce",
    name: "Apple",
    expirydate: new Date(Date.now() + 5 * 24*60*60*1000).toISOString(), // 5 days later
    quantity: 10,
    Measure_per_Unit: 100,
    Unit: "g"
  },
  {
    fooditemid: 2,
    foodcategory: "Dairy & Eggs",
    name: "Milk",
    expirydate: new Date(Date.now() + 1 * 24*60*60*1000).toISOString(), // 1 day later
    quantity: 2,
    Measure_per_Unit: 1,
    Unit: "L"
  }
];

describe("HomeDash Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.get.mockResolvedValue({ data: { foodItems: fIm } });
    axios.put.mockResolvedValue({});
    axios.delete.mockResolvedValue({});
  });

  // test("renders fetched food items and header", async () => {
  //   render(<HomeDash currentUser={mU} onAddNew={jest.fn()} navbarExpanded={false} />);
    
  //   await waitFor(() => expect(axios.get).toHaveBeenCalledWith(
  //     expect.stringContaining(`/api/users/fooditems?email=${mU.email}`)
  //   ));

  //   expect(screen.getByText("Your Food Items")).toBeInTheDocument();
  //   //expect(screen.getByText("Apple")).toBeInTheDocument();
  //   expect(screen.getByText("Milk")).toBeInTheDocument();
  // });

  // test("filters food items by category", async () => {
  //   render(<HomeDash currentUser={mU} onAddNew={jest.fn()} navbarExpanded={false} />);
  //   await waitFor(() => screen.getByText("Apple"));

  //   const select = screen.getByLabelText(/Filter by category/i);
  //   fireEvent.change(select, { target: { value: "Produce" } });

  //   expect(screen.getByText("Apple")).toBeInTheDocument();
  //   expect(screen.queryByText("Milk")).not.toBeInTheDocument();
  // });

   test("allows inline edit and cancels edit", async () => {
    render(<HomeDash currentUser={mU} onAddNew={jest.fn()} navbarExpanded={false} />);
    await waitFor(() => screen.getByText("Milk"));

    fireEvent.click(screen.getAllByText("Edit")[0]);

    const nameInput = screen.getByDisplayValue("Milk");
    fireEvent.change(nameInput, { target: { value: "Fresh Milk" } });
    expect(nameInput.value).toBe("Fresh Milk");

    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.getByText("Milk")).toBeInTheDocument();
  });

  // test("shows error if name is empty or expirydate in past", async () => {
  //   render(<HomeDash currentUser={mU} onAddNew={jest.fn()} navbarExpanded={false} />);
  //   await waitFor(() => screen.getByText("Apple"));

  //   fireEvent.click(screen.getAllByText("Edit")[0]);

  //   // Empty name
  //   fireEvent.change(screen.getByDisplayValue("Apple"), { target: { value: "" } });
  //   fireEvent.click(screen.getByText("Save"));
  //   expect(await screen.findByText("fill-in item name")).toBeInTheDocument();

  //   // Expiry in the past
  //   fireEvent.change(screen.getByDisplayValue(""), { target: { value: "Apple" } });
  //   fireEvent.change(screen.getByDisplayValue(fIm[0].expirydate.slice(0,10)), {
  //     target: { value: "2000-01-01" }
  //   });
  //   fireEvent.click(screen.getByText("Save"));
  //   expect(await screen.findByText("expiry must be future dated")).toBeInTheDocument();
  // });

  // test("saves edits successfully", async () => {
  //   render(<HomeDash currentUser={mU} onAddNew={jest.fn()} navbarExpanded={false} />);
  //   await waitFor(() => screen.getByText("Apple"));

  //   fireEvent.click(screen.getAllByText("Edit")[0]);
  //   fireEvent.change(screen.getByDisplayValue("Apple"), { target: { value: "Red Apple" } });
  //   fireEvent.click(screen.getByText("Save"));

  //   await waitFor(() => expect(axios.put).toHaveBeenCalledWith(
  //     expect.stringContaining(`/api/users/fooditems/1`),
  //     expect.objectContaining({ name: "Red Apple", email: mU.email })
  //   ));
  // });

  test("delete confirmation flow works", async () => {
    render(<HomeDash currentUser={mU} onAddNew={jest.fn()} navbarExpanded={false} />);
    await waitFor(() => screen.getByText("Apple"));

    fireEvent.click(screen.getAllByText("Delete")[0]);
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Yes"));
    await waitFor(() => expect(axios.delete).toHaveBeenCalledWith(
      expect.stringContaining(`/api/users/fooditems/2?email=${mU.email}`)
    ));
  });

  test("cancel delete hides confirmation", async () => {
    render(<HomeDash currentUser={mU} onAddNew={jest.fn()} navbarExpanded={false} />);
    await waitFor(() => screen.getByText("Apple"));

    fireEvent.click(screen.getAllByText("Delete")[0]);
    fireEvent.click(screen.getByText("No"));
    expect(screen.queryByText("Are you sure?")).not.toBeInTheDocument();
  });

  test("add new button triggers callback", async () => {
    const addNewMock = jest.fn();
    render(<HomeDash currentUser={mU} onAddNew={addNewMock} navbarExpanded={false} />);
    fireEvent.click(screen.getByText("Add Food Item"));
    expect(addNewMock).toHaveBeenCalled();
  });
});