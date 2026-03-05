OVERVIEW
Build a fully playable multiplayer browser card game called "BLUFF" — a social deception card game where players try to get rid of all their cards by playing face-down and lying (or not) about what they played. Other players can call their bluff. First to empty their hand wins.

VISUAL THEME & AESTHETIC
Core Reference: Windows 3.1 / Windows 95 Solitaire — that nostalgic, slightly pixelated, green felt table energy. Think: the exact shade of casino baize green, chunky card shadows, serif/bitmap-style typography, gold trim details.
Color Palette:

Background (table felt): #2D6A4F (deep casino green) with a subtle radial gradient darkening toward edges, like a real felt table under a spotlight
Card backs: Deep burgundy #6B1A2B with a geometric diamond/cross hatch pattern in #8B2A3F
Card faces: Cream white #FDF8EC with classic serif numerals, black for clubs/spades, #CC2200 for hearts/diamonds
UI panels/HUD: Dark walnut wood grain texture #3B2314, with gold border accents #C9A84C
Buttons: Raised bevel effect like Windows 95 — light gray #D4C9A8 with a 1px dark bottom/right shadow and light top/left highlight
Text: Primary — #F5E6C8 (warm parchment). Accent — #C9A84C (gold). Danger/Bluff — #FF3B3B
Active card rank indicator pill: #1A1A2E background with #C9A84C gold text, slight glow

Typography:

Game title & major headings: "Playfair Display" — elegant serif, heavy weight
UI labels, card counts, room codes: "Courier Prime" or "Space Mono" — monospace, that retro terminal feel
Buttons & action text: "Roboto Condensed" bold
Card numerals/suits: Classic playing card serif font — "Libre Baskerville"

Card Design:

Rounded corners (border-radius: 8px), drop shadow rgba(0,0,0,0.5) 6px blur
Card back pattern: repeating diagonal diamond hatch in burgundy tones — matches Windows Solitaire card back option #3
Card faces: standard 4-suit playing card layout, index in top-left and bottom-right corners
When selected/toggled: card lifts up with a translateY(-16px) and a gold glow border #C9A84C

Atmosphere:

Subtle green felt texture overlay (use a CSS noise/grain filter)
Soft vignette on table edges
Gold particle/shimmer effect that triggers on major events (winning a round, catching a bluff)
The center pile should look like actual cards physically stacked — slight rotation variance on each card drop (random ±5° tilt)


SOUND DESIGN
All sounds should feel like a real casino card room:

card_deal.mp3 — crisp single card slide sound, plays when cards are distributed
card_select.mp3 — soft card lift/tap when toggling a card in hand
card_place.mp3 — satisfying thwack of cards being placed face-down on the pile
card_flip.mp3 — smooth whoosh + slap for bluff reveal animation
bluff_correct.mp3 — dramatic short sting + crowd gasp, "GOT 'EM" energy
bluff_wrong.mp3 — sad trombone / deflated tone
pickup_pile.mp3 — rapid shuffle sound as pile cards fly to a player's hand
pass.mp3 — subtle neutral click
round_win.mp3 — triumphant casino jingle, coins sound
game_win.mp3 — full fanfare, slot machine jackpot energy
room_join.mp3 — warm welcome chime
disconnect_alert.mp3 — soft alarm ping
vote_cast.mp3 — satisfying stamp/seal sound
Background ambience: optional soft casino room murmur, low volume, toggleable

Add a sound toggle button (🔊/🔇) in the top-right corner at all times.

SCREENS & FLOWS

SCREEN 1: LANDING PAGE
Layout: Centered, full viewport. Dark green felt background.

Game logo "BLUFF" centered, massive Playfair Display font, gold color with a subtle long drop shadow. Below it, smaller tagline in Courier Prime: "Cards don't lie. Players do."
Two large bevel-style buttons:

"CREATE ROOM" — primary gold
"JOIN ROOM" — secondary dark with gold border


Below buttons: small text link — "How to Play" (opens a modal with rules)
Animated background: cards slowly drift and rotate in the background like a Windows screensaver — lazy, looping, peaceful


SCREEN 2: CREATE ROOM
Layout: Centered modal/card on felt background, walnut wood panel style with gold border
Fields & Options:

Your Name — text input, monospace font, styled like a physical nameplate
Number of Players — segmented selector: 3 | 4 | 5 | 6 | 7 | 8. Default: 4. Note below: "6+ players will automatically use 2 decks"
Bot Slots — after selecting player count, show N-1 toggle switches labeled "Slot 2", "Slot 3", etc. Each can be toggled to BOT (shows a robot icon 🤖 and grays out that slot for human joining). A slot set to BOT is immediately filled — human players can only join open slots.
Room Privacy — toggle: Public / Private (private = code-only access)

On clicking "Create Room":

Auto-generate a 6-character alphanumeric room code (e.g. KQ7X2J) displayed in a large monospace box with a "Copy Code" button
Also generate a shareable link (e.g. bluff.game/room/KQ7X2J) with a "Copy Link" button and a "Share" button (native share API)
A QR code is also generated and displayed — scannable to join on mobile
Host is taken to the Lobby screen immediately


SCREEN 3: JOIN ROOM

Single text input: "Enter Room Code" — large, centered, monospace, auto-capitalizes
Below: "Or paste a link"
"Join" button
If arriving via shared link, the code is pre-filled and player just enters their name
Name input appears after valid code is entered


SCREEN 4: LOBBY / WAITING ROOM
Layout: Walnut wood panel. Centered.
Left panel — Player slots:

Show all N slots as card-sized panels in a vertical list
Filled human slots: player name + green "READY" dot
Bot slots: 🤖 + "BOT — Will Auto-Play" in italic gray
Empty human slots: animated pulsing "Waiting..." text
Host slot has a small 👑 crown icon

Right panel — Room info:

Room Code in large monospace (copyable)
Share link + QR code
Player count: 3 / 4 joined

Host controls (only visible to host):

Kick button (✕) next to each non-host human player
"Start Game" button — enabled only when minimum players are present (bots fill remaining slots). Gold, large, centered at bottom. Disabled/grayed state when conditions not met with tooltip: "Need at least 3 players (human + bots)"

Non-host view:

"Waiting for host to start..." with a looping card shuffle animation


SCREEN 5: GAME SCREEN (MAIN)
This is the most important screen. Casino table layout, desktop-first.
LAYOUT STRUCTURE:
┌─────────────────────────────────────────────────────┐
│  [Round Info]        [BLUFF]        [Sound] [Leave] │  ← Top bar
├─────────────────────────────────────────────────────┤
│                                                     │
│   [Opponent 2]          [Opponent 3]                │  ← Opponents top
│                                                     │
│ [Opp 1]      ┌──────────────────┐      [Opp 4]     │  ← Side opponents
│              │   CENTER PILE    │                   │
│              │  🃏 × 14 cards   │                   │
│              │ "Playing: KINGS" │                   │
│              └──────────────────┘                   │
│                                                     │
│              [YOUR HAND — cards displayed]          │  ← Player at bottom
│                                                     │
│         [Pass]  [Play Selected]  [Call Bluff]       │  ← Action buttons
└─────────────────────────────────────────────────────┘
OPPONENT DISPLAY (other players):

Each opponent shown as a small player panel: avatar/icon, name, card count badge (e.g. "🃏 9"), and a fan of face-down card backs (decorative, count matches their actual hand size)
Bot players have 🤖 icon
Active/current turn: their panel gets a gold animated border glow
If it's their turn, show a subtle "thinking..." or action indicator
Card count updates in real-time as they play or pick up

CENTER PILE:

Physical stack of face-down cards with slight random rotation on each, casting a shadow
Card count badge: 🃏 14
Active Rank Pill — always visible above the pile: e.g. ♛ KINGS in gold on dark background, with a soft glow. This is locked for the round.
If no round is active (new round starting), show: "New Round — First player picks any rank"
Last played indicator: small text below pile — "Player 2 played 3 cards"

YOUR HAND (bottom):

Cards displayed in a fan/arc — classic solitaire hand layout
Cards are face-up (only you can see them)
Tap/click a card to select it — it lifts up translateY(-16px) with a gold glow border. Tap again to deselect.
Multiple cards can be selected simultaneously
Show a small ✓ badge on selected cards
Hand scrolls horizontally if many cards

ACTION BUTTONS (bottom bar):
Three large bevel-style buttons:

"PASS" — gray, always available on your turn (unless you're the round starter)
"PLAY SELECTED (N)" — gold, active only when ≥1 card selected AND it's your turn. N = count of selected cards. Clicking this opens the Declaration Popup
"CALL BLUFF 🔥" — red, available only when it's your turn AND there are cards in the pile AND you didn't play the last cards

Buttons are disabled and grayed when it's not your turn.

POPUP: DECLARATION (when you click "Play Selected")

Centered modal, dark walnut panel, gold border
Title: "You're playing N card(s). What are you calling them?"
Card rank selector — a horizontal scrollable row of large rank buttons: A 2 3 4 5 6 7 8 9 10 J Q K

If a round is already in progress, all ranks are disabled except the active one — active rank is highlighted gold, others grayed with tooltip "A rank is already in play this round"
If this is the first play of a new round, all ranks are selectable


Selected rank highlights in gold
"Confirm & Play" button — gold, large
"Cancel" button — small, below


ANIMATION: BLUFF REVEAL
Triggered when any player calls bluff:

Dramatic pause — table darkens slightly, vignette intensifies, bluff sound sting plays
A large overlay banner slides in from top: "[PlayerName] CALLS BLUFF!" in red Playfair Display, with a shake animation
The top/most recent cards in the pile slide out and spread face-down in a fan
They flip one by one (smooth 3D card flip animation, rotateY 0→180deg) revealing the actual card faces — card_flip.mp3 plays for each flip
Brief pause while everyone sees the cards
Result banner slams onto screen:

If bluff was correct (they lied): "CAUGHT! 😈 [Liar] picks up the pile!" — red background, gold shimmer particles
If bluff was wrong (they were honest): "WRONG CALL! 😅 [Caller] picks up the pile!" — blue/purple background


Pile cards animate flying into the losing player's hand panel (cards fan out and zoom toward their position)
pickup_pile.mp3 plays, their card count badge updates with a bounce animation
Winner of the bluff call is highlighted briefly with a gold glow, table returns to normal


ANIMATION: PLAYING CARDS
When a player plays cards:

Selected cards in their hand slide together into a stack
Stack flips face-down mid-air (quick flip animation)
Cards fly from their hand position to the center pile with a smooth arc
card_place.mp3 plays
Pile count badge updates with a bounce, Active Rank Pill animates in if it's a new round


ANIMATION: CARD DEAL (game start)

Shuffled deck appears in center table — card_deal.mp3 shuffle sound
Cards deal out one by one in rapid succession to each player position, fanning out into their hands
Each player's card count badge increments with each card received
Your cards flip face-up as they arrive in your hand
Full deal animation takes ~2.5 seconds


SCREEN 6: DISCONNECT / VOTE POPUP
Triggered when a player goes inactive (no response for 60 seconds or disconnects):

Semi-transparent dark overlay on the game
Centered panel, walnut style, amber/warning border
Title: "⚠️ [PlayerName] has gone inactive"
Body: "Vote to redistribute their cards equally among active players and continue the game."
Two buttons per active player:

"✓ Redistribute" — green
"✗ Wait" — gray


Live vote tally shown: "2 / 3 votes to redistribute"
If unanimous agree → disconnected player's cards animate distributing to other players (deal animation), toast notification: "[Name]'s cards have been distributed", game resumes
If any vote to wait → 30-second wait timer shown, then re-vote prompt
Disconnected player gets a "INACTIVE" badge on their panel while vote is pending


SCREEN 7: ROUND END / TURN TRANSITION
After bluff resolution or all-pass:

Brief overlay: "[PlayerName] starts the next round" with a pointing card animation
Active Rank Pill resets with a dissolve animation
round_win.mp3 plays for the winner


SCREEN 8: GAME OVER
When a player empties their hand:

Full screen takeover — confetti + gold particle explosion
game_win.mp3 fanfare
Winner card — large, centered: Crown icon 👑, player name in Playfair Display gold, "WINS THE GAME!"
Card count leaderboard below — all players ranked by cards remaining
Two buttons: "Play Again" (new game, same room) | "Leave Table"


BOT LOGIC
Bot players should play strategically:

If they have the active rank card(s): 70% chance they play them honestly
If they don't have the active rank: Play random cards but bluff convincingly (declare active rank)
Calling bluff: Bot calls bluff if the number of cards played seems statistically unlikely (e.g., if 3 kings have already been played and the player claims 2 more kings — only 4 kings in a deck). Bot tracks played cards mentally.
Passing: Bot passes if it has very few cards and doesn't want to risk picking up the pile
Bot thinking delay: Add a 1.5–2.5 second fake "thinking" delay before bot plays, with a subtle "..." animation on their panel — makes it feel human


MULTIPLAYER / REAL-TIME STATE
Use Firebase Realtime Database or Supabase for game state sync:
Game state object to sync in real-time:
json{
  "roomCode": "KQ7X2J",
  "players": [...],
  "hands": { "player1": [...], "player2": [...] },
  "pile": [...],
  "activeRank": "K",
  "currentTurn": "player2Id",
  "roundStartedBy": "player1Id",
  "passCount": 0,
  "lastPlay": { "playerId": "p1", "cardCount": 2 },
  "gamePhase": "playing | bluff_reveal | round_end | game_over",
  "votes": {}
}
Each player only receives their own hand contents — other hands are card-count only.

RESPONSIVE / MOBILE
On mobile:

Opponent panels collapse to smaller icon + count badges arranged in a top arc
Your hand scrolls horizontally at the bottom, cards larger and easier to tap
Action buttons are full-width, fixed at very bottom
Declaration popup becomes a bottom sheet
Pile stays centered, slightly smaller
All animations preserved — just scaled


TECHNICAL NOTES

All card animations should use CSS transforms (translateX, translateY, rotateY) for GPU-accelerated smooth 60fps
Sound effects: preload all audio assets on game start
Room codes: 6-char alphanumeric, collision-checked against active rooms
Deep link: yourdomain.com/room/[CODE] auto-joins and auto-fills code field
QR code: generated client-side using a QR library
Two-deck mode: automatically activates when player count ≥ 6 — 104 cards total, deal mechanics remain the same