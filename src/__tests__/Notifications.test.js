/* Author: Kemo Mokoena
   Event: Sprint 1
   LatestUpdate: 2025/09/21
   Description: Frontend unit tests for Notifications component
   Returns: Test results for React component rendering and user interactions
*/

// Import utilities from React Testing Library for rendering components, querying the DOM,
// waiting for asynchronous updates, and simulating user events
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

// Import the component we want to test
import Notification from "../notifications/Notification";

// Import jest-dom for extended DOM assertions like .toBeInTheDocument()
import '@testing-library/jest-dom';

// Mock the axios library to avoid making real HTTP requests during tests
// Define 'get' and 'put' methods as jest mock functions
jest.mock("axios", () => ({
  get: jest.fn(),
  put: jest.fn()
}));

// Group all tests for the Notification component
describe("Notification Component", () => {

  // Create a mock user to simulate a logged-in user stored in localStorage
  const loggedInUser = { email: "test@example.com" };

  // Variable to hold the mocked axios instance
  let axios;

  // beforeEach runs before every test to setup environment
  beforeEach(() => {
    // Store the mock user in localStorage
    localStorage.setItem("loggedInUser", JSON.stringify(loggedInUser));
    
    // Clear all mocks to reset axios calls between tests
    jest.clearAllMocks();

    // Dynamically require axios so we use the mocked version
    axios = require("axios");
  });

  // afterEach runs after each test to cleanup
  afterEach(() => {
    // Clear localStorage to prevent state leaking between tests
    localStorage.clear();
  });

  // Test: checks if notifications are rendered from the API
  test("renders notifications from API", async () => {
    // Mock notification data returned from API
    const notificationsMock = [
      { id: 1, name: "Milk", expiryStatus: "Expires in 2 days", status: "warning", notificationRead: false }
    ];

    // Mock axios GET request to return notificationsMock
    axios.get.mockResolvedValueOnce({ data: notificationsMock });

    // Render the Notification component
    render(<Notification refreshFlag={0} />);

    // Wait for the notification to appear in the DOM
    await waitFor(() => {
      expect(screen.getByText("Milk")).toBeInTheDocument();
    });
  });

  // Test: clicking a notification marks it as read
  test("marks notification as read on click", async () => {
    const notificationsMock = [
      { id: 1, name: "Milk", expiryStatus: "Expires in 2 days", status: "warning", notificationRead: false }
    ];

    // Mock API GET to return notifications
    axios.get.mockResolvedValueOnce({ data: notificationsMock });

    // Mock API PUT for marking notification as read
    axios.put.mockResolvedValueOnce({ data: { success: true } });

    // Mock callback function to verify onRead is called
    const onReadMock = jest.fn();

    // Render Notification component with onRead callback
    render(<Notification refreshFlag={0} onRead={onReadMock} />);

    // Wait for the notification to render
    await waitFor(() => screen.getByText("Milk"));

    // Simulate user clicking the notification
    fireEvent.click(screen.getByText("Milk"));

    // Verify that onRead callback was called with correct notification ID
    await waitFor(() => {
      expect(onReadMock).toHaveBeenCalledWith(1);
    });
  });

  // Test: renders empty state if there are no notifications
  test("renders empty state when no notifications", async () => {
    axios.get.mockResolvedValueOnce({ data: [] });
    render(<Notification refreshFlag={0} />);
    await waitFor(() => {
      expect(screen.getByText(/no notifications/i)).toBeInTheDocument();
    });
  });

  // Test: displays error message when API request fails
  test("displays error message when API call fails", async () => {
    axios.get.mockRejectedValueOnce(new Error("API error"));
    render(<Notification refreshFlag={0} />);
    await waitFor(() => {
      expect(screen.getByText(/failed to load notifications/i)).toBeInTheDocument();
    });
  });

  // Test: renders multiple notifications at once
  test("renders multiple notifications", async () => {
    const notificationsMock = [
      { id: 1, name: "Milk", expiryStatus: "Expires in 2 days", status: "warning", notificationRead: false },
      { id: 2, name: "Eggs", expiryStatus: "Expires tomorrow", status: "urgent", notificationRead: false }
    ];
    axios.get.mockResolvedValueOnce({ data: notificationsMock });
    render(<Notification refreshFlag={0} />);
    await waitFor(() => {
      expect(screen.getByText("Milk")).toBeInTheDocument();
      expect(screen.getByText("Eggs")).toBeInTheDocument();
    });
  });

  // Test: verifies that different status classes are applied correctly
  const statuses = ["warning", "good", "expired"];
  statuses.forEach(status => {
    test(`applies ${status} status class`, async () => {
      const notificationsMock = [{ id: 1, name: "Item", status }];
      axios.get.mockResolvedValueOnce({ data: notificationsMock });
      render(<Notification refreshFlag={0} />);
      await waitFor(() => {
        expect(screen.getByText(status)).toHaveClass(`status-${status}`);
      });
    });
  });

  // Test: component refetches notifications when refreshFlag prop changes
  test("refetches notifications when refreshFlag changes", async () => {
    axios.get.mockResolvedValueOnce({ data: [{ id: 1, name: "Milk" }] });
    const { rerender } = render(<Notification refreshFlag={0} />);
    await waitFor(() => screen.getByText("Milk"));

    // Update refreshFlag to trigger refetch
    axios.get.mockResolvedValueOnce({ data: [{ id: 2, name: "Eggs" }] });
    rerender(<Notification refreshFlag={1} />);
    await waitFor(() => screen.getByText("Eggs"));
  });

  // Test: delete button removes a notification and calls API
  test("deletes notification when delete button is clicked", async () => {
    // Mock API returning a single notification
    const notificationsMock = [
      { id: 1, name: "Milk", expiryStatus: "Expires in 2 days", status: "warning", notificationRead: false }
    ];

    // Mock GET and DELETE requests
    axios.get.mockResolvedValueOnce({ data: notificationsMock });
    axios.put.mockResolvedValueOnce({ data: { success: true } });

    // Render component
    render(<Notification refreshFlag={0} />);

    // Wait for notification to appear
    await waitFor(() => screen.getByText("Milk"));

    // Click the delete button
    const deleteButton = screen.getByTitle("Delete notification");
    fireEvent.click(deleteButton);

    // Verify axios PUT request was made with correct URL and params
    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        `${process.env.REACT_APP_API_BACKEND}/api/notifications/1/delete`,
        {},
        { params: { email: "test@example.com" } }
      );
    });

    // Verify that the notification is removed from the DOM
    await waitFor(() => {
      expect(screen.queryByText("Milk")).not.toBeInTheDocument();
    });
  });
});
