---
name: feedback-always-commit
description: Always commit to git after every change; only push to GitHub when explicitly asked
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 54084719-46a2-498b-9d96-1b69c472e0bb
---

Always create a git commit on `dev` after every change, once the container is rebuilt and verified. Do not wait for the user to ask.

**Why:** User explicitly requested this workflow — commit always, push only on request.

**How to apply:** After each docker build + smoke test, run `git add` + `git commit`. Never skip the commit step. Never push unless the user says "push".
