import path from "path";
import { glob } from "glob";
import { pathToFileURL } from "url";
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
        let module: any;
        
        // Multi-fallback import resolver to handle CJS (Jest), ESM, and Windows paths
        try {
          module = await import(absolutePath);
        } catch (importErr) {
          try {
            const fileUrl = pathToFileURL(absolutePath).href;
            module = await import(fileUrl);
          } catch (urlImportErr) {
            // Fallback for CommonJS context (like Jest with custom resolver)
            module = require(absolutePath);
          }
        }

        const ConnectionClass = module.default;

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
