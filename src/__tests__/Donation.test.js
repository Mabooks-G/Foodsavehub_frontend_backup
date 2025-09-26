// Donation.test.js
import React from "react";
import { render, screen } from "@testing-library/react";
import Donations from "../donation_coordination/Donations";

// ✅ Mock Donor & Charity components so we don’t depend on their logic
jest.mock("../donation_coordination/donor", () => () => <div>Mock Donor</div>);
jest.mock("../donation_coordination/charity", () => () => <div>Mock Charity</div>);

// ✅ Mock Supabase client
jest.mock("../supabaseClient", () => {
  return {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        data: [{ id: 1, name: "Test Donation" }],
        error: null,
      })),
    })),
  };
});

describe("Donations component", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("renders loading state when currentUser is null", () => {
    render(<Donations currentUser={null} />);
    expect(screen.getByText(/Loading user info/i)).toBeInTheDocument();
  });

  test("renders loading state when stakeholderID is missing", () => {
    render(<Donations currentUser={{}} />);
    expect(screen.getByText(/Loading user info/i)).toBeInTheDocument();
  });

  test("renders Donor with userType=User when stakeholderID starts with 'h'", () => {
    const user = { stakeholderID: "h123" };
    render(<Donations currentUser={user} />);
    expect(screen.getByText("Mock Donor")).toBeInTheDocument();
  });

  test("renders Donor with userType=Business when stakeholderID starts with 'b'", () => {
    const user = { stakeholderID: "b456" };
    render(<Donations currentUser={user} />);
    expect(screen.getByText("Mock Donor")).toBeInTheDocument();
  });

  test("renders Charity when stakeholderID starts with 'c'", () => {
    const user = { stakeholderID: "c789" };
    render(<Donations currentUser={user} />);
    expect(screen.getByText("Mock Charity")).toBeInTheDocument();
  });

  test("renders Invalid user type when stakeholderID has wrong prefix", () => {
    const user = { stakeholderID: "x000" };
    render(<Donations currentUser={user} />);
    expect(screen.getByText(/Invalid user type/i)).toBeInTheDocument();
  });
});
