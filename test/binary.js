'use strict'
const tap = require('tap')
const request = require('request')
const mongodb = require('mongodb')

const env = require('./test-env/init')()
const server = require('../lib/server')

const binaryResource = require('./resources/Binary-1')
const headers = env.getTestAuthHeaders(env.users.sysadminUser.email)

let binaryTestEnv = (t, test) => {
  env.initDB((err, db) => {
    t.error(err)

    server.start((err) => {
      t.error(err)

      env.createResource(t, env.testBinaryFiles().doc1, 'Binary', (err, ref1) => { // contenttype = application/json
        t.error(err)
        env.createResource(t, env.testBinaryFiles().doc2, 'Binary', (err, ref2) => { // contenttype = application/pdf
          t.error(err)
          env.createResource(t, env.testBinaryFiles().doc3, 'Binary', (err, ref3) => { // contenttype = application/pdf
            t.error(err)
            env.createResource(t, env.testBinaryFiles().doc4, 'Binary', (err, ref4) => { // contenttype = application/xml
              t.error(err)
              test(db, [ref1, ref2, ref3, ref4], () => {
                env.clearDB((err) => {
                  t.error(err)
                  server.stop(() => {
                    t.end()
                  })
                })
              })
            })
          })
        })
      })
    })
  })
}

tap.test('Binary - should return all results when there are no parameters', (t) => {
  // given
  binaryTestEnv(t, (db, refs, done) => {
    request({
      url: 'http://localhost:3447/fhir/Binary',
      headers: headers,
      json: true
    }, (err, res, body) => {
      // then
      t.error(err)

      t.equal(res.statusCode, 200, 'response status code should be 200')
      t.ok(body)
      t.equals(4, body.total, 'total should be four')
      t.equals('Bundle', body.resourceType, 'should return a Bundle')
      t.equals('Binary', body.entry[0].resource.resourceType, 'should return a resource of type Binary')
      t.equals('Binary', body.entry[1].resource.resourceType, 'should return a resource of type Binary')
      t.equals('Binary', body.entry[2].resource.resourceType, 'should return a resource of type Binary')
      t.equals('Binary', body.entry[3].resource.resourceType, 'should return a resource of type Binary')
      done()
    })
  })
})

tap.test('Binary - should search by contentType', (t) => {
  // given
  binaryTestEnv(t, (db, refs, done) => {
    request({
      url: 'http://localhost:3447/fhir/Binary?contenttype=application/pdf',
      headers: headers,
      json: true
    }, (err, res, body) => {
      // then
      t.error(err)

      t.equal(res.statusCode, 200, 'response status code should be 200')
      t.ok(body)
      t.equals(2, body.total, 'total should be two')
      t.equals('Bundle', body.resourceType, 'should return a Bundle')
      t.equals('Binary', body.entry[0].resource.resourceType, 'should return a resource of type Binary')
      t.equals('Binary', body.entry[1].resource.resourceType, 'should return a resource of type Binary')
      t.equals('application/pdf', body.entry[0].resource.contentType, 'should return a contentType of application/pdf')
      t.equals('application/pdf', body.entry[1].resource.contentType, 'should return a contentType of application/pdf')
      done()
    })
  })
})

tap.test('Binary - should search by contentType - none found', (t) => {
  // given
  binaryTestEnv(t, (db, refs, done) => {
    request({
      url: 'http://localhost:3447/fhir/Binary?contenttype=application/x-binary',
      headers: headers,
      json: true
    }, (err, res, body) => {
      // then
      t.error(err)

      t.equal(res.statusCode, 200, 'response status code should be 200')
      t.ok(body)
      t.equals(0, body.total, 'total should be zero')
      t.equals('Bundle', body.resourceType, 'should return a Bundle')
      done()
    })
  })
})

tap.test('Binary - should fail for invalid Binary resource ID', (t) => {
  // given
  binaryTestEnv(t, (db, refs, done) => {
    request({
      url: 'http://localhost:3447/fhir/Binary/77ssssssssssssssssssssss',
      headers: headers,
      json: true
    }, (err, res, body) => {
      // then
      t.error(err)

      t.equal(res.statusCode, 404, 'response status code should be 404')
      t.ok(body)
      t.equals('not-found', body.issue[0].code, 'should return binary "not-found"')
      t.equals('OperationOutcome', body.resourceType, 'should return a OperationOutcome')
      done()
    })
  })
})

tap.test('Binary - should search for a specific Binary document', (t) => {
  // given
  binaryTestEnv(t, (db, refs, done) => {
    request({
      url: 'http://localhost:3447/fhir/Binary?contenttype=application/xml',
      headers: headers,
      json: true
    }, (err, res, searchBody) => {
      // then
      t.error(err)

      request({
        url: `http://localhost:3447/fhir/Binary/${searchBody.entry[0].resource.id}`,
        headers: headers,
        json: true
      }, (err, res, readBody) => {
        // then
        t.error(err)

        t.equal(res.statusCode, 200, 'response status code should be 200')
        t.ok(readBody)
        t.ok(readBody.content, 'should have field "content"')
        t.equals('Binary', readBody.resourceType, 'should return a resource of type Binary')
        t.equals('application/xml', readBody.contentType, 'should return a contentType of application/xml')
        done()
      })
    })
  })
})

tap.test('Binary - preInteractionHandlers.create - should insert binary data', (t) => {
  // given
  env.initDB((err, db) => {
    t.error(err)

    server.start((err) => {
      t.error(err)

      // when
      request.post({
        url: 'http://localhost:3447/fhir/Binary',
        headers: headers,
        body: binaryResource,
        json: true
      }, (err, res, body) => {
        // then
        t.error(err)

        t.equal(res.statusCode, 201, 'response status code should be 200')

        let c = db.collection('Binary')
        c.findOne({}, {}, (err, doc) => {
          t.error(err)

          t.equal(doc.latest.resourceType, 'Binary')
          t.equal(doc.latest.contentType, 'image/jpg')
          t.equal(doc.latest.content, undefined)
          t.ok(doc.latest._transforms.content, 'Binary resource successfully inserted')

          var bucket = new mongodb.GridFSBucket(db)
          let data = ''

          bucket.openDownloadStream(doc.latest._transforms.content)
          .on('data', (chunk) => {
            data += chunk
          })
          .on('error', (err) => {
            t.error(err)
          })
          .on('end', () => {
            t.equal(data, binaryResource.content, 'GridFS returns expected binary data')
            env.clearDB((err) => {
              t.error(err)
              server.stop(() => {
                t.end()
              })
            })
          })
        })
      })
    })
  })
})

tap.test('Binary - preInteractionHandlers.update - should update reference to binary data', (t) => {
  // given
  env.initDB((err, db) => {
    t.error(err)

    server.start((err) => {
      t.error(err)

      // when
      request.post({
        url: 'http://localhost:3447/fhir/Binary',
        headers: headers,
        body: binaryResource,
        json: true
      }, (err, res, body) => {
        // then
        t.error(err)
        t.equal(res.statusCode, 201, 'response status code should be 201')

        let c = db.collection('fs.files')
        c.findOne({}, {}, (err, doc) => {
          t.error(err)
          let firstFileRef = String(doc._id)

          let c = db.collection('Binary')
          c.findOne({}, {}, (err, doc) => {
            t.error(err)

            let idToUpdate = String(doc._id)
            let br = JSON.parse(JSON.stringify(binaryResource))
            br.id = idToUpdate
            br.contentType = 'image/jpeg'
            request.put({
              url: 'http://localhost:3447/fhir/Binary/' + idToUpdate,
              headers: headers,
              body: br,
              json: true
            }, (err, res, body) => {
              // then
              t.error(err)
              t.equal(res.statusCode, 200, 'response status code should be 200')

              let c = db.collection('Binary')
              c.findOne({ _id: doc._id }, {}, (err, doc) => {
                t.error(err)

                t.equal(doc.latest.resourceType, 'Binary')
                t.equal(doc.latest.contentType, 'image/jpeg')
                t.equal(doc.latest.content, undefined)
                t.equal('' + doc.history['1'].resource._transforms.content, firstFileRef, 'Binary resource history saved')

                let c = db.collection('fs.files')
                c.findOne({ _id: doc.latest._transforms.content }, {}, (err, file) => {
                  t.error(err)
                  t.ok(file, 'Binary resource link updated')

                  env.clearDB((err) => {
                    t.error(err)
                    server.stop(() => {
                      t.end()
                    })
                  })
                })
              })
            })
          })
        })
      })
    })
  })
})

tap.test('Binary - preInteractionHandlers writeToGridFS - should return bad request when no content in binary resource', (t) => {
  // given
  env.initDB((err, db) => {
    t.error(err)

    server.start((err) => {
      t.error(err)

      // when
      let testResource = JSON.parse(JSON.stringify(binaryResource))
      delete testResource.content
      request.post({
        url: 'http://localhost:3447/fhir/Binary',
        headers: headers,
        body: testResource,
        json: true
      }, (err, res, body) => {
        // then
        t.error(err)
        t.equal(res.statusCode, 400, 'response status code should be 400')
        t.equal(body.issue[0].severity, 'error', 'Should return correct issue severity')
        t.equal(body.issue[0].code, 'invalid', 'Should return correct issue code')
        t.equal(body.issue[0].details.text, 'No content in binary resource', 'Should return correct issue text')

        env.clearDB((err) => {
          t.error(err)
          server.stop(() => {
            t.end()
          })
        })
      })
    })
  })
})

tap.test('Binary - postInteractionHandlers.read - should fetch binary resource with binary data in content property', (t) => {
  // given
  binaryTestEnv(t, (db, refs, done) => {
    request({
      url: 'http://localhost:3447/fhir/Binary?contenttype=application/xml',
      headers: headers,
      json: true
    }, (err, res, searchBody) => {
      // then
      t.error(err)

      // check request binary data is same as original data
      request({
        url: `http://localhost:3447/fhir/Binary/${searchBody.entry[0].resource.id}`,
        headers: headers,
        json: true
      }, (err, res, readBody) => {
        // then
        t.error(err)

        t.equal(res.statusCode, 200, 'response status code should be 200')
        t.ok(readBody)
        t.ok(readBody.content, 'should have field "content"')
        t.equals(env.testBinaryFiles().doc4.content, readBody.content, 'should have same binary content as original insert document')
        done()
      })
    })
  })
})

tap.test('Binary - postInteractionHandlers.search - should fetch searched binary resources with binary data in content property', (t) => {
  // given
  binaryTestEnv(t, (db, refs, done) => {
    request({
      url: 'http://localhost:3447/fhir/Binary?contenttype=application/pdf',
      headers: headers,
      json: true
    }, (err, res, body) => {
      // then
      t.error(err)

      t.equal(res.statusCode, 200, 'response status code should be 200')
      t.ok(body)
      t.equals(2, body.total, 'total should be two')
      t.equals('Bundle', body.resourceType, 'should return a Bundle')

      t.equals(refs[1], `Binary/${body.entry[0].resource.id}`, 'should return the correct resource')
      t.equals('Binary', body.entry[0].resource.resourceType, 'should return a resource of type Binary')
      t.equals(refs[2], `Binary/${body.entry[1].resource.id}`, 'should return the correct resource')
      t.equals('Binary', body.entry[1].resource.resourceType, 'should return a resource of type Binary')
      t.equals('application/pdf', body.entry[0].resource.contentType, 'should return a contentType of application/pdf')
      t.equals('application/pdf', body.entry[1].resource.contentType, 'should return a contentType of application/pdf')

      t.equals(env.testBinaryFiles().doc2.content, body.entry[0].resource.content, 'should have same binary content as original insert document')
      t.equals(env.testBinaryFiles().doc3.content, body.entry[1].resource.content, 'should have same binary content as original insert document')
      done()
    })
  })
})