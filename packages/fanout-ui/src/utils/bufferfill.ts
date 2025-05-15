import { Buffer as BufferPolyfill } from "buffer";

if (typeof window !== "undefined") {
  window.Buffer = BufferPolyfill;
} else {
  global.Buffer = BufferPolyfill;
}