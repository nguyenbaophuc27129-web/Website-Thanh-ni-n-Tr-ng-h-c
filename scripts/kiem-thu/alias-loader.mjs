// Nạp bằng `node --import ./scripts/kiem-thu/alias-loader.mjs` để node thuần chạy được mã trong src/:
// giải alias "@/..." → src/... và thêm đuôi .ts/.tsx/index.ts cho import không ghi đuôi.
import { register } from "node:module";

register("./alias-hooks.mjs", import.meta.url);
