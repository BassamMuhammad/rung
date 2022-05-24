FROM node:16-alpine
WORKDIR /
COPY package*.json ./
RUN npm ci --production --ignore-scripts
COPY . .
CMD [ "npm","run","start" ]