import { NextResponse } from "next/server";
import { getBackendServers, createServer, deleteServer, getServer, replaceServer, setServerState, getConfigurationVersion } from "@/services/haproxy";
import { ensureAuthenticated } from "@/lib/serverAuth";

/**
 * GET /api/haproxy/backend/servers?parentName=app_be
 * Fetches backend server configuration from HAProxy Data Plane API.
 * Returns: array of server configurations with name, address, port, check status, etc.
 */
export async function GET(req: Request) {
  // enforce auth
  const authError = await ensureAuthenticated(req);
  if (authError) return authError;

  const url = new URL(req.url);
  const parentName = url.searchParams.get("parentName");

  if (!parentName) {
    return NextResponse.json(
      { error: "missing_parameter", message: "parentName query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const servers = await getBackendServers(parentName);
    return NextResponse.json(servers);
  } catch (err) {
    return NextResponse.json(
      { error: "fetch_error", message: String(err) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/haproxy/backend/servers
 * Creates a new server in a backend.
 * Body: { backendName: string, name: string, address: string, port: number, check?: boolean }
 */
export async function POST(req: Request) {
  // enforce auth
  const authError = await ensureAuthenticated(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { backendName, name, address, port, check } = body;

    // Validate required fields
    if (!backendName || typeof backendName !== "string") {
      return NextResponse.json(
        { error: "invalid_parameter", message: "backendName is required and must be a string" },
        { status: 400 }
      );
    }

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "invalid_parameter", message: "name is required and must be a string" },
        { status: 400 }
      );
    }

    if (!address || typeof address !== "string") {
      return NextResponse.json(
        { error: "invalid_parameter", message: "address is required and must be a string" },
        { status: 400 }
      );
    }

    if (!port || typeof port !== "number") {
      return NextResponse.json(
        { error: "invalid_parameter", message: "port is required and must be a number" },
        { status: 400 }
      );
    }

    // Get current configuration version
    const version = await getConfigurationVersion();

    // Create server in HAProxy
    const result = await createServer(
      backendName.trim(),
      name.trim(),
      address.trim(),
      port,
      version,
      check !== false // default to true if not specified
    );

    return NextResponse.json({
      success: true,
      message: "Server created successfully in HAProxy",
      data: result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "server_error", message: String(err) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/haproxy/backend/servers
 * Deletes a server from a backend.
 * Body: { backendName: string, name: string }
 */
export async function DELETE(req: Request) {
  // enforce auth
  const authError = await ensureAuthenticated(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { backendName, name } = body;

    // Validate required fields
    if (!backendName || typeof backendName !== "string") {
      return NextResponse.json(
        { error: "invalid_parameter", message: "backendName is required and must be a string" },
        { status: 400 }
      );
    }

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "invalid_parameter", message: "name is required and must be a string" },
        { status: 400 }
      );
    }

    // Get current configuration version
    const version = await getConfigurationVersion();

    // Delete server from HAProxy
    const result = await deleteServer(
      backendName.trim(),
      name.trim(),
      version
    );

    return NextResponse.json({
      success: true,
      message: "Server deleted successfully from HAProxy",
      data: result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "server_error", message: String(err) },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/haproxy/backend/servers
 * Renames a server in a backend by replacing it with updated data.
 * Body: { backendName: string, oldName: string, newName: string }
 */
export async function PUT(req: Request) {
  // enforce auth
  const authError = await ensureAuthenticated(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { backendName, oldName, newName } = body;

    // Validate required fields
    if (!backendName || typeof backendName !== "string") {
      return NextResponse.json(
        { error: "invalid_parameter", message: "backendName is required and must be a string" },
        { status: 400 }
      );
    }

    if (!oldName || typeof oldName !== "string") {
      return NextResponse.json(
        { error: "invalid_parameter", message: "oldName is required and must be a string" },
        { status: 400 }
      );
    }

    if (!newName || typeof newName !== "string") {
      return NextResponse.json(
        { error: "invalid_parameter", message: "newName is required and must be a string" },
        { status: 400 }
      );
    }

    // Get current configuration version
    const version = await getConfigurationVersion();

    // Fetch existing server details
    const existingServer = await getServer(backendName.trim(), oldName.trim());

    // Create new server data with updated name
    const newServerData = {
      ...existingServer,
      name: newName.trim(),
    };

    // Replace the server in HAProxy (this effectively renames it)
    const result = await replaceServer(
      backendName.trim(),
      oldName.trim(),
      newServerData,
      version
    );

    return NextResponse.json({
      success: true,
      message: "Server renamed successfully in HAProxy",
      data: result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "server_error", message: String(err) },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/haproxy/backend/servers
 * Changes the admin state of a server at runtime (ready, drain, maint).
 * Body: { backendName: string, serverName: string, adminState: "ready" | "drain" | "maint" }
 */
export async function PATCH(req: Request) {
  // enforce auth
  const authError = await ensureAuthenticated(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { backendName, serverName, adminState } = body;

    // Validate required fields
    if (!backendName || typeof backendName !== "string") {
      return NextResponse.json(
        { error: "invalid_parameter", message: "backendName is required and must be a string" },
        { status: 400 }
      );
    }

    if (!serverName || typeof serverName !== "string") {
      return NextResponse.json(
        { error: "invalid_parameter", message: "serverName is required and must be a string" },
        { status: 400 }
      );
    }

    const validStates = ["ready", "drain", "maint"];
    if (!adminState || !validStates.includes(adminState)) {
      return NextResponse.json(
        { error: "invalid_parameter", message: `adminState must be one of: ${validStates.join(", ")}` },
        { status: 400 }
      );
    }

    // Set server state at runtime
    const result = await setServerState(
      backendName.trim(),
      serverName.trim(),
      adminState
    );

    return NextResponse.json({
      success: true,
      message: `Server "${serverName}" state changed to "${adminState}"`,
      data: result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "server_error", message: String(err) },
      { status: 500 }
    );
  }
}
