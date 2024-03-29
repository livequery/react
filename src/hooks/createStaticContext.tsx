"use client"

import { createContextFromHook } from './createContextFromHook.js'
export const createStaticContext = <T extends {}>() => createContextFromHook((props: { value: T }) => props.value) 