import {start, adapt, adapt1} from '../src/semicoroutine'

describe('semicoroutine', () => {
    beforeEach(() => {
        jasmine.clock().install()
        jasmine.clock().mockDate()
    })
    afterEach(() => {
        jasmine.clock().uninstall()
    })

    it('adapts a node-style continuation-passing-style function', () => {
        let r = 0
        
        function cpsFunction(a, b, next) {
            expect(r).toBe(0)
            expect(a).toBe(1)
            expect(b).toBe(2)
            r += 1
            next(null, a + b, a, b)
        }
        
        let adaptedFunction = adapt(cpsFunction)
        
        start(function*() {
            expect(r).toBe(0)
            let [i, j, k] = yield adaptedFunction(1, 2)
            expect(i).toBe(3)
            expect(j).toBe(1)
            expect(k).toBe(2)
            expect(r).toBe(1)
        })
        
        jasmine.clock().tick()
        expect(r).toBe(1)
    })
    
    it('adapts a node-style continuation-passing-style function that always gives 1 result', () => {
        let r = 0
        
        function cpsFunction(a, b, next) {
            expect(r).toBe(0)
            expect(a).toBe(1)
            expect(b).toBe(2)
            r += 1
            next(null, a + b)
        }
        
        let adaptedFunction = adapt1(cpsFunction)
        
        start(function*() {
            expect(r).toBe(0)
            let result = yield adaptedFunction(1, 2)
            expect(result).toBe(3)
            expect(r).toBe(1)
        })
        
        jasmine.clock().tick()
        expect(r).toBe(1)
    })

    it('adapts a generator function to continuation-passing-style', () => {
        let r = 0
        
        let adapted = adapt(function*() {
            expect(r).toBe(0)
            return 3
        })
        
        adapted((err, result) => {
            expect(err).not.toBeDefined()
            r = result
        })
        
        jasmine.clock().tick()
        expect(r).toBe(3)
    })

    it('adapts a generator function that takes parameters', () => {
        let r = 0
        
        const adaptation = adapt(function*(a, b) {
            expect(a).toBe(1)
            expect(b).toBe(-8)
            r += 1
            return -3
        })
        
        adaptation(1, -8, (err, result) => {
            expect(err).not.toBeDefined()
            expect(result).toBe(-3)
        })
        expect(r).toBe(0)
        jasmine.clock().tick()
        expect(r).toBe(1)
    })
})
