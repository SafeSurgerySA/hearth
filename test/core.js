 /**
 * Copyright (c) 2017-present, Jembi Health Systems NPC.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict'
const env = require('./test-env/init')()
const server = require('../lib/server')
const tap = require('tap')
const request = require('request')

const headers = env.getTestAuthHeaders(env.users.sysadminUser.email)
const testPatients = env.testPatients()

const basicCoreTest = (t, test) => {
  env.initDB((err, db) => {
    t.error(err)

    server.start((err) => {
      t.error(err)
      test(db, () => {
        env.clearDB((err) => {
          t.error(err)
          server.stop(() => {
            t.end()
          })
        })
      })
    })
  })
}

const requestAndAssertResponseOperationOutcome = (tp, t, done) => {
  // When
  request({
    url: `http://localhost:3447/fhir/Patient/${tp.id}`,
    headers: headers,
    json: true
  }, (err, res, body) => {
    // Then
    t.error(err)
    t.equal(res.statusCode, tp.statusCode, 'response status should match')

    t.equal(body.resourceType, 'OperationOutcome', 'Reponse body should be an Operation Outcome')
    t.equal(body.issue[0].severity, tp.expectedResponse.severity)
    t.equal(body.issue[0].code, tp.expectedResponse.code)
    t.equal(body.issue[0].details.text, tp.expectedResponse.details)
    done()
  })
}

tap.test('Core', { autoend: true }, (t) => {
  t.test('Read function', { autoend: true }, (t) => {
    t.test('should return 404 - not found when non existent patient is read', (t) => {
      basicCoreTest(t, (db, done) => {
        const expectedResponse = {
          severity: 'information',
          code: 'not-found',
          details: 'Not found'
        }

        const testParams = {
          id: 'non-existent-id',
          expectedResponse: expectedResponse,
          statusCode: 404
        }

        requestAndAssertResponseOperationOutcome(testParams, t, done)
      })
    })

    t.test('should return 410 - gone when a deleted patient is read', (t) => {
      const id = '1111111111'
      basicCoreTest(t, (db, done) => {
        const charlton = testPatients.charlton.patient
        charlton.id = id
        const cHistory = db.collection('Patient_history')
        cHistory.insertOne(charlton, (err, doc) => {
          t.error(err)
          t.ok(doc)

          const expectedResponse = {
            severity: 'information',
            code: 'gone',
            details: 'Gone'
          }

          const testParams = {
            id: id,
            expectedResponse: expectedResponse,
            statusCode: 410
          }

          requestAndAssertResponseOperationOutcome(testParams, t, done)
        })
      })
    })
  })

  t.test('Delete function', { autoend: true }, (t) => {
    t.test('should return 204 - no content when a patient is deleted', (t) => {
      const id = '1111111111'
      basicCoreTest(t, (db, done) => {
        const charlton = testPatients.charlton.patient
        charlton.id = id

        const c = db.collection('Patient')
        c.insertOne(charlton, (err, doc) => {
          t.error(err)

          request({
            url: `http://localhost:3447/fhir/Patient/${id}`,
            method: 'DELETE',
            headers: headers,
            json: true
          }, (err, res, body) => {
            t.error(err)
            t.equal(res.statusCode, 204)

            c.findOne({ id: id }, (err, doc) => {
              t.error(err)
              t.notOk(doc)

              const cHistory = db.collection('Patient_history')
              cHistory.findOne({ id: id }, (err, doc) => {
                t.error(err)
                t.ok(doc)
                t.equal(doc.id, id, 'Deleted doc should exist in history')

                done()
              })
            })
          })
        })
      })
    })

    t.test('should remove the resource history when the flag _purge=true', (t) => {
      const id = '1111111111'
      basicCoreTest(t, (db, done) => {
        const charlton = testPatients.charlton.patient
        charlton.id = id

        const c = db.collection('Patient')
        c.insertOne(charlton, (err, doc) => {
          t.error(err)

          request({
            url: `http://localhost:3447/fhir/Patient/${id}?_purge=true`,
            method: 'DELETE',
            headers: headers,
            json: true
          }, (err, res, body) => {
            t.error(err)
            t.equal(res.statusCode, 204)

            c.findOne({ id: id }, (err, doc) => {
              t.error(err)
              t.notOk(doc)

              const cHistory = db.collection('Patient_history')
              cHistory.findOne({ id: id }, (err, doc) => {
                t.error(err)
                t.notOk(doc, 'Deleted doc should not exist in history')

                done()
              })
            })
          })
        })
      })
    })

    t.test('should not remove the resource history when the flag _purge=false', (t) => {
      const id = '1111111111'
      basicCoreTest(t, (db, done) => {
        const charlton = testPatients.charlton.patient
        charlton.id = id

        const c = db.collection('Patient')
        c.insertOne(charlton, (err, doc) => {
          t.error(err)

          request({
            url: `http://localhost:3447/fhir/Patient/${id}?_purge=false`,
            method: 'DELETE',
            headers: headers,
            json: true
          }, (err, res, body) => {
            t.error(err)
            t.equal(res.statusCode, 204)

            c.findOne({ id: id }, (err, doc) => {
              t.error(err)
              t.notOk(doc)

              const cHistory = db.collection('Patient_history')
              cHistory.findOne({ id: id }, (err, doc) => {
                t.error(err)
                t.ok(doc)
                t.equal(doc.id, id, 'Deleted doc should exist in history')

                done()
              })
            })
          })
        })
      })
    })

    t.test('should return 204 - no content when a non existent patient is deleted', (t) => {
      basicCoreTest(t, (db, done) => {
        request({
          url: `http://localhost:3447/fhir/Patient/non-existent-id`,
          method: 'DELETE',
          headers: headers,
          json: true
        }, (err, res, body) => {
          t.error(err)
          t.equal(res.statusCode, 204)

          done()
        })
      })
    })
  })

  t.test('Match function', { autoend: true }, (t) => {
    const matchOperationBodyTemplate = {
      resourceType: 'Parameters',
      parameter: [
        {
          name: 'resource',
          resource: {
            resourceType: 'Binary'
          }
        }, {
          name: 'count',
          valueInteger: 100
        }
      ]
    }

    t.test('should return 400 if posted parameters resourceType is not of type Parameters', (t) => {
      // Given
      const testBody = Object.assign({}, matchOperationBodyTemplate)
      testBody.resourceType = 'Patient'
      basicCoreTest(t, (db, done) => {
        // When
        request({
          url: `http://localhost:3447/fhir/Patient/$match`,
          method: 'POST',
          body: testBody,
          headers: headers,
          json: true
        }, (err, res, body) => {
          // Then
          t.error(err)
          t.equal(res.statusCode, 400, 'response status code should be 400')
          t.equal(body.resourceType, 'OperationOutcome', 'Reponse body should be an Operation Outcome')
          t.equal(body.issue[0].severity, 'error')
          t.equal(body.issue[0].code, 'invalid')
          t.equal(body.issue[0].details.text, 'Expected Parameters resource type')
          done()
        })
      })
    })

    t.test('should return 400 if posted parameters resource has an unexpected parameter', (t) => {
      // Given
      const testBody = Object.assign({}, matchOperationBodyTemplate)
      testBody.parameter = testBody.parameter.concat([{ name: 'shouldNotExist' }])
      basicCoreTest(t, (db, done) => {
        // When
        request({
          url: `http://localhost:3447/fhir/Patient/$match`,
          method: 'POST',
          body: testBody,
          headers: headers,
          json: true
        }, (err, res, body) => {
          // Then
          t.error(err)
          t.equal(res.statusCode, 400, 'response status code should be 400')
          t.equal(body.resourceType, 'OperationOutcome', 'Reponse body should be an Operation Outcome')
          t.equal(body.issue[0].severity, 'error')
          t.equal(body.issue[0].code, 'invalid')
          t.equal(body.issue[0].details.text, 'Unexpected query parameter: shouldNotExist')
          done()
        })
      })
    })

    t.test('should return 400 if posted parameters resource no resource parameter', (t) => {
      // Given
      const testBody = Object.assign({}, matchOperationBodyTemplate)
      testBody.parameter = testBody.parameter.slice(1)
      basicCoreTest(t, (db, done) => {
        // When
        request({
          url: `http://localhost:3447/fhir/Patient/$match`,
          method: 'POST',
          body: testBody,
          headers: headers,
          json: true
        }, (err, res, body) => {
          // Then
          t.error(err)
          t.equal(res.statusCode, 400, 'response status code should be 400')
          t.equal(body.resourceType, 'OperationOutcome', 'Reponse body should be an Operation Outcome')
          t.equal(body.issue[0].severity, 'error')
          t.equal(body.issue[0].code, 'invalid')
          t.equal(body.issue[0].details.text, 'No resource parameter in parameters resource')
          done()
        })
      })
    })

    t.test('should return 400 if posted parameters resourceType does not match url resourceType', (t) => {
      // Given
      const testBody = Object.assign({}, matchOperationBodyTemplate)
      basicCoreTest(t, (db, done) => {
        // When
        request({
          url: `http://localhost:3447/fhir/Patient/$match`,
          method: 'POST',
          body: testBody,
          headers: headers,
          json: true
        }, (err, res, body) => {
          // Then
          t.error(err)
          t.equal(res.statusCode, 400, 'response status code should be 400')
          t.equal(body.resourceType, 'OperationOutcome', 'Reponse body should be an Operation Outcome')
          t.equal(body.issue[0].severity, 'error')
          t.equal(body.issue[0].code, 'invalid')
          t.equal(body.issue[0].details.text, 'Invalid resource type')
          done()
        })
      })
    })

    t.test('should return 400 if posted parameters resource resourceType does not have matching config', (t) => {
      // Given
      const testBody = Object.assign({}, matchOperationBodyTemplate)
      basicCoreTest(t, (db, done) => {
        // When
        request({
          url: `http://localhost:3447/fhir/Binary/$match`,
          method: 'POST',
          body: testBody,
          headers: headers,
          json: true
        }, (err, res, body) => {
          // Then
          t.error(err)
          t.equal(res.statusCode, 400, 'response status code should be 400')
          t.equal(body.resourceType, 'OperationOutcome', 'Reponse body should be an Operation Outcome')
          t.equal(body.issue[0].severity, 'error')
          t.equal(body.issue[0].code, 'invalid')
          t.equal(body.issue[0].details.text, 'Match operation not supported on resource type')
          done()
        })
      })
    })
  })

  t.test('Update function', { autoend: true }, (t) => {
    t.test('should update the patient resource even when missing if-match header', (t) => {
      basicCoreTest(t, (db, done) => {
        const resource = Object.assign({}, testPatients.charlton.patient)
        delete resource.id

        // save
        request.post({
          url: 'http://localhost:3447/fhir/Patient',
          headers: headers,
          body: resource,
          json: true
        }, (err, res, body) => {
          t.error(err)

          // update
          const id = res.headers.location.replace('/fhir/Patient/', '').replace(/\/_history\/.*/, '')
          const initialVersionId = res.headers.location.replace(/\/fhir\/Patient\/.*\/_history\//, '')

          // prep input object for update operation
          const updatedPerson = Object.assign({}, testPatients.charlton.patient)
          updatedPerson.meta = {}
          updatedPerson.meta.versionId = initialVersionId
          updatedPerson.id = id

          request.put({
            url: `http://localhost:3447/fhir/Patient/${id}`,
            headers: headers,
            body: updatedPerson,
            json: true
          }, (err, res) => {
            t.error(err)

            // pull versionId from location header to verify that the ETag header is being set properly
            const versionId = res.headers.location.replace(/\/fhir\/Patient\/.*\/_history\//, '')
            t.equal(res.headers.etag, `W/"${versionId}"`)

            // pull id from location header and test that it matches original id
            const resultId = res.headers.location.replace('/fhir/Patient/', '').replace(/\/_history\/.*/, '')
            t.equal(resultId, id)

            t.equal(res.statusCode, 200, 'response status code should be 200')
            done()
          })
        })
      })
    })

    t.test('should fail to update the patient resource due to invalid if-match header', (t) => {
      basicCoreTest(t, (db, done) => {
        const resource = Object.assign({}, testPatients.charlton.patient)
        delete resource.id

        // save
        request.post({
          url: 'http://localhost:3447/fhir/Patient',
          headers: headers,
          body: resource,
          json: true
        }, (err, res, body) => {
          t.error(err)

          // update
          const id = res.headers.location.replace('/fhir/Patient/', '').replace(/\/_history\/.*/, '')
          const initialVersionId = res.headers.location.replace(/\/fhir\/Patient\/.*\/_history\//, '')

          // prep headers and input object for update operation
          const updatedPerson = Object.assign({}, testPatients.charlton.patient)
          updatedPerson.meta = {}
          updatedPerson.meta.versionId = initialVersionId
          updatedPerson.id = id
          headers['If-Match'] = `W/"invalid-test"`

          request.put({
            url: `http://localhost:3447/fhir/Patient/${id}`,
            headers: headers,
            body: updatedPerson,
            json: true
          }, (err, res) => {
            t.error(err)
            t.equal(res.statusMessage, 'Conflict')
            t.equal(res.statusCode, 409, 'response status code should be 409')
            done()
          })
        })
      })
    })

    t.test('should update the patient resource and return etag header', (t) => {
      basicCoreTest(t, (db, done) => {
        const resource = Object.assign({}, testPatients.charlton.patient)
        delete resource.id

        // save
        request.post({
          url: 'http://localhost:3447/fhir/Patient',
          headers: headers,
          body: resource,
          json: true
        }, (err, res, body) => {
          t.error(err)

          // update
          const id = res.headers.location.replace('/fhir/Patient/', '').replace(/\/_history\/.*/, '')
          const initialVersionId = res.headers.location.replace(/\/fhir\/Patient\/.*\/_history\//, '')

          // prep headers and input for update operation
          const updatedPerson = Object.assign({}, testPatients.charlton.patient)
          updatedPerson.meta = {}
          updatedPerson.meta.versionId = initialVersionId
          updatedPerson.id = id
          headers['If-Match'] = `W/"${initialVersionId}"`

          request.put({
            url: `http://localhost:3447/fhir/Patient/${id}`,
            headers: headers,
            body: updatedPerson,
            json: true
          }, (err, res) => {
            t.error(err)

            // pull versionId from location header to verify that the ETag header is being set properly
            const versionId = res.headers.location.replace(/\/fhir\/Patient\/.*\/_history\//, '')
            t.equal(res.headers.etag, `W/"${versionId}"`)

            // pull id from location header and test that it matches original id
            const resultId = res.headers.location.replace('/fhir/Patient/', '').replace(/\/_history\/.*/, '')
            t.equal(resultId, id)

            t.equal(res.statusCode, 200, 'response status code should be 200')
            done()
          })
        })
      })
    })
  })
})
