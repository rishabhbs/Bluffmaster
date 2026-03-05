# BLUFF - Multiplayer Card Game

A fully functional multiplayer browser-based card game where players try to get rid of all their cards by playing face-down and bluffing (or not) about what they played.

## Features

### Complete Gameplay
- **Multiplayer Support**: 3-8 players (human + bots)
- **Real-time Synchronization**: All game state synced via Supabase backend
- **Bot Players**: AI-powered bots with strategic gameplay
- **Multiple Decks**: Automatically uses 2 decks for 6+ players

### Game Screens
1. **Landing Page**: Animated cards background, create/join options, rules modal
2. **Create Room**: Configure player count, bot slots, room privacy
3. **Join Room**: Enter code or use shareable links
4. **Lobby**: QR code sharing, player list, host controls
5. **Game Screen**: Full card game with animations and effects
6. **Game Over**: Winner celebration with confetti

### Visual Design
- **Windows 95/Casino Aesthetic**: Nostalgic retro gaming feel
- **Custom Color Palette**: Deep green felt table, burgundy cards, gold accents
- **Typography**: 
  - Playfair Display (headings)
  - Courier Prime (UI labels)
  - Roboto Condensed (buttons)
  - Libre Baskerville (cards)

### Animations
- Card dealing animation at game start
- Card playing with arc motion
- Bluff reveal with card flip animations
- Confetti and particles on game win
- Smooth transitions throughout

### Technical Features
- **Real-time Backend**: Supabase with custom server endpoints
- **Bot AI**: Strategic decision-making for calling bluffs and playing cards
- **Room Codes**: 6-character alphanumeric codes
- **QR Code Generation**: Easy mobile joining
- **Heartbeat System**: Player activity monitoring
- **Responsive Design**: Works on desktop and mobile

## Game Rules

### Objective
Be the first player to get rid of all your cards.

### Gameplay
1. Each player is dealt cards from a shuffled deck
2. First player chooses a rank (e.g., "Kings") and plays 1-4 cards face-down
3. All subsequent plays in that round must declare the same rank
4. Players can play honestly OR bluff by playing different ranks
5. On your turn: PLAY cards, PASS (if not round starter), or CALL BLUFF

### Calling Bluff
- If you think the previous player lied, call BLUFF!
- Cards are revealed
- If they lied: They pick up the entire pile
- If they were honest: YOU pick up the pile
- Loser starts the next round with a new rank

### Winning
First player to empty their hand wins!

## Audio System

The game includes a complete placeholder audio system. Add your audio files to `/public/sounds/`:

- card_deal.mp3
- card_select.mp3
- card_place.mp3
- card_flip.mp3
- bluff_correct.mp3
- bluff_wrong.mp3
- pickup_pile.mp3
- pass.mp3
- round_win.mp3
- game_win.mp3
- room_join.mp3
- disconnect_alert.mp3
- vote_cast.mp3

The game will work without audio files - sounds will simply be skipped.

## Architecture

### Frontend
- React with TypeScript
- React Router for navigation
- Motion/React for animations
- Tailwind CSS for styling
- Real-time polling for game state updates

### Backend
- Supabase Edge Functions (Hono server)
- Key-Value store for game state persistence
- RESTful API endpoints for all game actions
- Bot turn processing on server-side

### Game State Management
All game state is stored server-side and synchronized to clients:
- Player hands (private)
- Card pile
- Current turn
- Active rank
- Bluff status
- Vote tracking

## How to Play

1. **Create a Room**:
   - Enter your name
   - Select number of players (3-8)
   - Toggle bot slots as needed
   - Choose public or private room

2. **Share Room Code**:
   - Copy the 6-character code
   - Share the link
   - Scan QR code on mobile

3. **Wait in Lobby**:
   - Players join via code
   - Host can start when ready (minimum 3 players)

4. **Play the Game**:
   - Select cards from your hand
   - Declare what rank you're playing
   - Call bluff if you think someone is lying
   - Pass if you don't want to play

5. **Win**:
   - First to empty your hand wins!

## Bot Behavior

Bots use strategic AI:
- **Playing**: 70% chance to play honestly if they have the cards
- **Bluffing**: Will bluff with random cards if needed
- **Calling Bluff**: Calculates probability based on cards in pile
- **Passing**: May pass strategically when hand is low
- **Thinking Delay**: 1.5-2.5 seconds to feel human-like

## Development Notes

- Server runs on Supabase Edge Functions
- Frontend polls game state every 1 second
- Player hands updated every 2 seconds
- Heartbeat sent every 5 seconds
- All game logic validated server-side
- Bot turns processed automatically with realistic delays

## Credits

Built with Figma Make - A complete, production-ready multiplayer card game experience.
