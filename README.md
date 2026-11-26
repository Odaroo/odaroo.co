# odaroo.co

The front page of Odaroo: the artist portfolio. The outlets on top (YouTube, Twitch, Bandcamp, SoundCloud,
Discord), the games below in the order they were made. Static files, no build step, served by GitHub Pages.

**Every file here except `CNAME`, `.nojekyll` and this README is a copy.** The page is `play/index.html`
in the `Odaroo/inkville` repo (the same page play.odaroo.co was built on). To change it, change it there, then:

    node tools/sync-front.cjs <path to this repo>

and commit and push this repo to `main`; GitHub Pages republishes in about a minute.

The games themselves live at https://play.odaroo.co/<game>/. The bare https://play.odaroo.co/ forwards here
once this site answers over a valid certificate.

- `CNAME`: tells GitHub Pages this site answers at odaroo.co.
