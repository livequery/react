import type { LivequeryClient } from "@livequery/client";
import { createContextFromHook } from "./createContextFromHook.js";

export const [useLivequeryClient, LivequeryClientProvider] = createContextFromHook(
    (props: { core: any }) => props.core as LivequeryClient
)
