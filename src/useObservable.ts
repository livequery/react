import { useEffect, useRef, useState } from "react";
import { Observable, BehaviorSubject, tap } from "rxjs";
import { skip } from "rxjs/operators";

export type MaybeFunction<T> = T | (() => T)

type Source<T> = BehaviorSubject<T> | Observable<T>
type ObservableSource<T> = MaybeFunction<Source<T>> | undefined

const isBehaviorSubject = <T>(source: Source<T> | undefined): source is BehaviorSubject<T> => {
    return typeof (source as Partial<BehaviorSubject<T>> | undefined)?.getValue === 'function'
}

const hasPipe = <T>(source: Source<T> | undefined): source is Source<T> => {
    return typeof (source as Partial<Observable<T>> | undefined)?.pipe === 'function'
}

export function useObservable<T>(o: BehaviorSubject<T>): T
export function useObservable<T>(o: ObservableSource<T>): T | undefined
export function useObservable<T>(o: ObservableSource<T>, default_value: T): T

export function useObservable<T>(o: ObservableSource<T>, default_value?: T) {
    const lazySource = useRef<Source<T> | undefined>(undefined)
    const source = typeof o === 'function'
        ? lazySource.current ?? (lazySource.current = o())
        : o
    const prev = useRef(source)
    const [v, s] = useState<T | undefined>(() => isBehaviorSubject(source) ? source.getValue() : default_value)

    useEffect(() => {
        const diff = prev.current !== source
        prev.current = source

        if (!hasPipe(source)) return

        const subscription = source.pipe(
            skip(isBehaviorSubject(source) && !diff ? 1 : 0),
            tap(s)
        ).subscribe()
        return () => {
            subscription.unsubscribe()
        }
    }, typeof o === 'function' ? [] : [o])

    return v
}