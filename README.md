# HAProxy Web UI

Minimal HAProxy Web UI for manual backend server maintenance tasks.

This web app is built to consume data from the `HAProxy Data Plane API`. It is by no mean intended to be anything else than a personal learning project at this point.

**Login page**

![Login page to the web UI](https://github.com/JoelLindberg/haproxy-webui/raw/assets/screenshots/login.png)

**Admin panel**

![Admin page of the web UI](https://github.com/JoelLindberg/haproxy-webui/raw/assets/screenshots/admin.png)

![Admin page of the web UI](https://github.com/JoelLindberg/haproxy-webui/raw/assets/screenshots/admin-edit-backend.png)


## Development


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
3. `cd haproxy-webui/`
4. `npm install`
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

    # HAProxy Prometheus Exporter
    HAPROXY_EXPORTER_PORT=8405
    HAPROXY_METRICS_URL=http://localhost:8405/metrics
    ~~~
6. Prep DB for haproxy_backends (creates the DB): `npm run seed`
7. Prep DB for better-auth: `npx @better-auth/cli migrate`
8. `npm run dev`
9. Open [http://localhost:3000](http://localhost:3000) with your browser to login to the admin dashboard.


To add users manually:

* Insert directly into the database (Better Auth uses bcrypt for password hashing)
* Use Better Auth's CLI tools
* Create a custom admin script



## HAProxy notes

* Run in Docker: https://www.haproxy.com/documentation/haproxy-data-plane-api/installation/install-on-haproxy/#run-the-api-in-docker
* Docker images: https://github.com/haproxytech?q=haproxy-docker-

Dataplane API:
* Github repo: https://github.com/haproxytech/dataplaneapi
* Redoc: **http://localhost:5555/v3/docs**
* API docs: https://www.haproxy.com/documentation/dataplaneapi/
    - Open for quick inspection: https://editor.swagger.io/

**Metrics:**
* Try the *haproxy prometheus exporter*
  - Fetch metrics from this from the nextjs node backend
  - Use `axios` for fetching and `parse-prometheus-text-format` for turning that text into a clean JSON object.

* Available at: http://localhost:8405/metrics.


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


curl -X GET --user admin "http://localhost:5555/v3/services/haproxy/configuration/backends/app_be/servers" | jq

# create a server in a backend
# version or transaction id must be specified - must/should be incremented for each change? force_reload can also be set when using version
curl -X POST --user admin "http://localhost:5555/v3/services/haproxy/configuration/backends/app_be/servers/?version=1" --json '{"address": "10.0.0.1", "name": "test", "port": 8888}' | jq

# delete a server in a backend
curl -X DELETE --user admin http://localhost:5555/v3/services/haproxy/configuration/backends/{parent_name}/servers/{name}

# get current config version
curl -X GET --user admin http://localhost:5555/v3/services/haproxy/configuration/version


# add a backend
curl -X POST --user admin http://localhost:5555/v3/services/haproxy/configuration/backends/?version=1 --json '{"name": "test_be", "mode": "http", "balance": {"algorithm": "roundrobin"}}' | jq


# not tested yet
curl -X GET --user admin "http://localhost:3000/haproxy/?name=db_be" --cookie "cookie-with-auth-here" | jq

~~~

### stats

Server stats:
The stats endpoint has scur (current sessions) and qcur (current queued connections).


### status and state

* Status (UP/DOWN/STOPPING) - This is operational_state, the health check result - is the server actually responding?
* State (READY/DRAIN/MAINT) - This is admin_state, the administrative setting - should HAProxy send traffic to it?

State (admin_state):
* 

Status (operational_state):
* UP - Green (server is healthy and receiving traffic)
* DOWN - Red (server failed health checks)
* STOPPING - Yellow/amber (server is in the process of stopping, typically during drain)



Example:
* Status = UP (green) means the health check is passing - the server is reachable and healthy
* State = DRAIN (yellow) means the admin has told HAProxy to stop sending NEW traffic to this server



More examples:
admin_state (State column) - What you tell HAProxy to do:

READY - Accept new connections
DRAIN - Stop accepting NEW connections, but finish existing ones
MAINT - Completely offline
operational_state (Status column) - What HAProxy observes about the server's health:

UP - Server is responding to health checks
DOWN - Server is failing health checks
STOPPING - Server is in the process of shutting down
When you set a server to DRAIN:

It will typically stay UP because it's still running and passing health checks
It just won't receive any new connections
Existing connections continue until they finish
STOPPING is a transitional state that appears when:

The server is actually shutting down
Or all connections have drained and HAProxy is finalizing the stop




### haproxy config

HAProxy config file looked like this after inserting a test server. Note the md5hash and version:

~~~conf
root@cf1691c5c7cf:/usr/local/etc/haproxy# cat haproxy.cfg 
# _md5hash=1b46427730d5e4435333826727a62042
# _version=2
# Dataplaneapi managed File
# changing file directly can cause a conflict if dataplaneapi is running

global
  daemon
  maxconn 256
  log /dev/log local0
  log /dev/log local1 notice

defaults unnamed_defaults_1
  mode http
  timeout connect 5s
  timeout client 50s
  timeout server 50s

frontend db_fe from unnamed_defaults_1
  mode tcp
  bind *:3306
  default_backend db_be

frontend http from unnamed_defaults_1
  bind *:80
  default_backend app_be

backend app_be from unnamed_defaults_1
  server app1 http-echo1:5678 check
  server app2 http-echo2:5678 check
  server test 10.0.0.1:8888

backend db_be from unnamed_defaults_1
  mode tcp
  server db1 mariadb:3306 check
~~~



## Next/React notes

~~~bash
npm install better-auth drizzle-orm drizzle-kit mysql2 bcryptjs dotenv jsonwebtoken
~~~

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




## LLM support

### better-auth

* https://www.better-auth.com/docs/introduction

Example:

`Read http://localhost:3000/llms.txt and help me implement authentication in my component`
