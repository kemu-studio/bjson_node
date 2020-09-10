FROM node:12.16.1-alpine as builder
WORKDIR /opt/bjson_node

COPY ./* /opt/bjson_node/
RUN  npm install

CMD ["npm", "run", "test"]
