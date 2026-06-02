import { useEffect, useRef, useState } from "react";
import { Observable, BehaviorSubject, tap } from "rxjs";
import { skip } from "rxjs/operators";

type Source<T> = BehaviorSubject<T> | Observable<T>
type ObservableSource<T> = Source<T> | undefined
type Factory<T> = () => ObservableSource<T>
type Input<T> = ObservableSource<T> | Factory<T>

// A value is "observable-like" if it exposes pipe/subscribe — this is what lets us tell a
// real source (including the @livequery/rpc callable Proxy, which is a function that ALSO
// exposes pipe/subscribe/getValue) apart from a plain lazy factory `() => source`.
const isObservableLike = (x: unknown): x is Source<any> =>
    !!x && (typeof x === 'object' || typeof x === 'function')
    && (typeof (x as any).pipe === 'function' || typeof (x as any).subscribe === 'function')

const isBehaviorSubject = <T>(source: unknown): source is BehaviorSubject<T> => {
    return isObservableLike(source) && typeof (source as any).getValue === 'function'
}

const hasPipe = <T>(source: unknown): source is Source<T> => {
    return typeof (source as Partial<Observable<T>> | undefined)?.pipe === 'function'
}

export function useObservable<T>(o: BehaviorSubject<T>): T
export function useObservable<T>(o: Input<T>): T | undefined
export function useObservable<T>(o: Input<T>, default_value: T): T

// `o` is either the source directly (BehaviorSubject / Observable, incl. the callable RPC
// proxy) or a lazy factory `() => source`. A plain function WITHOUT pipe/subscribe is treated
// as a factory and resolved exactly once — so it subscribes a single time even when the caller
// passes a fresh arrow on every render. While there is no value yet the hook returns
// `default_value` (or `undefined`).
export function useObservable<T>(o: Input<T>, default_value?: T) {
    const isFactory = typeof o === 'function' && !isObservableLike(o)
    const resolved = useRef<{ source: ObservableSource<T> } | null>(null)
    if (isFactory && !resolved.current) resolved.current = { source: (o as Factory<T>)() }
    const source = isFactory ? resolved.current!.source : (o as ObservableSource<T>)

    const prev = useRef(source)
    const withDefault = (value: T | null | undefined): T | undefined =>
        value ?? default_value
    const [v, s] = useState<T | undefined>(() =>
        withDefault(isBehaviorSubject<T>(source) ? source.getValue() : default_value),
    )

    useEffect(() => {
        const diff = prev.current !== source
        prev.current = source

        if (!hasPipe(source)) return

        const subscription = source.pipe(
            skip(isBehaviorSubject(source) && !diff ? 1 : 0),
            tap((value) => s(withDefault(value as T | null | undefined))),
        ).subscribe()
        return () => {
            subscription.unsubscribe()
        }
    }, [source])

    return v
}
