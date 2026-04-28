import { useEffect, useRef, useState } from "react";
import { Observable, BehaviorSubject, tap, EMPTY } from "rxjs";
import { skip } from "rxjs/operators";

export type MaybeFunction<T> = T | (() => T)

type ObservableSource<T> = MaybeFunction<BehaviorSubject<T> | Observable<T>> | undefined

export function useObservable<T>(o: BehaviorSubject<T>): T
export function useObservable<T>(o: ObservableSource<T>): T | undefined
export function useObservable<T>(o: ObservableSource<T>, default_value: T): T

export function useObservable<T>(o: MaybeFunction<T>, default_value?: T) {
    const prev = useRef(o)
    const $ = o as any as BehaviorSubject<T> || EMPTY
    const isBehaviorSubject =typeof o == 'object' &&  typeof $.getValue === 'function'
    const dfv = isBehaviorSubject ? $.getValue() : default_value
    const [v, s] = useState<T | undefined>(dfv)
    useEffect(() => {
        const diff = prev.current !== o
        prev.current = o
        try {
            const subscription = $.pipe(
                skip(isBehaviorSubject && !diff ? 1 : 0),
                tap(s)
            ).subscribe()
            return () => {
                subscription.unsubscribe()
            }
        } catch (e) { }
    }, typeof o === 'function' ? [] : [o])

    return v
}