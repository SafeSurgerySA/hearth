/*
 BSD 3-Clause License
 Copyright (c) 2017, Jembi Health Systems NPC
 All rights reserved.

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:

 * Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

 * Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

 * Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

'use strict'
const env = require('./test-env/init')()
const tap = require('tap')

// test the tester

tap.test('test-env/init.initDB should create a mongo connection', (t) => {
  env.initDB((err, db) => {
    t.error(err)
    t.ok(db)
    let c = db.collection('tmp')
    c.insert({test: 'test'}, (err) => {
      t.error(err)

      c.findOne({test: 'test'}, (err, obj) => {
        t.error(err)

        t.ok(obj)
        t.equal(obj.test, 'test')

        env.clearDB((err) => {
          t.error(err)
          t.end()
        })
      })
    })
  })
})

tap.test('test-env/init.clearDB should drop the test db', (t) => {
  env.initDB((err, db) => {
    t.error(err)
    let c = db.collection('tmp')
    c.insert({test: 'test'}, (err) => {
      t.error(err)

      env.clearDB((err) => {
        t.error(err)

        env.initDB((err, db) => {
          t.error(err)
          let c2 = db.collection('tmp')

          c2.findOne({test: 'test'}, (err, obj) => {
            t.error(err)

            t.notOk(obj)

            env.clearDB((err) => {
              t.error(err)
              t.end()
            })
          })
        })
      })
    })
  })
})
