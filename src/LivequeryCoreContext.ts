import type { LivequeryClient } from "@livequery/client";
import { createContextFromHook } from "./createContextFromHook.js";

export const [useLivequeryCore, LivequeryCoreProvider] = createContextFromHook(
    (props: { core: any }) => props.core as LivequeryClient
)
