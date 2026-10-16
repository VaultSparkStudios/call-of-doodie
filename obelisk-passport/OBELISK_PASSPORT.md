# Native Obelisk Passport integration

call-of-doodie uses its existing vite-react-cloudflare-pages-functions implementation. This manifest identifies the consumed native source; it introduces no alternate login UI or callback.

Identity provider: https://obeliskgate.com. Canonical project origin: https://callofdoodie.wtf. The callback reads obelisk_session and verifies through /api/obelisk-verify. Server verification uses the canonical identity provider; the browser never receives signing credentials.

The source and test hashes in native-integration.json bind the reviewed implementation. Existing tests passed 18/18 on 2026-10-16T05:18:20.723Z; they use controlled verification responses. This records hermetic behavior, not a live identity round trip, production release approval, or deployment of these metadata files.

Implementation paths:
- src/main.jsx
- src/ObeliskLogin.jsx
- src/ObeliskCallback.jsx
- src/obelisk-callback.js
- src/obeliskRoutes.js
- src/utils/obeliskPassport.js
- src/utils/cloudSession.js
- src/utils/accountSession.js
- functions/api/obelisk-verify.js

Test paths:
- src/obelisk-callback.test.js
- src/obeliskRoutes.test.js
- src/utils/obeliskPassport.test.js
- tests/obelisk-verify-function.test.js
- src/utils/cloudSession.test.js
- src/utils/accountSession.test.js

Rollback: revert only these two metadata files. Runtime auth is unchanged. Regenerate hashes and rerun the listed tests after native source changes.
