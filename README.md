# Presentation Kit

One shared presentation app; each deck chooses its own version.

The runtime contains Present/Exit, touch navigation, the hover language menu,
progress and slide number, glass captions, full-width summaries, examples and live
session following. Content, translations, images and deck-specific CSS stay in the
presentation's repository.

## Create a deck

Clone this repository, then:

```sh
python3 tools/new_presentation.py /path/to/my-presentation
cd /path/to/my-presentation
python3 build.py
python3 -m http.server 8767 --bind 127.0.0.1
```

Edit `presentation.json`, `slides.json`, `theme.css` and your assets. The starter
supports covers, image slides and text statements. Existing decks may keep a
custom renderer for their own layouts while sharing the same runtime components.

## Update an existing deck — only when you choose

```sh
python3 update-template.py --check
python3 update-template.py --version v1.0.1
python3 build.py
```

`--check` reports the available release without changing files. `--version`
chooses a release explicitly; `--latest` is an explicit opt-in alternative. Review
the preview and `git diff`, then commit and publish. An older version can be
selected in the same way to roll back. There is no network update during a build,
page load or deployment, and no link to a moving `main` branch.

The updater resolves the chosen tag to an immutable commit, verifies every file,
and replaces only `.presentation-kit/` plus `presentation-kit.lock.json`. It
refuses to replace local kit edits or unknown files. Put customizations in
`theme.css` or your deck's renderer; never edit vendored kit files directly.
GitHub CLI access is needed only when explicitly requesting an update. Publication uses the already-bundled runtime and needs no cross-repo
credentials.

The lock records the release, commit and file hashes. Commit it and
`.presentation-kit/` with the presentation. `update-template.py` is a tiny stable
entry point; its updater implementation is maintained inside the kit.

## Components and configuration

- `runtime/config.js`: configuration, core UI labels and locale visibility.
- `runtime/presentation.js` / `presentation.css`: viewport, fullscreen, keyboard,
  touch and progress. The small counter and progress bar appear only in Present.
- `runtime/app.js` / `slides.css`: reading navigation, language menu, summaries,
  glass surfaces and optional data-example popovers.
- `runtime/live.js` / `live.css`: opt-in live following and ended-session notice.
- `lib/render.py`: standard cover/image/text layouts.
- `lib/exports.py`: offline embedding and allowlisted public export.

`presentation.json` supplies a stable `id`, languages, labels, default mode and,
optionally, `live.endpoint` and `shareUrl`. Live sessions publish only slide
position and session status; viewers keep independent language choices. Each deck
has its own room ID and slide count. Closing a presenter tab pauses the session;
ending it shows a notice and lets viewers browse the presentation freely.

Core labels include English, Arabic, Chinese and German. Additional languages can
supply labels in configuration; live-panel wording falls back to English.
The optional relay supports up to 500 slides and eight-hour sessions. Deploy your
own endpoint and configure its allowed origins before enabling Live.

## Release a shared change

1. Change the source runtime or libraries here; update `VERSION`.
2. Run `python3 tools/release_manifest.py` and `python3 -m unittest discover -s tests`.
3. Preview a starter and the consuming decks.
4. Commit, tag `vX.Y.Z`, and publish the GitHub release.
5. Upgrade chosen decks explicitly. Their live sites do not change until rebuilt
   and published from the updated snapshot.

Do not modify an existing release tag. Use a new patch release for fixes.

## License and scope

App code is licensed under MIT; see `LICENSE`. Bundled Inter fonts retain the SIL
Open Font License in `runtime/assets/fonts/OFL.txt`. Keep both notices when
redistributing the corresponding files. Deck content, images and custom themes
remain separately owned and licensed by their authors.

This repository contains generic components and neutral sample slides. It does
not contain personal presentations, speaker biographies, deck images, local
machine paths, private materials or deployment credentials. No live service is
enabled by default; see `service/README.md` to deploy your own.
