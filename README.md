# HAProxy Web UI

Minimal HAProxy Web UI for manual backend server maintenance tasks

This web app is built to consume data from the `HAProxy Data Plane API`


## Environment

1. HAProxy Data Plane API password:
    * Option 1: `export DATAPLANE_PASSWORD='your-secure-password'`
    * Option 2 (recommended): Create an `.env` in the root of this repo folder (same as the docker-compose file) containing:
        ~~~conf
        DATAPLANE_PASSWORD=your-secure-password
        ~~~

2. HAProxy + MariaDB: `docker compose up` (add parameter -d to run it in the background)
    ~~~bash
    # force rebuild (required if you make changes to the haproxy config files or the haproxy api password)
    `docker compose up --build`
    ~~~
3. `npm install`
    ~~~bash
    npm install better-auth drizzle-orm drizzle-kit mysql2 bcryptjs dotenv jsonwebtoken
    ~~~
4. init the better-auth db with an admin user (only need to be run once): `npm run seed`
5. Create .env.local contains DB connection and BETTER_AUTH_SECRET.
    ~~~conf
    # MariaDB Database
    DB_HOST=localhost
    DB_PORT=3306
    DB_USER=haproxy_web_user
    DB_PASSWORD=haproxy_web_password
    DB_NAME=haproxy_webui

    # HAProxy Dataplane
    HAPROXY_DATAPLANE_BASE_URL=http://localhost:5555
    HAPROXY_DATAPLANE_USER=admin
    HAPROXY_DATAPLANE_PASS=haproxy_dataplaneapi_password

    # HAProxy Web UI
    # Better Auth
    BETTER_AUTH_SECRET=very_long_random_secret_here
    # Init admin user for the HAProxy Web UI
    ADMIN_ID=admin-user-1
    ADMIN_EMAIL=admin@haproxy.local
    ADMIN_PASSWORD=admin123
    ~~~
6. `npm run dev`




## Todo

**Implement better-auth's handlers later:**
The current implementation for the login and logout is a different implementation than better-auth's.




## HAProxy notes

* Run in Docker: https://www.haproxy.com/documentation/haproxy-data-plane-api/installation/install-on-haproxy/#run-the-api-in-docker
* Docker images: https://github.com/haproxytech?q=haproxy-docker-

Verify that the Data Plane API is up and that authentication works (you will be prompted for the password):
~~~bash
curl -X GET --user admin http://localhost:5555/v3/info
~~~
