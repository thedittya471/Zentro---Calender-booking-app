export function readDatabaseConfig(env: NodeJS.ProcessEnv) {
  const nodeEnv = env.NODE_ENV ?? "development";
  if (!["development", "test", "production"].includes(nodeEnv)) {
    throw new Error("Invalid NODE_ENV");
  }
  const connectionString = env.DATABASE_URL ?? "";
  let url: URL;
  try {
    url = new URL(connectionString);
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !url.hostname ||
      !url.username ||
      !url.password ||
      url.pathname.length < 2 ||
      url.hash ||
      [...url.searchParams.keys()].some((key) => key !== "sslmode") ||
      url.searchParams.getAll("sslmode").length > 1 ||
      (url.searchParams.has("sslmode") &&
        !["disable", "verify-full"].includes(
          url.searchParams.get("sslmode") ?? "",
        )) ||
      (nodeEnv === "production" &&
        url.searchParams.get("sslmode") === "disable")
    )
      throw new Error();
    decodeURIComponent(url.username);
    decodeURIComponent(url.password);
    decodeURIComponent(url.pathname);
  } catch {
    throw new Error("Invalid DATABASE_URL");
  }
  const maxText = env.DB_POOL_MAX ?? "10";
  const max = Number(maxText);
  if (
    !/^\d+$/.test(maxText) ||
    !Number.isInteger(max) ||
    max < 1 ||
    max > 100
  ) {
    throw new Error("Invalid DB_POOL_MAX");
  }
  return {
    connectionString,
    max,
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 10000,
    statement_timeout: 5000,
    idle_in_transaction_session_timeout: 5000,
    ssl:
      nodeEnv === "production" ||
      url.searchParams.get("sslmode") === "verify-full"
        ? { rejectUnauthorized: true }
        : false,
  };
}
