FROM alpine:3.20
WORKDIR /seed
COPY listofitems.txt /seed/listofitems.txt

# copy the file into the shared /items volume on start, then stay alive
CMD ["/bin/sh", "-c", "mkdir -p /items && cp /seed/listofitems.txt /items/listofitems.txt && tail -f /dev/null"]
