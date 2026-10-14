# Birthday detective game

## Open it
- On your computer: double-click `index.html`. It needs internet only for the fonts.
- Online (after GitHub Pages is on): `https://sinnetfirstbuilder.github.io/games/birthday/`

## Test links (add to the end of the address)
- `?reset` clears all progress.
- `?debug` shows the answers; clicking any photo shows click coordinates (bottom-left) so you can set hotspots. On the Georgia map it shows latitude/longitude.
- `?solve=3` marks item 3 solved. `?solve=1,2,5` or `?solve=all` also work.
- Combine with `&`, for example `index.html?reset&debug`.

## Edit content
Everything she reads lives in `content.js`. Edit the Russian texts between the quotes.

## Add photos
1. Put copies of your photos into `photos/` using the exact file names listed in `content.js` (or change the names there).
2. Double-click `resize-photos.command`. It shrinks big photos to 1600 px, JPEG quality 80. Run it again whenever you add photos.
3. Hard-refresh the page (Cmd+Shift+R).

## Files
- `index.html` page, `style.css` looks, `game.js` logic, `content.js` content.
- `georgia.js` map outline from Natural Earth (public domain).
