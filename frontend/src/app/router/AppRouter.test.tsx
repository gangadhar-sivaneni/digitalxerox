import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppRouter } from "./AppRouter";
import { SESSION_STORAGE_KEY } from "../../constants";
import type { Role, Session } from "../../types";

function makeSession(role: Role, name?: string): Session {
  return {
    token: "tok-" + role.toLowerCase(),
    user: {
      userId: "u-" + role.toLowerCase(),
      name: name ?? role.charAt(0) + role.slice(1).toLowerCase() + " User",
      email: (role.toLowerCase() === "student" ? "gangadhar@mlrit.ac.in" : role.toLowerCase() + "@mlrit.ac.in"),
      role,
      active: true,
      createdAt: new Date().toISOString(),
    },
  };
}

function route(url: string, method: string) {
  return method + " " + url;
}

function mockFetch(routes: Record<string, (body?: unknown) => unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const raw = String(url);
      const method = (init?.method ?? "GET").toUpperCase();
      const key = route(raw, method);
      const handle = routes[key];
      if (!handle) return new Response(JSON.stringify({ data: null }), { status: 404 });
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      return new Response(
        JSON.stringify({ data: handle(body) }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    })
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  window.location.hash = "";
});

describe("route guards", () => {
  it("redirects an unauthenticated visitor from /student to /login", async () => {
    mockFetch({});
    window.location.hash = "#/student";
    render(<AppRouter />);
    await waitFor(() => expect(window.location.hash).toMatch(/^#\/login/));
  });

  it("bounces a staff session away from student pages to /staff", async () => {
    const staff = makeSession("STAFF", "Ravi Kumar");
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(staff));
    mockFetch({
      "GET /api/auth/me": () => staff,
    });
    window.location.hash = "#/student";
    render(<AppRouter />);
    await waitFor(() => expect(window.location.hash).toMatch(/^#\/staff/));
  });

  it("bounces an admin session away from student pages to /admin", async () => {
    const admin = makeSession("ADMIN", "Suman Iyer");
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(admin));
    mockFetch({
      "GET /api/auth/me": () => admin,
    });
    window.location.hash = "#/student";
    render(<AppRouter />);
    await waitFor(() => expect(window.location.hash).toMatch(/^#\/admin/));
  });

  it("locks the landing page for a signed-in user (logo never drops them home)", async () => {
    const staff = makeSession("STAFF", "Ravi Kumar");
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(staff));
    mockFetch({
      "GET /api/auth/me": () => staff,
    });
    window.location.hash = "#/";
    render(<AppRouter />);
    await waitFor(() => expect(window.location.hash).toMatch(/^#\/staff/));
  });
});

describe("login flow", () => {
  it("signs a student in and lands on the student dashboard", async () => {
    const student = makeSession("STUDENT", "Arjun Menon");
    mockFetch({
      "POST /api/auth/login": () => student,
    });
    window.location.hash = "#/login";
    render(<AppRouter />);

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => expect(window.location.hash).toMatch(/^#\/student/));
  });
});