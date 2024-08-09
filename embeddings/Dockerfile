FROM --platform=amd64 node:21

WORKDIR /usr/src/app

RUN apt update && apt install -y python3 python3-pip

RUN pip install h5py tensorflow pandas --break-system-packages

COPY package*.json ./

RUN npm install

COPY . .

RUN bash download-models.sh

RUN python3 get-images.py

CMD sleep 1000000