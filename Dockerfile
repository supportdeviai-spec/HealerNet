# ---------------------------------------------------------
# Base Image with PHP 8.3 FPM & System Dependencies
# ---------------------------------------------------------
FROM php:8.3-fpm

LABEL maintainer="HealerNet Engineering Team"

# Set Working Directory
WORKDIR /var/www/html

# Install system dependencies & build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    zip \
    unzip \
    nodejs \
    npm \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install required PHP extensions for Laravel 13
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip opcache

# Install Redis extension via PECL
RUN pecl install redis && docker-php-ext-enable redis

# Get Composer from official image
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Copy PHP custom configuration
COPY docker/php/local.ini /usr/local/etc/php/conf.d/local.ini

# Copy entrypoint script
COPY docker/entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Copy application source code
COPY . /var/www/html

# Set permissions for web server user
RUN mkdir -p storage/app/public/banners public/banner/uploads bootstrap/cache \
    && chown -R www-data:www-data /var/www/html \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache /var/www/html/public/banner

# Set Entrypoint script
ENTRYPOINT ["docker-entrypoint.sh"]

# Expose PHP-FPM Port
EXPOSE 9000

CMD ["php-fpm"]
