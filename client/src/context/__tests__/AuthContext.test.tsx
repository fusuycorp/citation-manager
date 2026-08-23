import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, renderHook, act, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth, User } from "../AuthContext";

const mockUser: User = {
  id: "user-123",
  email: "researcher@university.edu",
  firstName: "Jane",
  lastName: "Doe",
  role: "user",
};

describe("AuthContext and AuthProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ user: mockUser }),
      } as Response)
    );
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("throws an error when useAuth is called outside of AuthProvider", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow("useAuth must be used within an AuthProvider");

    consoleError.mockRestore();
  });

  it("provides initial unauthenticated state when localStorage has no token", () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("fetches and sets user data when token exists in localStorage", async () => {
    localStorage.setItem("citation_token", "saved-jwt-token");

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    expect(result.current.token).toBe("saved-jwt-token");

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/auth/me", {
      headers: { Authorization: "Bearer saved-jwt-token" },
    });
  });

  it("handles expired or invalid token on initial load", async () => {
    localStorage.setItem("citation_token", "invalid-expired-token");

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: "Session expired" }),
    } as Response);

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorage.getItem("citation_token")).toBeNull();
    });
  });

  it("handles network error when validating token on initial load", async () => {
    localStorage.setItem("citation_token", "network-fail-token");

    global.fetch = vi.fn().mockRejectedValueOnce(new Error("Network Error"));

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorage.getItem("citation_token")).toBeNull();
    });
  });

  it("successfully logs in a user and updates state and localStorage", async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await act(async () => {
      result.current.login(mockUser, "new-jwt-token");
    });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe("new-jwt-token");
      expect(result.current.isAuthenticated).toBe(true);
      expect(localStorage.getItem("citation_token")).toBe("new-jwt-token");
    });
  });

  it("successfully logs out a user and clears state and localStorage", async () => {
    localStorage.setItem("citation_token", "existing-jwt-token");

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    await act(async () => {
      result.current.logout();
    });

    await waitFor(() => {
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorage.getItem("citation_token")).toBeNull();
    });
  });

  it("updates user profile state via updateUser", async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await act(async () => {
      result.current.login(mockUser, "dummy-token");
    });

    const updatedUser: User = {
      ...mockUser,
      firstName: "Janet",
      role: "admin",
    };

    await act(async () => {
      result.current.updateUser(updatedUser);
    });

    expect(result.current.user).toEqual(updatedUser);
    expect(result.current.user?.firstName).toBe("Janet");
    expect(result.current.user?.role).toBe("admin");
  });

  it("renders child components within AuthProvider", () => {
    const TestConsumer = () => {
      const { isAuthenticated } = useAuth();
      return <div>{isAuthenticated ? "Logged In" : "Logged Out"}</div>;
    };

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByText("Logged Out")).toBeInTheDocument();
  });
});
