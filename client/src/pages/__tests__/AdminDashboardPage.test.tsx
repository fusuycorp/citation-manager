import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminDashboardPage } from "../AdminDashboardPage";
import { AuthContext, AuthContextType } from "../../context/AuthContext";

const mockMetrics = {
  totalUsers: 42,
  totalCitations: 180,
  orphanCitations: 5,
  activeDomains: 12,
};

const mockDomains = [
  { id: "dom-1", domain: "@mit.edu", policyType: "EXACT" },
  { id: "dom-2", domain: "*.ac.uk", policyType: "WILDCARD" },
];

const mockUsers = [
  {
    id: "u-1",
    email: "alice@mit.edu",
    firstName: "Alice",
    lastName: "Smith",
    displayName: "Alice Smith",
    role: "admin",
    ownedCitationsCount: 15,
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "u-2",
    email: "bob@oxford.ac.uk",
    firstName: "Bob",
    lastName: "Jones",
    displayName: "Bob Jones",
    role: "user",
    ownedCitationsCount: 3,
    createdAt: "2026-02-01T00:00:00Z",
  },
];

const mockDuplicates = [
  {
    id: "c1_c2",
    sourceId: "c1",
    sourceTitle: "Attention Is All You Need",
    targetId: "c2",
    targetTitle: "Attention Is All You Need (Copy)",
    matchReason: "Exact DOI Match (10.48550/arXiv.1706.03762)",
    score: 1.0,
  },
];

const mockAuditLogs = [
  {
    id: "log-1",
    admin_email: "alice@mit.edu",
    action: "DOMAIN_ADD",
    target: "@mit.edu",
    created_at: "2026-08-20T10:00:00Z",
  },
];

const defaultAuthContext: AuthContextType = {
  user: { id: "u-1", email: "alice@mit.edu", role: "admin" },
  token: "admin-jwt-token",
  login: vi.fn(),
  logout: vi.fn(),
  updateUser: vi.fn(),
  isAuthenticated: true,
};

function renderWithAuth(
  ui: React.ReactElement,
  authContextOverride: Partial<AuthContextType> = {}
) {
  const authValue: AuthContextType = {
    ...defaultAuthContext,
    ...authContextOverride,
  };
  return render(
    <AuthContext.Provider value={authValue}>
      {ui}
    </AuthContext.Provider>
  );
}

function setupFetchMocks(customOverrides: { duplicates?: any[] } = {}) {
  const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    const urlStr = url.toString();
    const method = init?.method || "GET";

    if (urlStr.includes("/api/admin/metrics")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ metrics: mockMetrics }),
      });
    }

    if (urlStr.includes("/api/admin/domains")) {
      if (method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ message: "Domain added to whitelist" }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ domains: mockDomains }),
      });
    }

    if (urlStr.includes("/api/admin/users") && method === "PUT") {
      return Promise.resolve({
        ok: true,
        json: async () => ({ message: "User updated" }),
      });
    }

    if (urlStr.includes("/api/admin/users")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ users: mockUsers }),
      });
    }

    if (urlStr.includes("/api/admin/duplicates")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ duplicates: customOverrides.duplicates ?? mockDuplicates }),
      });
    }

    if (urlStr.includes("/api/admin/audit-logs")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ auditLogs: mockAuditLogs }),
      });
    }

    return Promise.resolve({
      ok: true,
      json: async () => ({}),
    });
  });

  global.fetch = fetchMock as any;
  return fetchMock;
}

describe("AdminDashboardPage", () => {
  const mockShowToast = vi.fn();
  const mockOnBackToDashboard = vi.fn();

  beforeEach(() => {
    mockShowToast.mockClear();
    mockOnBackToDashboard.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders header, KPI metrics, and calls back navigation handler", async () => {
    setupFetchMocks();

    renderWithAuth(
      <AdminDashboardPage
        token="admin-test-token"
        showToast={mockShowToast}
        onBackToDashboard={mockOnBackToDashboard}
      />
    );

    expect(screen.getByText(/System Administrative Control Portal/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument(); // totalUsers
      expect(screen.getByText("180")).toBeInTheDocument(); // totalCitations
      expect(screen.getByText("5")).toBeInTheDocument(); // orphanCitations
      expect(screen.getByText("12")).toBeInTheDocument(); // activeDomains
    });

    const backBtn = screen.getByRole("button", { name: /Back to User Dashboard/i });
    fireEvent.click(backBtn);
    expect(mockOnBackToDashboard).toHaveBeenCalledTimes(1);
  });

  it("renders duplicate citations using sourceTitle in Duplicates Scanner tab (verifies schema bug fix)", async () => {
    setupFetchMocks();

    renderWithAuth(
      <AdminDashboardPage
        token="admin-test-token"
        showToast={mockShowToast}
        onBackToDashboard={mockOnBackToDashboard}
      />
    );

    // Wait for initial data load
    await waitFor(() => {
      expect(screen.getByText(/Duplicates Scanner/i)).toBeInTheDocument();
    });

    // Click Duplicates Scanner tab
    const duplicatesTabBtn = screen.getByRole("button", { name: /Duplicates Scanner/i });
    fireEvent.click(duplicatesTabBtn);

    // Verify tab heading
    expect(screen.getByText(/Citation Duplicate Resolution Scanner/i)).toBeInTheDocument();

    // Verify that dup.sourceTitle is rendered correctly
    await waitFor(() => {
      expect(screen.getByText("Attention Is All You Need")).toBeInTheDocument();
      expect(screen.getByText(/Exact DOI Match/i)).toBeInTheDocument();
      expect(screen.getByText(/Target: Attention Is All You Need \(Copy\)/i)).toBeInTheDocument();
    });
  });

  it("renders empty state in Duplicates Scanner when no duplicates exist", async () => {
    setupFetchMocks({ duplicates: [] });

    renderWithAuth(
      <AdminDashboardPage
        token="admin-test-token"
        showToast={mockShowToast}
        onBackToDashboard={mockOnBackToDashboard}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Duplicates Scanner/i)).toBeInTheDocument();
    });

    const duplicatesTabBtn = screen.getByRole("button", { name: /Duplicates Scanner/i });
    fireEvent.click(duplicatesTabBtn);

    await waitFor(() => {
      expect(
        screen.getByText("No duplicate citations detected in database directory.")
      ).toBeInTheDocument();
    });
  });

  it("switches to Domain Whitelist tab and adds a new domain policy", async () => {
    const fetchMock = setupFetchMocks();
    const user = userEvent.setup();

    renderWithAuth(
      <AdminDashboardPage
        token="admin-test-token"
        showToast={mockShowToast}
        onBackToDashboard={mockOnBackToDashboard}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Domain Whitelist/i)).toBeInTheDocument();
    });

    const domainsTabBtn = screen.getByRole("button", { name: /Domain Whitelist/i });
    fireEvent.click(domainsTabBtn);

    await waitFor(() => {
      expect(screen.getByText("@mit.edu")).toBeInTheDocument();
      expect(screen.getByText("*.ac.uk")).toBeInTheDocument();
    });

    // Fill domain input
    const input = screen.getByPlaceholderText(/Domain pattern/i);
    await user.type(input, "@stanford.edu");

    // Submit form
    const addBtn = screen.getByRole("button", { name: /Add Domain Policy/i });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/domains",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ domain: "@stanford.edu", policyType: "EXACT" }),
        })
      );
      expect(mockShowToast).toHaveBeenCalledWith("Domain policy '@stanford.edu' added");
    });
  });

  it("switches to Master User List tab, filters users, and toggles user role", async () => {
    const fetchMock = setupFetchMocks();
    const user = userEvent.setup();

    renderWithAuth(
      <AdminDashboardPage
        token="admin-test-token"
        showToast={mockShowToast}
        onBackToDashboard={mockOnBackToDashboard}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Master User List/i)).toBeInTheDocument();
    });

    const usersTabBtn = screen.getByRole("button", { name: /Master User List/i });
    fireEvent.click(usersTabBtn);

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
      expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    });

    // Test Search Filter
    const searchInput = screen.getByPlaceholderText(/Search user email or name/i);
    await user.type(searchInput, "Alice");

    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.queryByText("Bob Jones")).not.toBeInTheDocument();

    // Toggle Role for Alice (admin -> user)
    const demoteBtn = screen.getByRole("button", { name: /Demote to User/i });
    fireEvent.click(demoteBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/users/u-1/role",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ role: "user" }),
        })
      );
      expect(mockShowToast).toHaveBeenCalledWith("User role updated to user");
    });
  });

  it("switches to System Audit Logs tab and renders audit trails", async () => {
    setupFetchMocks();

    renderWithAuth(
      <AdminDashboardPage
        token="admin-test-token"
        showToast={mockShowToast}
        onBackToDashboard={mockOnBackToDashboard}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/System Audit Logs/i)).toBeInTheDocument();
    });

    const auditTabBtn = screen.getByRole("button", { name: /System Audit Logs/i });
    fireEvent.click(auditTabBtn);

    await waitFor(() => {
      expect(screen.getByText("alice@mit.edu")).toBeInTheDocument();
      expect(screen.getByText("DOMAIN_ADD")).toBeInTheDocument();
      expect(screen.getByText("@mit.edu")).toBeInTheDocument();
    });
  });
});
