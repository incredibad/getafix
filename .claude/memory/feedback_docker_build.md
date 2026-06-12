---
name: feedback-docker-build
description: "Always docker build and redeploy after every code change, without waiting to be asked"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 073cc79e-1ac1-4961-9602-e8f84e1b2955
---

Always run `docker build -t incredibad/getafix:latest . && docker compose up -d --force-recreate` after every code change — don't wait for the user to ask.

**Why:** User explicitly requested this. Also: `docker compose restart` does NOT pick up a new image; `--force-recreate` is required to swap in the updated image.

**How to apply:** Any time files are edited (frontend or backend), immediately follow up with the docker build+deploy pipeline before reporting the task done.
