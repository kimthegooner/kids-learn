# Browser verification

Verified against the exported build on 2026-09-08 in the desktop in-app browser:

- Home and listening quiz at 390 × 844; emoji shown immediately for missing images.
- Daily flow: three learning cards, three picture questions (including a wrong answer and retry), one writing activity, completion and one star.
- Parent report: seven completed activities, one daily completion, 67% unaided first answers, and the missed word listed for review after that daily flow.
- Math: five counting questions completed; exactly one round reward and promotion to addition within five. Star count persists after reload.
- English listening quiz opens independently with two picture choices.
- Writing: completion button disabled until drawing; ink remains after resizing from 390 × 844 to 1024 × 768; proceeding to the next syllable resets the canvas and disables completion again.

Device follow-up: test Korean/English voice quality, initial audio playback and finger/palm input on a physical iPad Safari. Browser UI checks and the mocked speech regression tests do not substitute for device audio verification.


## Forest redesign and arithmetic update (2026-09-08)

- Replaced the home illustration, subject cards, topic garden, activity cards, word book and shared styles. Checked the home at 390 × 844.
- Verified the visible football book shows 28 players and navigation through the portrait gallery. Every player has a downloaded Commons portrait and source/license record, checked automatically.
- Started mixed arithmetic with 20-range addition/subtraction and selected times tables, direct answer input, 10 questions. Submitted an incorrect answer, used addition and multiplication hints, then finished all 10. Result: 8 unaided first answers and exactly one star.
- Confirmed the old counting preference migrates to arithmetic defaults. Current automated coverage includes range selection, multiplication, all three mixed operations, 300 words / 18 topics, unambiguous quiz options, and local portrait presence.

## Camera dress-up (2026-09-08)

- Opened the new booth in the exported local app and visually checked the animated hanbok preview and controls.
- Ran the production classic worker against the existing licensed Saka portrait: both local models initialized, 478 face landmarks and 33 pose landmarks returned.
- Reproduced the reported missing face filters: MediaPipe 1.0.1 emits `visibility: 0` for face landmarks. Separated face coordinate validity from body visibility confidence.
- Rendered crown, bunny ears and sunglasses on the actual detected face in the browser and visually verified all three. Added a regression test covering zero face visibility and face smoothing.
- Automated tests: 23 passed. Production build and type checking passed.
- Device follow-up: live webcam motion, permission denial/retry, cancelling a pending permission prompt, switching accessories while tracking, capture/download/delete, camera release on navigation/backgrounding and mobile Safari. The static-photo inference check does not replace live-device testing.

## Camera artwork quality update (2026-09-08)

- Generated five transparent PNG assets with the built-in image tool and preserved the original alpha: crown metal/gems, fur bunny ears, reflective glasses, silk/embroidered hanbok, mesh jersey.
- Confirmed all five assets load from the local exported app. Rendered all three accessories on actual face landmarks from the Saka portrait and visually checked fit and transparency. Checked hanbok and jersey on the illustrated pose, then refined the skirt silhouette and bunny headband height.
- Added direction-aware face projection, size adjustment (85–120%), higher requested camera resolution, and frame-rate-independent adaptive smoothing. Automated tracking regression checks verify no overshoot, fast follow, and clearing lost tracks.
- Automated tests: 24 passed. Type checking and production build passed. Live motion quality on a physical camera remains a device check.

## Dinosaur, robot and princess (2026-09-08)

- Added three generated transparent character assets; all eight local PNGs load successfully. Confirmed the dinosaur hood and robot helmet have transparent face openings and visually checked their placement on the detected Saka face.
- Verified face-only, body-only and combined costume inference in the production worker: 478 face landmarks and 33 pose landmarks. Princess renders its dress and crown together and requires both tracks before capture.
- Visually checked all five face effects, the three illustrated outfits, and princess on actual face/body landmarks. Refined the dress waist mapping to keep the bodice and skirt continuous.
- Automated tests: 25 passed. Type checking and production build passed. Physical-camera motion, tilted heads and mobile-device performance remain live-device follow-up checks.

## Per-browser child names (2026-09-08)

- Verified first-visit setup in the exported app with “민준 / Minjun”: preview, home greeting “민준아”, brand and browser title update. Reload preserves the name and the existing two stars.
- Opened the third everyday-English card and confirmed “내 이름은 민준! / My name is Minjun.” Both language controls use this personalized card.
- Changed the name to “서아” through the parent screen; the name updated immediately while all 15 completed activities, quiz statistics and two stars remained unchanged.
- Automated tests: 29 passed. Added coverage for separate browser stores, reload, renaming without touching learning records, generic/empty profiles, malformed values, name limits, storage denial/quota failures and safe photo filenames. Type checking and production build passed.

## Public deployment (2026-09-08)

- Deployed the complete exported app to the existing GitHub Pages `gh-pages` branch, commit `c2259f79a9c26c4dc319e4bd893af4d3af58d06f`, preserving the previous deployment history.
- Ran all 29 tests and built with `NEXT_PUBLIC_BASE_PATH=/kids-learn`. Checked first-visit setup and all eight photo-booth assets under that path before publishing. Rebuilt the root-path local preview afterward.
- GitHub Pages reports this commit as built with no error. Verified that public HTML matches the release SHA-256 and 56 referenced assets, camera files and player portraits return successful HTTP responses; WASM files use `application/wasm`.
- Opened https://kimthegooner.github.io/kids-learn/ and confirmed the new child-name setup screen renders. No live webcam access was requested during deployment checks.

## Instrument lessons and music room (2026-09-08)

- Added the music entry immediately below the camera banner, four songs, seven melodic instruments, and all 28 MP3 performances. The instrument category has eight words, including drum, and separate Korean/English/instrument buttons.
- Browser playback verified from actual media state: piano Twinkle duration 28.04 seconds, `paused: false`, advancing current time and no media error. Paused at 16.61 seconds, selected violin and verified playback starts from the new file. Enabled loop, selected Butterfly and confirmed the previous track pauses and the source changes while loop remains enabled. Leaving the music room unmounts its audio player.
- Checked the home, selection/player layout and the instrument-book buttons visually. Existing stars remained unchanged.
- Replaced placeholder voice unlocking with a reusable MP3 player and visible retry status. Generated 1,050 speech clips; automated tests cover playback without Web Speech, autoplay denial/retry, cancellation, Korean/English and name/instrument sequences, all word assets and recorded arithmetic questions/hints.
- 35 automated tests, type checking and production build passed. Physical KakaoTalk/iPhone/Android validation is deferred at the user's request; desktop playback and mocked restrictions do not establish physical-device compatibility.
- Published commit `88341ecf530cd7502aa1d21bef4ae81f31a6925f`; GitHub Pages reports built without errors. Public HTML and 38 audio files (28 performances, eight instrument sounds, two speech samples) match the release SHA-256, with audio MIME types. Verified the public piano track advances to 11.37 seconds, has 28.04-second duration and no media error, then paused it.

## British English and ensemble playback (2026-09-09)

- Regenerated all 332 English clips using Daniel (en-GB), 165 words/minute, normal pitch and consistent loudness. All 332 English URLs changed; all Korean catalog URLs remained unchanged. Decoded every English MP3 with ffmpeg: no decoding errors, silent files or clipped peaks. Verified hashes against the new voice manifest and coverage of all 303 words and 56 everyday-English cards.
- British fallback tests cover an American default appearing first, underscore locale tags, delayed voice loading, cancellation, media failure, and devices without any British voice. Such devices display a specific message instead of using a different accent. Existing recorded lessons remain independent of device voices.
- Verified the local everyday-English British replay button reaches the completed sound state, and the English hub displays the new British-English guidance.
- Added 1–7 instrument selection, select-all and piano-only shortcuts, per-instrument volume sliders, synchronised playback/pause/resume/seek/repeat and cancellation on selection changes/navigation/backgrounding. All seven performances of each song have identical encoded duration.
- Browser: piano/violin/flute started together, active count was three and the position advanced to 4.6 seconds. Selected all seven, switched to Airplane and enabled repeat: after more than a song length it remained playing, with seven active parts and position 5.3 of 17.492875 seconds. Changed violin volume to 50% during playback, then paused at 5.7 seconds. The mixer, selections, repeat control and playback status rendered correctly.
- 47 automated tests and production build passed. Automated ensemble checks verify shared start times/offsets/loop points, volume without restarting, decoded-buffer reuse, cancelling preparation, loading failure/retry and release of all sources. Physical mobile/KakaoTalk validation remains deferred; no claim of real-device audio quality verification.
- Resumed the paused seven-part local ensemble from 5.8 seconds, changed to piano-only and verified a paused/reset position of zero, then deselected the last instrument and verified playback is disabled with a selection prompt.
- Published commit `7e5770095c77a4932c84644f70398ae075452068`. GitHub Pages reports built without errors. Verified 362 public resources (HTML, voice manifest, all 332 English MP3s and all 28 song MP3s) match release hashes; every MP3 has an audio MIME type. On the public site, seven-part Twinkle advanced to 7.2 seconds of 28.0423125 seconds with all seven parts active, then was paused. Root-path localhost export was restored after publishing.

## Bilingual song lyrics (2026-09-09)

- Added timed Korean/English lyrics to all four songs: six phrases for Twinkle, five for Airplane, eight for Butterfly and five for London Bridge. Phrase ranges match the complete score and use its BPM without rounding.
- Korean text and the Airplane/Butterfly English text are new app adaptations, labelled in the UI. Twinkle's English verse is from Jane Taylor's public-domain poem and London's first English verse is traditional, with supporting source links. No commercial Korean adaptations, modern additional verses, vocals or recordings were copied.
- Browser: Twinkle reached 15.6 seconds and correctly showed phrase 4/6 in both languages. Paused, clicked phrase 3, and verified a seek to 9.2 seconds with the matching highlighted row. Switching to English removed all Korean lyric rows; switching to Korean removed all English lyric rows without changing playback position.
- Seven-part Airplane ensemble: clicked phrase 5 while playing, verified position 13 seconds and matching bilingual text. Repeat wrapped back into the song and the lyrics correctly showed phrase 4/5 at 8.8 seconds. Switching to Butterfly reset to position 0 and phrase 1/8, displaying its new-lyrics label.
- 50 automated tests, type checking and production build passed. Added coverage for complete bilingual score alignment, exact phrase boundaries, backward seeks, repeated verse positions, trailing silence and invalid input. Desktop browser inspection does not establish physical mobile/KakaoTalk compatibility.
- Published commit `99f1b07a5e819b348a80890f096b74e865cbbb34`; GitHub Pages reports built without errors. Public HTML and all seven referenced JS/CSS resources match release hashes. On the public site, Twinkle at 13.9 seconds displayed Korean/English phrase 4/6 and highlighted the fourth full-lyrics row while playing. Paused after verification. Restored the root-path local export.
