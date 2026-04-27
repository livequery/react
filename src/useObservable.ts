import { useEffect, useState } from "react";
import { Observable, BehaviorSubject, tap, EMPTY } from "rxjs";

/**
 * Accepts either a value or a lazy factory returning that value.
 */
export type MaybeFunction<T> = T | (() => T)

/**
 * Subscribes to an RxJS observable and mirrors its latest value into React state.
 *
 * When a `BehaviorSubject` is provided, the hook uses `getValue()` for the initial render.
 * When a factory is provided, the observable is resolved lazily inside the effect.
 *
 * @param o Observable source or factory returning the source.
 * @param default_value Fallback value used before the first emission when the source is not a `BehaviorSubject`.
 * @returns The latest value emitted by the source.
 */
export const useObservable = <T extends any>(o: MaybeFunction<BehaviorSubject<T> | Observable<T>>, default_value?: T) => {
    const [v, s] = useState<T>(typeof (o as any)?.['getValue'] === 'function' ? (o as any).getValue() : (default_value as T))
    useEffect(() => {
        try {
            const target = (typeof o === 'function' ? o() : o) || EMPTY
            const subscription = target.pipe(
                tap(value => {
                    s(value)
                })
            ).subscribe()
            return () => {
                subscription.unsubscribe()
            }
        } catch (e) { }
    }, typeof o === 'function' ? [] : [o])
    return v
}