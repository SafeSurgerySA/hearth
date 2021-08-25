FROM node:14.17.5-alpine3.14 as build
RUN apk update && apk add --no-cache build-base python3 py3-pip
WORKDIR /app
COPY package.json yarn.lock /app/
RUN yarn install --frozen-lockfile --production && cd node_modules/libxmljs && yarn install

FROM node:14.17.5-alpine3.14
WORKDIR /app
COPY --from=build /app/node_modules /app/node_modules/
COPY package.json yarn.lock /app/
COPY config /app/config/
COPY lib /app/lib/
COPY scripts /app/scripts/
USER node
EXPOSE 3447
CMD ["node", "lib/server.js"]
