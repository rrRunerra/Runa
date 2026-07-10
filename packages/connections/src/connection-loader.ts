import path from "path";
import { glob } from "glob";
import { ConnectionDependencies } from "./types.js";
import { BaseConnection } from "./base-connection.js";
import { ConnectionProvider } from "@runa/database";

export class ConnectionLoader {
  private readonly connections = new Map<ConnectionProvider, BaseConnection>();

  constructor(private readonly deps: ConnectionDependencies) {}

  public async loadConnections(): Promise<Map<ConnectionProvider, BaseConnection>> {
    // Resolve the providers directory relative to the current file
    let currentDir = "";
    if (typeof __dirname !== "undefined") {
      currentDir = __dirname;
    } else {
      try {
        // Use a dynamic evaluator to prevent compiler/Jest parsing errors on import.meta
        const metaUrl = new Function("return import.meta.url")();
        currentDir = path.dirname(new URL(metaUrl).pathname);
      } catch {
        currentDir = process.cwd();
      }
    }
    
    const providersDir = path.join(currentDir, "providers");

    // Standardize path for glob (forward slashes are required)
    const globPattern = path.join(providersDir, "**/*.{ts,js}").replace(/\\/g, "/");
    const files = await glob(globPattern);

    for (const file of files) {
      const absolutePath = path.resolve(file);
      
      // Skip tests and type definitions
      if (
        absolutePath.includes(".spec.") || 
        absolutePath.includes(".test.") || 
        absolutePath.endsWith(".d.ts")
      ) {
        continue;
      }

      try {
        // Use require() in CJS context so all modules share the same module cache.
        // Dynamic import() creates a separate ESM module instance, which breaks
        // `instanceof BaseConnection` since the prototype chains differ.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        let module: any = require(absolutePath);
        // require() returns the module exports directly for CJS, but if it wraps
        // an ESM default export we might get { default: Class }
        const ConnectionClass = module.default ?? module;

        if (
          ConnectionClass && 
          typeof ConnectionClass === "function" && 
          ConnectionClass.prototype instanceof BaseConnection
        ) {
          const instance = new ConnectionClass(this.deps) as BaseConnection;
          
          // Verify that all required environment variables are present
          const missingKeys = instance.requiredEnvKeys.filter(
            (key) => !this.deps.env[key]
          );

          if (missingKeys.length > 0) {
            console.warn(
              `[ConnectionLoader] Disabling provider ${instance.providerKey} due to missing environment variables: ${missingKeys.join(", ")}`
            );
            instance.isEnabled = false;
          }

          this.connections.set(instance.providerKey, instance);
        }
      } catch (err) {
        console.error(`[ConnectionLoader] Failed to load connection file: ${absolutePath}`, err);
      }
    }

    return this.connections;
  }

  public getConnections(): Map<ConnectionProvider, BaseConnection> {
    return this.connections;
  }

  public getConnection(provider: ConnectionProvider): BaseConnection | undefined {
    return this.connections.get(provider);
  }
}
