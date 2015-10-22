import {start} from '..'

describe('semicoroutine - promises', () => {
    it('yields until a promise has resolved', done => {
        let a = 0
        start(function*() {
            expect(a).toBe(0)
            a += 1
            let yieldment = yield new Promise((resolve, reject) => {
                expect(a).toBe(1)
                setTimeout(() => {
                    expect(a).toBe(1)
                    resolve('qwer')
                }, 10)
            })
            expect(yieldment).toBe('qwer')
            expect(a).toBe(1)
            a += 1
        }, done)

        expect(a).toBe(0)
    })

    it('yields until a promise has rejected', done => {
        let a = 0
        start(function*() {
            expect(a).toBe(0)
            a += 1
            try {
                let yieldment = yield new Promise((resolve, reject) => {
                    expect(a).toBe(1)
                    setTimeout(() => {
                        expect(a).toBe(1)
                        reject('qwer')
                    }, 10)
                })
            }
            catch(rejection) {
                expect(rejection).toBe('qwer')
                expect(a).toBe(1)
                a += 1
                return
            }
            fail()
        }, done)

        expect(a).toBe(0)
    })
})
