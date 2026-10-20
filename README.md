# OPDS Explorer

## Logging in from a local dev server

By default `npm run dev` serves on `https://localhost:5173`. Some OPDS servers only send credentials to (or have OAuth clients registered for) specific hostnames. Set `DEV_HOST` to serve from such a hostname, and point it at your machine in `/etc/hosts`:

```
127.0.1.1	dev.example.org
```

```
DEV_HOST=dev.example.org npm run dev
```

You may also need a CORS-removing browser extension while developing. To learn more about hosts, see `man 5 hosts`.

## Install

Dependencies:

- npm

Run

```
npm i
```

Then

```
npm run dev
```

To run locally.  When running locally, a locally signed ssl-certificate will be issued and so firefox will generate a warning. It is okay to skip this warning.

For production instructions, see the Dockerfile.


## TODO

- [ ] Add redirect url.
- [ ] Add support for implicit oauth
- [ ] Add until property

## License

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. See [LICENSE](LICENSE).
