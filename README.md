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

**Implement better-auth's handlers**

The current implementation for the login and logout is a different implementation than better-auth's. It should be re-factored to follow their best practices instead.




## HAProxy notes

* Run in Docker: https://www.haproxy.com/documentation/haproxy-data-plane-api/installation/install-on-haproxy/#run-the-api-in-docker
* Docker images: https://github.com/haproxytech?q=haproxy-docker-

Dataplane API:
* Github repo: https://github.com/haproxytech/dataplaneapi
* Redoc: **http://localhost:5555/v3/docs**
* API docs: https://www.haproxy.com/documentation/dataplaneapi/
    - Open for quick inspection: https://editor.swagger.io/

Verify that the Data Plane API is up and that authentication works (you will be prompted for the password):
~~~bash
curl -X GET --user admin http://localhost:5555/v3/info
curl -X GET --user admin "http://localhost:5555/v3/health" | jq
curl -X GET --user admin "http://localhost:5555/v3/services/haproxy/runtime/info" | jq

# configurations
curl -X GET --user admin "http://localhost:5555/v3/services/haproxy/configuration" | jq
curl -X GET --user admin "http://localhost:5555/v3/services/haproxy/configuration/backends" | jq
# stats
curl -X GET --user admin "http://localhost:5555/v3/services/haproxy/stats/native" | jq
curl -X GET --user admin "http://localhost:5555/v3/services/haproxy/stats/native?type=backend&name=db_be" | jq

~~~

curl -X GET --user admin "http://localhost:5555/v3/services/haproxy/stats/native?type=backend&name=db_be" --cookie "cookie-with-auth-here" | jq


## React notes

For myself because I'm learning in the process of learning React.

Components:

* `app/admin/backendsList.tsx`
    - Fetches backends from the database on mount
    - Displays them in a simple list
    - Shows loading and empty states
    - Loaded via `app/admin/page.tsx`
        - Simple refreshKey state (just a number)
        - handleBackendCreated just increments the key
        - The BackendsList component uses the key - when it changes, React unmounts and remounts it, causing a fresh fetch
