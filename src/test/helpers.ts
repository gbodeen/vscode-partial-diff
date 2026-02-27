import * as td from 'testdouble';
import * as assert from 'assert';

export function mock<T>(c: new (...args: any[]) => T): T {
    return new (td.constructor(c));
}

export function mockType<T extends object>(params?: Partial<T>): T {
    return Object.assign({}, params) as T;
}

export function mockMethods<T extends object>(methods: string[], params?: Partial<T>): T {
    return Object.assign(td.object(methods) as object, params) as T;
}

export const verify = td.verify;
export const when = td.when;
export const contains = td.matchers.contains;
export const any = td.matchers.anything;

export function wrapVerify(invokeCallback: (...args: any[]) => void, expectedCalls: any[][] | {[key: string]: any[]}) {
    const captors = [td.matchers.captor(), td.matchers.captor(), td.matchers.captor()];

    invokeCallback(...captors.map(captor => captor.capture));

    const toIndex = (key: string) => parseInt(key.replace('call', ''), 10);

    Object.entries(expectedCalls).forEach(([key, value]) => {
        const callIndex = toIndex(key);
        (value as any[]).forEach((expectedArg, argIndex) => {
            const failureMessage = `Check argument ${argIndex} of call ${callIndex}`;
            assert.deepEqual(captors[argIndex].values![callIndex], expectedArg, failureMessage);
        });
    });
}
