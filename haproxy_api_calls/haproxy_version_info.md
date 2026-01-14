# HAProxy Data Plane API Version Information

The HAProxy Data Plane API does **not** expose an endpoint to directly fetch its software version via an HTTP request. The `_version` field found in some API responses (e.g., when querying configuration) refers to the *configuration version*, not the software version of the Data Plane API itself.

To determine the software version of the HAProxy Data Plane API, you typically need to use system-level commands on the machine where the Data Plane API is installed:

## Linux (Debian/Ubuntu - if installed via package manager)

```bash
dpkg -s dataplaneapi
```

## General (if `dataplaneapi` executable is in PATH or known location)

```bash
dataplaneapi --version
```
or, if the path is known (e.g., a common location):
```bash
/usr/sbin/dataplaneapi --version
```

**Note:** There is no URL or JSON payload to retrieve the software version directly through the HAProxy Data Plane API's HTTP interface.