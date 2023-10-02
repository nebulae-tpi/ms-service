FROM node:10-alpine
ARG DOCKERHUB_TAG
ENV DOCKER_VERSION $DOCKERHUB_TAG
ENV NODE_ENV production
WORKDIR /nebulae/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --production --silent && mv node_modules ../
RUN sed -i "s|'majority'|1|g" /nebulae/node_modules/@nebulae/event-store/lib/store/MongoStore.js
RUN sed -i "s|returnOriginal: false|returnOriginal: false, writeConcern: { w: 1, wtimeout: 500, j: true },|g" /nebulae/node_modules/@nebulae/event-store/lib/store/MongoStore.js
RUN sed -i "s|500|1000|g" /nebulae/node_modules/@nebulae/event-store/lib/store/MongoStore.js
COPY . .
COPY mbinit /
COPY entrypoint.sh /
ENTRYPOINT ["/entrypoint.sh"]
CMD npm start