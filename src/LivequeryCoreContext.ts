import type { LivequeryCore } from "@livequery/core";
import { createContextFromHook } from "./createContextFromHook.js";

export const [useLivequeryCore, LivequeryCoreProvider] = createContextFromHook(
    (props: { core: any }) => props.core as LivequeryCore
)
