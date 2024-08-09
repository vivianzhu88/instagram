FROM node:21
WORKDIR /usr/src/app

RUN apt update && apt install -y python3 python3-pip libhdf5-serial-dev pkg-config

RUN pip install h5py tensorflow --break-system-packages

COPY package*.json ./
RUN npm install
RUN npm rebuild @tensorflow/tfjs-node --build-from-source

COPY . .

EXPOSE $SERVER_PORT
CMD npm run dev
