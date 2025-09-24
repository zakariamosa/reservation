# Serve the static site with NGINX
FROM nginx:alpine

# Optional: small tweak so .txt is easy to fetch and not cached too hard
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Your site files (html, js, css, listofitems.txt)
COPY . /usr/share/nginx/html
