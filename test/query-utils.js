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

const tap = require('tap')

const queryUtils = require('../lib/fhir/query-utils')()

tap.test('.validateAndParseQueryParams should validate searchParams', (t) => {
  let queryParams = { test1: '1', test2: 2 }
  let supported = {
    test1: { allowArray: true, required: false, modifiers: { exact: true } },
    test2: { allowArray: false, required: false, modifiers: { exact: true } },
    test3: { }
  }

  queryUtils.validateAndParseQueryParams(queryParams, supported, (badRequest, queryObject) => {
    t.error(badRequest)
    const expected = {
      test1: {
        'no-modifier': '1'
      },
      test2: {
        'no-modifier': 2
      }
    }
    t.deepEqual(queryObject, expected, 'Should return queryObject if query params are supported')
  })

  queryParams = { test1: '1' }
  supported = {
    test1: { allowArray: true, required: true, modifiers: { exact: true } },
    test2: { allowArray: true, required: true, modifiers: { exact: true } },
    test3: { required: false, modifiers: { exact: true } }
  }

  queryUtils.validateAndParseQueryParams(queryParams, supported, (badRequest, queryObject) => {
    t.ok(badRequest)
    t.equal(badRequest, `This endpoint has the following required query parameters: ["test1","test2"]`, 'Should return error message if required params are missing')
  })

  queryParams = { 'test1:exact': '1' }
  supported = {
    test1: { modifiers: { exact: true } }
  }

  queryUtils.validateAndParseQueryParams(queryParams, supported, (badRequest, queryObject) => {
    t.error(badRequest)
    const expected = {
      test1: {
        exact: '1'
      }
    }
    t.deepEqual(queryObject, expected, 'Should return a queryObject when a valid modifier is supplied')
  })

  queryParams = { 'test1:fakemodifier': '1' }
  supported = {
    test1: { modifiers: { exact: true } }
  }

  queryUtils.validateAndParseQueryParams(queryParams, supported, (badRequest, queryObject) => {
    t.ok(badRequest)
    t.deepEqual(badRequest, 'This endpoint has the following query parameter: \'test1\' which does not allow for the \':fakemodifier\' modifier', 'Should return error message if modifier is not supported')
  })

  t.end()
})

tap.test('.tokenToSystemValueElemMatch should match token to system and value according to FHIR spec', (t) => {
  let token = 'test:assigning:auth|123456'
  let split = token.split('|')
  let expected = { identifier: { $elemMatch: { system: split[0], value: split[1] } } }
  let actual = queryUtils.tokenToSystemValueElemMatch('identifier', token)
  t.deepEqual(actual, expected, 'Single system|value token')

  token = [ 'test:assigning:auth|123456', 'another:assigning:auth|111111' ]
  split = []
  token.forEach((t) => {
    split = split.concat(t.split('|'))
  })
  expected = { $and: [
    { identifier: { $elemMatch: { system: split[0], value: split[1] } } },
    { identifier: { $elemMatch: { system: split[2], value: split[3] } } }
  ] }
  actual = queryUtils.tokenToSystemValueElemMatch('identifier', token)
  t.deepEqual(actual, expected, 'Multiple system|value tokens')

  token = '123456'
  expected = { identifier: { $elemMatch: { value: token } } }
  actual = queryUtils.tokenToSystemValueElemMatch('identifier', token)
  t.deepEqual(actual, expected, 'Single value without system token')

  token = [ '123456', '111111' ]
  expected = { $and: [
    { identifier: { $elemMatch: { value: token[0] } } },
    { identifier: { $elemMatch: { value: token[1] } } }
  ] }
  actual = queryUtils.tokenToSystemValueElemMatch('identifier', token)
  t.deepEqual(actual, expected, 'Multiple value without system tokens')

  token = '|123456'
  split = token.split('|')
  expected = { identifier: { $elemMatch: { system: { $exists: false }, value: split[1] } } }
  actual = queryUtils.tokenToSystemValueElemMatch('identifier', token)
  t.deepEqual(actual, expected, 'Single value with non existent system token')

  t.end()
})

tap.test('.removeIdentifiersFromTokens should remove identifier part of token query parameter', (t) => {
  let token = 'test:assigning:auth|123456'
  let expected = 'test:assigning:auth|'
  let actual = queryUtils.removeIdentifiersFromTokens(token)
  t.deepEqual(actual, expected)

  token = 'domain1|,domain2|'
  expected = 'domain1|,domain2|'
  actual = queryUtils.removeIdentifiersFromTokens(token)
  t.deepEqual(actual, expected)

  token = [ 'domain1|,domain2|', 'test1|1111' ]
  expected = [ 'domain1|,domain2|', 'test1|' ]
  actual = queryUtils.removeIdentifiersFromTokens(token)
  t.deepEqual(actual, expected)

  token = [ '11111', 'test1|1111', 'test2|2222' ]
  expected = [ 'test1|', 'test2|' ]
  actual = queryUtils.removeIdentifiersFromTokens(token)
  t.deepEqual(actual, expected)

  t.end()
})
