# syntax=docker/dockerfile:1

FROM golang:1.27-alpine AS build

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .

ENV CGO_ENABLED=0
RUN go build -v -o /pocketbase ./apps/doctor-notify/doctor-notify-db/src

FROM alpine:3.20

WORKDIR /app

COPY --from=build /pocketbase /app/pocketbase

EXPOSE 8090

ENTRYPOINT ["/app/pocketbase"]
CMD ["serve", "--http=0.0.0.0:8090"]