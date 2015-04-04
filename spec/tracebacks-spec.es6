import {start, clear} from '../src/semicoroutine'
import {curry} from 'ramda'

describe('tracebacks', () => {
    beforeEach(() => {
        jasmine.clock().install()
        jasmine.clock().mockDate()
    })
    afterEach(() => {
        jasmine.clock().uninstall()
        clear()
    })

    it('does not lose tracebacks when calling continuation-passing style function', () => {
        let a = 0
        let asyncA = function*(arg) {
            console.log('a')
            expect(a).toBe(0)
            a += 1
            yield asyncB(arg)
        }
        let asyncB = function*(arg) {
            console.log('b')
            expect(a).toBe(1)
            a += 1
            yield cpsA(arg)
        }
        let cpsA = curry((arg, next) => {
            expect(a).toBe(2)
            a += 1
            expect(arg).toBe(2)
            setTimeout(next => { throw new Error() }, 10)
        })

        start(
            asyncA(2),
            (err, result) => {
                expect(a).toBe(3)
                a += 1
                console.log(err.stack)
                expect(err).toBeDefined()
                expect(result).not.toBeDefined()
                expect(err.stack).toContain('asyncB')
            }
        )

        jasmine.clock().tick(10)
        expect(a).toBe(4)
        jasmine.clock().tick(10)
        expect(a).toBe(4)
    })
})
