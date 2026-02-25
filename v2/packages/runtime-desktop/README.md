# @gcs/runtime-desktop

Tauri desktop adapter for GCS v2. **Deferred** -- will be implemented after
runtime-web reaches parity gates.

This package will:
- Wrap the native Rust core (no WASM, direct FFI via Tauri commands)
- Provide the same contract interface as runtime-web
- Enable desktop-specific features (file system access, native menus)

