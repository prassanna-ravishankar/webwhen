# Multi-stage build for React frontend

# Stage 1: Build the application
# Using Playwright base image for Chromium (needed for prerendering public routes)
FROM mcr.microsoft.com/playwright:v1.59.1-noble AS builder

WORKDIR /app

# Origin baked into prerendered JSON-LD URL fields, RSS alternate links, etc.
# Production builds inherit the default (https://webwhen.ai). Staging/preview
# CI passes --build-arg PRERENDER_ORIGIN=https://staging.webwhen.ai so the
# baked HTML doesn't point crawlers at production. See scripts/prerender.mjs.
ARG PRERENDER_ORIGIN
ENV PRERENDER_ORIGIN=${PRERENDER_ORIGIN}

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
# Use npm ci for reproducible builds that respect package-lock.json
# Cache mount speeds up rebuilds by persisting npm's download cache
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Copy source code
COPY . .

# Build the application and prerender public routes
RUN npm run build

# Stage 2: Serve with nginx
#
# Build the headers-more dynamic module from source against this image's
# nginx version. headers-more is not in the alpine apk repo for the official
# `nginx:alpine` images (only acme/geoip/image-filter/njs/xslt are packaged),
# so we compile it ourselves. The module is required because stock nginx
# `add_header` at server scope is silently discarded the moment a `location`
# block uses its own `add_header` — even when the parent directive carries
# `always`. See issue #259.
FROM nginx:alpine

ARG HEADERS_MORE_VERSION=0.37
RUN apk add --no-cache --virtual .build-deps \
        gcc libc-dev make pcre2-dev zlib-dev openssl-dev linux-headers curl ca-certificates \
    && NGINX_VER=$(nginx -v 2>&1 | sed -E 's|.*/([0-9.]+).*|\1|') \
    && curl -fsSL "https://nginx.org/download/nginx-${NGINX_VER}.tar.gz" -o /tmp/nginx.tar.gz \
    && curl -fsSL "https://github.com/openresty/headers-more-nginx-module/archive/v${HEADERS_MORE_VERSION}.tar.gz" -o /tmp/headers-more.tar.gz \
    && mkdir -p /tmp/build && cd /tmp/build \
    && tar -xzf /tmp/nginx.tar.gz \
    && tar -xzf /tmp/headers-more.tar.gz \
    && cd "nginx-${NGINX_VER}" \
    && CONFIGURE_ARGS=$(nginx -V 2>&1 | grep "configure arguments:" | sed 's|.*configure arguments: ||') \
    && eval ./configure ${CONFIGURE_ARGS} --add-dynamic-module=/tmp/build/headers-more-nginx-module-${HEADERS_MORE_VERSION} \
    && make modules \
    && cp objs/ngx_http_headers_more_filter_module.so /etc/nginx/modules/ \
    && cd / && rm -rf /tmp/build /tmp/nginx.tar.gz /tmp/headers-more.tar.gz \
    && apk del .build-deps \
    && sed -i '1i load_module modules/ngx_http_headers_more_filter_module.so;' /etc/nginx/nginx.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
