import type { LivequeryClient } from "@livequery/client";
import { createContextFromHook } from "./createContextFromHook.js";

// The provider now carries both the client (`core`) and an optional `context` —
// an arbitrary bag forwarded with every collection operation down to the
// transporter's onRequest hook (e.g. { account_id } for per-tab multi-account).
const [useLivequeryRoot, LivequeryClientProvider] = createContextFromHook(
    (props: { core: any, context?: Record<string, any> }) => ({
        core: props.core as LivequeryClient,
        context: props.context as Record<string, any> | undefined
    })
)

export { LivequeryClientProvider }
export const useLivequeryClient = () => useLivequeryRoot().core
export const useLivequeryContext = () => useLivequeryRoot().context
