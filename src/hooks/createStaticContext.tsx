import { createContextFromHook } from './createContextFromHook'
export const createStaticContext = <T extends {}>() => createContextFromHook((props: { value: T }) => props.value) 