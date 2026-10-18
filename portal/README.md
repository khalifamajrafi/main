# ICT Operations Portal (front-end)

The browser front-end of the support portal: plain HTML, CSS and JavaScript with no build step. The UI is bilingual (Arabic and English).

```
portal/
  index.html       entry page, loads everything below in order
  assets/
    app.css        styles
    store.js       data layer (server or local mode)
    core.js, catalog.js, modules.js, engine.js, io.js,
    views.js, reports.js, sample.js, chat.js, remote.js,
    employee.js, app.js
```

`index.html` expects the files under `assets/`, so keep that layout when serving.

## Run it locally

Serve the `portal` folder with any static web server and open it in a browser. For example, from this folder:

```
python -m http.server 8085
```

then open http://localhost:8085/. (`npx serve -l 8085` works too.) Opening `index.html` straight from disk is not supported, because the scripts expect to be served over HTTP.

## Server mode and local mode

On load, `store.js` calls `api/health`. If a backend answers with `{"mode":"server"}`, the portal keeps shared data on that server through the `api/` endpoints. Otherwise it runs in local mode and keeps all data in this browser's `localStorage` (keys prefixed `ictops.v1.`), which is fine for previewing and trying things out.

The backend that serves `api/` (IIS or a Linux host) is not part of this folder.

## Fonts

`app.css` loads IBM Plex Sans (Latin and Arabic) and Sora from `assets/fonts/`. Those `.woff2` files were not in the source archive, so until they are added the page falls back to system fonts.
