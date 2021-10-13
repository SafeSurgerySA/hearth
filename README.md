[![Build and Publish Docker Image](https://github.com/SafeSurgerySA/hearth/actions/workflows/build-publish-docker-image.yml/badge.svg)](https://github.com/SafeSurgerySA/hearth/actions/workflows/build-publish-docker-image.yml)  
[![codecov](https://codecov.io/gh/jembi/hearth/branch/master/graph/badge.svg)](https://codecov.io/gh/jembi/hearth)  

# Hearth
HEARTH (noun): the floor of a '[FHIR](http://hl7.org/fhir/)'place. A fast FHIR-compliant server focused on longitudinal data stores.

This project aims to provide a fast and lightweight FHIR server that also supports some of the FHIR-based IHE profiles. It is still in the early stages of development, follow the project to stay informed.

We do our best to update this project when we have projects with funding that are using it. Any contributions are welcomed and encouraged! Help us make this something great.

# Documentation
For more information regarding the capabilities of Hearth and how to get working with it please refer to the [wiki documentation](https://github.com/jembi/hearth/wiki)

# Usage

## Using docker compose

**Note:** Requires [docker](https://docs.docker.com/install/) and [docker-compose](https://docs.docker.com/compose/install/) to be installed

Download the [docker compose file from here](./docker-compose.yml), then execute to following in the directory you downloaded it to:

`docker-compose up`

Once started the fhir endpoint will be available on your system at this url: `http://localhost:3447/fhir/`

## For development
To run in development mode use the following commands. First Mongo needs to be available on your system. The easiest way to do this is through docker:

**Note:** Requires mongo 3.6+

```
docker run --name hearth-mongo -d -p 27017:27017 mongo
```
Install dependencies
```
yarn
```
Now start the server in dev mode (which uses a dev namespaced database)
```
yarn dev:start
```
otherwise for production just run:
```
yarn start
```

The default FHIR version is STU3 as set in the config files (we don't yet support R4), to change this either change the config files or make use of overriding config variable via environment variables:
```
server__fhirVersion=dstu2 yarn start
```

To run the tests:
```
yarn test
```

View the possible config fields [here](https://github.com/jembi/hearth/blob/master/config/default.json).

# Pro dev tips:
* To run only specific test files use `yarn test:these-files test/pdqm.js`.
* Run `yarn cov` to show coverage details in your browser.
