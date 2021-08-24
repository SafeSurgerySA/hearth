FROM node:14.17.5 as build
WORKDIR /app
COPY package.json yarn.lock /app/
RUN yarn install --frozen-lockfile --production

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
