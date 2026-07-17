// ---------------------------------------------------------------------------
// Lacerta: Chunked E2EE Upload constants
// ---------------------------------------------------------------------------

/** Size of each plaintext chunk before encryption (32 MiB) */
export const LACERTA_CHUNK_SIZE_BYTES = 32 * 1024 * 1024;

/** Maximum number of chunks uploaded in parallel to the backend */
export const LACERTA_UPLOAD_CONCURRENCY = 4;

/**
 * IndexedDB object store name for persisting upload manifests.
 * Allows uploads to be resumed across page reloads and browser crashes.
 */
export const LACERTA_UPLOAD_MANIFEST_STORE = 'lacerta_upload_manifests';
