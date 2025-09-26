/* Author: Gift Mabokela
   Event: Sprint 1
   LatestUpdate: 2025/09/19
   Description: Frontend unit tests for Bulk Upload component
   Returns: Test results for React component rendering and user interactions
*/

// -------------------- Imports --------------------
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";

// -------------------- Mocks --------------------
const API_BACKEND = 'https://foodsave-backend-2hnb.onrender.com';

// Mock the environment variable before importing the component
process.env.REACT_APP_API_BACKEND = API_BACKEND;

// Mock fetch globally
global.fetch = jest.fn();

// Mock File object to simulate uploads
global.File = class MockFile {
  constructor(content, fileName, options) {
    this.content = content;
    this.name = fileName;
    this.lastModified = Date.now();
    this.type = options?.type || "";
  }
};

// Mock FormData
global.FormData = jest.fn(() => ({
  append: jest.fn(),
}));

// Import the component AFTER setting the environment variable
import BulkUpload from "../database/BulkUpload";

// -------------------- Test Suite --------------------
describe("BulkUpload Component", () => {
  const mockUser = { email: "test@example.com" };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset fetch mock
    global.fetch.mockClear();
    
    // Reset FormData
    global.FormData.mockClear();
    global.FormData.mockImplementation(() => ({
      append: jest.fn(),
    }));
  });

  /*  Renders Bulk Upload form correctly */
  test("renders Bulk Upload form correctly", () => {
    render(<BulkUpload currentUser={mockUser} />);

    expect(screen.getByText(/Bulk Upload Excel/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /upload/i })).toBeInTheDocument();

    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveClass("bulk-input");
  });

  /* Shows error for non-Excel files */
  test("shows error for non-Excel files", async () => {
    const file = new File(["dummy"], "test.txt", { type: "text/plain" });

    render(<BulkUpload currentUser={mockUser} />);
    const fileInput = document.querySelector('input[type="file"]');

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(
        screen.getByText(/Invalid file type/i)
      ).toBeInTheDocument();
    });
  });

  /* Handles successful file upload */
  test("handles successful file upload", async () => {
    const file = new File(["dummy"], "test.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    // Mock successful fetch response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ count: 5, message: "Items uploaded successfully" }),
    });

    render(<BulkUpload currentUser={mockUser} />);
    const fileInput = document.querySelector('input[type="file"]');
    const uploadButton = screen.getByRole("button", { name: /upload/i });

    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BACKEND}/api/bulkupload`,
        expect.objectContaining({
          method: "POST",
          body: expect.any(Object),
        })
      );
    });

    // Check success message
    const success = await screen.findByText(/5 items uploaded successfully/i);
    expect(success).toBeInTheDocument();
  });

  /* Shows error message when upload fails */
  test("shows error message when upload fails", async () => {
    const file = new File(["dummy"], "test.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    // Mock failed fetch response
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Validation failed" }),
    });

    render(<BulkUpload currentUser={mockUser} />);
    const fileInput = document.querySelector('input[type="file"]');
    const uploadButton = screen.getByRole("button", { name: /upload/i });

    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Validation failed/i)
      ).toBeInTheDocument();
    });
  });

  /* Shows server error message when fetch rejects */
  test("shows server error message when fetch rejects", async () => {
    const file = new File(["dummy"], "test.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    // Mock fetch rejection
    global.fetch.mockRejectedValueOnce(new Error("Network error"));

    render(<BulkUpload currentUser={mockUser} />);
    const fileInput = document.querySelector('input[type="file"]');
    const uploadButton = screen.getByRole("button", { name: /upload/i });

    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Server error: Network error/i)
      ).toBeInTheDocument();
    });
  });

  /* Calls fetch when uploading file */
  test("calls fetch when uploading file", async () => {
    const file = new File(["dummy"], "test.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    // Mock successful fetch response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ count: 5, message: "Items uploaded successfully" }),
    });

    render(<BulkUpload currentUser={mockUser} />);
    const fileInput = document.querySelector('input[type="file"]');
    const uploadButton = screen.getByRole("button", { name: /upload/i });

    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});