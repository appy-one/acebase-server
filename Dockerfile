# experimenting running in docker container. 
# WARNING: running 1 instance is currently supported per db, running multiple will corrupt your data!
# To build a docker image, execute:
# docker build -t acebase-server .
# To run:
# docker volume create acebase-server-data
# docker run --name MyAceBaseServer1 -p 3000:3000 -p 4000:4000 -v acebace-server-data:/default.acebase acebase-server

FROM node:10-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY src ./src

# Initialize build arguments passed to docker build --build-arg DBNAME=data ...
ARG DBNAME="data"
ARG PORT=3000
ARG CLUSTER_PORT=4000
ARG HOST="0.0.0.0"
ARG PATH="."

# Set defaults for runtime environment variables, can be overriden by: docker run --env DBNAME=mydb ...
ENV DBNAME=${DBNAME} HOST=${HOST} PORT=${PORT} CLUSTER_PORT=${CLUSTER_PORT} PATH=${PATH}

# Start server without arguments, environment variables will be used
CMD ["node", "start.js"]