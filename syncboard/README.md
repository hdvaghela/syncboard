# SyncBoard – Real-time Team Kanban

A collaborative task board built with **React, Node.js, Express, MongoDB and Socket.io**. When one teammate moves, edits, adds or deletes a card, everyone else on the board sees it instantly, with no refresh.

## Features
- **Drag and drop** (dnd-kit): mouse, touch (long-press) and keyboard (Space to pick up / drop, arrows to move)
- **Real-time sync**: every change is broadcast to the board's Socket.io room; changed cards flash and a short activity toast says who did what
- **Live presence**: avatars of teammates currently on the board, plus a "Sam is moving this" marker (and lock) on a card someone else is dragging
- **Optimistic UI** with automatic rollback if the server rejects a change
- **Auto re-sync**: after a dropped connection the client rejoins and reloads the full board state
- Assign tickets to board members, priority, due dates, descriptions; add / rename / delete columns
- JWT auth (register / login), board membership enforced on every REST call and every socket write
- Responsive: columns snap-scroll on phones

## Quick start
Requires Node 18+ and a MongoDB (local or Atlas).

```bash
npm run install:all
docker compose up -d                       # local MongoDB (or point MONGO_URI at Atlas)
cp server/.env.example server/.env         # set JWT_SECRET
npm run seed                               # demo users + a populated board (optional)
npm run dev                                # API + sockets on :4000, web app on http://localhost:5173
```
Open two different browsers (or one normal + one private window), sign in as `alex@demo.com` and `sam@demo.com` (password `password123`), open **Product launch**, and drag cards.

Production: `npm run build && npm start` (Express serves `client/dist`).

## How the real-time sync works
1. The client connects with its JWT (`socket.handshake.auth.token`); the server verifies it.
2. `board:join` checks membership, joins room `board:<id>`, and acks with the full board state + who is online. The same join runs again on every reconnect, so state can never drift for long.
3. Writes (`task:create|update|move|delete`, `column:*`) are Socket.io events with acknowledgements. The server validates, saves to MongoDB, then broadcasts the result to the whole room and acks the sender.
4. Clients apply broadcasts idempotently (upsert by id), so the sender's own echo is harmless.
5. Card order uses **fractional positions**: moving a card writes one document (`position = midpoint of its new neighbours`). If gaps ever get too small the server renumbers that column once and sends the corrected cards in the same event.

### Socket events
| Client → server | Payload | Broadcast to room |
|---|---|---|
| `board:join` | `{ boardId }` | `presence:update` |
| `task:create` | `{ columnId, title }` | `task:created` |
| `task:update` | `{ taskId, patch }` | `task:updated` |
| `task:move` | `{ taskId, columnId, index }` | `task:moved` |
| `task:delete` | `{ taskId }` | `task:deleted` |
| `column:create / rename / delete` | `{ title }` / `{ columnId, title }` / `{ columnId }` | `column:created / renamed / deleted` |
| `drag:start` / `drag:end` | `{ taskId }` | same event, to others |

### REST API
`POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `GET|POST /api/boards`, `GET|DELETE /api/boards/:id`, `POST /api/boards/:id/members` (invite an existing user by email).

## Structure
```
syncboard/
├── docker-compose.yml
├── server/src/   models/ (User, Board, Task)  routes/  services/ (task + board logic)
│                 socket/index.js (auth, rooms, presence, event handlers)  index.js
│   └── scripts/seed.js
└── client/src/   hooks/useBoard.js (all real-time state)  components/ (Board, Column, TaskCard, modals)
                  pages/ (Login, Boards, BoardPage)  context/AuthContext.jsx
```

## Notes
- Concurrent edits are last-write-wins per card, which suits a board where people mostly touch different cards.
- Set `CLIENT_ORIGIN` in `server/.env` if the web app is served from a different origin than the API.
