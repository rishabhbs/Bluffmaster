import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import * as gameLogic from "./game-logic.tsx";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { verifyAuth, type AuthContext } from "./auth-middleware.tsx";
import { toPublicGameState } from "./state-sanitizer.tsx";

const app = new Hono();

// Create Supabase client for broadcasting
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Helper to broadcast game state updates via WebSocket
async function broadcastGameUpdate(roomCode: string, fullGameState: any) {
  try {
    const publicGameState = toPublicGameState(fullGameState);
    
    await supabase.channel(`room:${roomCode}`).send({
      type: 'broadcast',
      event: 'game_update',
      payload: { gameState: publicGameState },
    });
    console.log(`📡 Broadcasted game_update to room:${roomCode}`);
  } catch (error) {
    console.error('Error broadcasting game update:', error);
  }
}

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Auth middleware - verify JWT on all routes except health check
app.use('/make-server-2c8fcbf3/*', async (c, next) => {
  // Skip auth for health check
  if (c.req.path.endsWith('/health')) {
    return next();
  }

  try {
    const authHeader = c.req.header('Authorization');
    const authContext = await verifyAuth(authHeader);
    
    // Store auth context for use in route handlers
    c.set('authUid', authContext.authUid);
    
    return next();
  } catch (error: any) {
    console.error('Auth middleware error:', error.message);
    return c.json({ error: 'Unauthorized: ' + error.message }, 401);
  }
});

// Health check endpoint
app.get("/make-server-2c8fcbf3/health", (c) => {
  return c.json({ status: "ok" });
});

// Create a new room
app.post("/make-server-2c8fcbf3/rooms/create", async (c) => {
  try {
    const authUid = c.get('authUid') as string;
    const { roomCode, hostName, maxPlayers, botSlots, isPrivate } = await c.req.json();
    
    // Host player uses their authUid as player ID
    const players = [{
      id: authUid,
      authUid: authUid,
      name: hostName,
      isBot: false,
      isHost: true,
      cardCount: 0,
      isActive: true,
      lastSeen: Date.now(),
    }];
    
    // Add bot players for enabled bot slots
    botSlots.forEach((isBot: boolean, index: number) => {
      if (isBot) {
        const botId = `bot-${roomCode}-${index}`;
        players.push({
          id: botId,
          authUid: '', // Bots don't have authUid
          name: `Bot ${index + 1}`,
          isBot: true,
          isHost: false,
          cardCount: 0,
          isActive: true,
          lastSeen: Date.now(),
        });
      }
    });
    
    const gameState = {
      roomCode,
      stateVersion: 1,
      players,
      hands: {},
      pile: [],
      pileCount: 0,
      activeRank: null,
      currentTurn: '',
      roundStartedBy: '',
      passCount: 0,
      lastPlay: null,
      gamePhase: 'waiting',
      votes: {},
      inactivePlayerId: null,
      maxPlayers,
      winnerId: null,
      bluffCallerId: null,
      bluffResult: null,
      config: { maxPlayers, botSlots, isPrivate },
    };
    
    await kv.set(`room:${roomCode}`, gameState);
    await kv.set(`room:${roomCode}:active`, true);
    
    const publicGameState = toPublicGameState(gameState);
    return c.json({ success: true, gameState: publicGameState });
  } catch (error: any) {
    console.error('Error creating room:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Join a room
app.post("/make-server-2c8fcbf3/rooms/join", async (c) => {
  try {
    const authUid = c.get('authUid') as string;
    const { roomCode, playerName } = await c.req.json();
    
    const gameState = await kv.get(`room:${roomCode}`);
    if (!gameState) {
      return c.json({ error: 'Room not found' }, 404);
    }
    
    // Check if player already in room (rejoin scenario)
    const existingPlayer = gameState.players.find((p: any) => p.authUid === authUid);
    if (existingPlayer) {
      // Update name and mark as active
      existingPlayer.name = playerName;
      existingPlayer.isActive = true;
      existingPlayer.lastSeen = Date.now();
      
      await kv.set(`room:${roomCode}`, gameState);
      const publicGameState = toPublicGameState(gameState);
      return c.json({ success: true, gameState: publicGameState });
    }
    
    // Check if room is full
    const humanPlayers = gameState.players.filter((p: any) => !p.isBot);
    const botCount = gameState.config.botSlots.filter((b: boolean) => b).length;
    const maxHumanPlayers = gameState.config.maxPlayers - botCount;
    
    if (humanPlayers.length >= maxHumanPlayers) {
      return c.json({ error: 'Room is full' }, 400);
    }
    
    // Add new player
    gameState.players.push({
      id: authUid,
      authUid: authUid,
      name: playerName,
      isBot: false,
      isHost: false,
      cardCount: 0,
      isActive: true,
      lastSeen: Date.now(),
    });
    
    gameState.stateVersion++;
    await kv.set(`room:${roomCode}`, gameState);
    
    const publicGameState = toPublicGameState(gameState);
    return c.json({ success: true, gameState: publicGameState });
  } catch (error: any) {
    console.error('Error joining room:', error);
    return c.json({ error: error.message }, 500);
  }
});

// SECURE: Get room state + my hand in ONE call
app.get("/make-server-2c8fcbf3/rooms/:roomCode/state", async (c) => {
  try {
    const authUid = c.get('authUid') as string;
    const roomCode = c.req.param('roomCode');
    const gameState = await kv.get(`room:${roomCode}`);
    
    if (!gameState) {
      return c.json({ error: 'Room not found' }, 404);
    }
    
    // Get this player's hand (only their own)
    const myHand = gameState.hands[authUid] || [];
    
    // Return public game state + my hand
    const publicGameState = toPublicGameState(gameState);
    return c.json({ gameState: publicGameState, myHand });
  } catch (error: any) {
    console.error('Error getting room state:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Legacy endpoint - kept for backward compatibility but secured
app.get("/make-server-2c8fcbf3/rooms/:roomCode", async (c) => {
  try {
    const roomCode = c.req.param('roomCode');
    const gameState = await kv.get(`room:${roomCode}`);
    
    if (!gameState) {
      return c.json({ error: 'Room not found' }, 404);
    }
    
    const publicGameState = toPublicGameState(gameState);
    return c.json({ gameState: publicGameState });
  } catch (error: any) {
    console.error('Error getting room:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Start game
app.post("/make-server-2c8fcbf3/rooms/:roomCode/start", async (c) => {
  try {
    const authUid = c.get('authUid') as string;
    const roomCode = c.req.param('roomCode');
    const gameState = await kv.get(`room:${roomCode}`);
    
    if (!gameState) {
      return c.json({ error: 'Room not found' }, 404);
    }
    
    // Verify caller is the host
    const caller = gameState.players.find((p: any) => p.authUid === authUid);
    if (!caller || !caller.isHost) {
      return c.json({ error: 'Only the host can start the game' }, 403);
    }
    
    // Create and shuffle deck
    const deckCount = gameState.maxPlayers >= 6 ? 2 : 1;
    let deck = gameLogic.createDeck(deckCount);
    deck = gameLogic.shuffleDeck(deck);
    
    // Deal cards
    const playerIds = gameState.players.map((p: any) => p.id);
    gameState.hands = gameLogic.dealCards(deck, playerIds);
    
    // Update card counts
    gameState.players.forEach((player: any) => {
      player.cardCount = gameState.hands[player.id]?.length || 0;
    });
    
    // Set first player
    gameState.currentTurn = playerIds[0];
    gameState.roundStartedBy = playerIds[0];
    gameState.gamePhase = 'playing';
    gameState.pile = [];
    gameState.pileCount = 0;
    gameState.activeRank = null;
    gameState.passCount = 0;
    gameState.lastPlay = null;
    gameState.stateVersion++;
    
    await kv.set(`room:${roomCode}`, gameState);
    
    // Broadcast to all players
    await broadcastGameUpdate(roomCode, gameState);
    
    const publicGameState = toPublicGameState(gameState);
    return c.json({ success: true, gameState: publicGameState });
  } catch (error: any) {
    console.error('Error starting game:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Play cards
app.post("/make-server-2c8fcbf3/rooms/:roomCode/play", async (c) => {
  try {
    const authUid = c.get('authUid') as string;
    const roomCode = c.req.param('roomCode');
    const { cardIds, declaredRank, expectedVersion } = await c.req.json();
    
    const gameState = await kv.get(`room:${roomCode}`);
    if (!gameState) {
      return c.json({ error: 'Room not found' }, 404);
    }
    
    // Validate stateVersion
    if (expectedVersion !== undefined && expectedVersion !== gameState.stateVersion) {
      console.log(`Version mismatch: expected ${expectedVersion}, got ${gameState.stateVersion}`);
      const publicGameState = toPublicGameState(gameState);
      return c.json({ 
        error: 'State version mismatch', 
        gameState: publicGameState 
      }, 409);
    }
    
    // Validate it's this player's turn
    if (gameState.currentTurn !== authUid) {
      return c.json({ error: 'Not your turn' }, 400);
    }
    
    // Validate game phase
    if (gameState.gamePhase !== 'playing') {
      return c.json({ error: 'Game is not in playing phase' }, 400);
    }
    
    const hand = gameState.hands[authUid] || [];
    
    // Validate cards exist in player's hand
    const playedCards = hand.filter((card: any) => cardIds.includes(card.id));
    if (playedCards.length !== cardIds.length) {
      return c.json({ error: 'Invalid cards' }, 400);
    }
    
    // Remove cards from hand
    gameState.hands[authUid] = hand.filter((card: any) => !cardIds.includes(card.id));
    
    // Add to pile
    gameState.pile.push(...playedCards);
    gameState.pileCount = gameState.pile.length;
    
    // Update game state
    if (!gameState.activeRank) {
      gameState.activeRank = declaredRank;
      gameState.roundStartedBy = authUid;
    }
    
    const player = gameState.players.find((p: any) => p.id === authUid);
    gameState.lastPlay = {
      playerId: authUid,
      playerName: player?.name || 'Unknown',
      cardCount: playedCards.length,
      declaredRank,
      actualCards: playedCards,
    };
    
    gameState.passCount = 0;
    
    // Update card count
    const playerObj = gameState.players.find((p: any) => p.id === authUid);
    if (playerObj) {
      playerObj.cardCount = gameState.hands[authUid].length;
      
      // Check for winner
      if (playerObj.cardCount === 0) {
        gameState.gamePhase = 'game_over';
        gameState.winnerId = authUid;
        gameState.stateVersion++;
        await kv.set(`room:${roomCode}`, gameState);
        await broadcastGameUpdate(roomCode, gameState);
        
        const publicGameState = toPublicGameState(gameState);
        return c.json({ success: true, gameState: publicGameState });
      }
    }
    
    // Move to next player
    gameState.currentTurn = gameLogic.getNextPlayer(authUid, gameState.players);
    gameState.stateVersion++;
    
    await kv.set(`room:${roomCode}`, gameState);
    await broadcastGameUpdate(roomCode, gameState);
    
    const publicGameState = toPublicGameState(gameState);
    return c.json({ success: true, gameState: publicGameState });
  } catch (error: any) {
    console.error('Error playing cards:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Call bluff
app.post("/make-server-2c8fcbf3/rooms/:roomCode/bluff", async (c) => {
  try {
    const authUid = c.get('authUid') as string;
    const roomCode = c.req.param('roomCode');
    const { expectedVersion } = await c.req.json();
    
    const gameState = await kv.get(`room:${roomCode}`);
    if (!gameState) {
      return c.json({ error: 'Room not found' }, 404);
    }
    
    // Validate stateVersion
    if (expectedVersion !== undefined && expectedVersion !== gameState.stateVersion) {
      const publicGameState = toPublicGameState(gameState);
      return c.json({ 
        error: 'State version mismatch', 
        gameState: publicGameState 
      }, 409);
    }
    
    // Validate it's this player's turn
    if (gameState.currentTurn !== authUid) {
      return c.json({ error: 'Not your turn' }, 400);
    }
    
    if (!gameState.lastPlay) {
      return c.json({ error: 'No cards to call bluff on' }, 400);
    }
    
    const { actualCards, declaredRank, playerId: liarId } = gameState.lastPlay;
    
    // Check if all cards match declared rank
    const wasBluffing = !actualCards.every((card: any) => card.rank === declaredRank);
    const loserPlayerId = wasBluffing ? liarId : authUid;
    
    gameState.bluffCallerId = authUid;
    gameState.bluffResult = {
      wasBluffing,
      loserPlayerId,
      cards: actualCards,
    };
    gameState.gamePhase = 'bluff_reveal';
    gameState.stateVersion++;
    
    await kv.set(`room:${roomCode}`, gameState);
    await broadcastGameUpdate(roomCode, gameState);
    
    const publicGameState = toPublicGameState(gameState);
    return c.json({ success: true, gameState: publicGameState });
  } catch (error: any) {
    console.error('Error calling bluff:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Resolve bluff
app.post("/make-server-2c8fcbf3/rooms/:roomCode/resolve-bluff", async (c) => {
  try {
    const roomCode = c.req.param('roomCode');
    const gameState = await kv.get(`room:${roomCode}`);
    
    if (!gameState || !gameState.bluffResult) {
      return c.json({ error: 'No bluff to resolve' }, 400);
    }
    
    const { loserPlayerId, wasBluffing } = gameState.bluffResult;
    const callerId = gameState.bluffCallerId;
    const liarId = gameState.lastPlay?.playerId;
    
    // Loser picks up the pile
    gameState.hands[loserPlayerId] = [
      ...(gameState.hands[loserPlayerId] || []),
      ...gameState.pile,
    ];
    
    // Update card count
    const loserPlayer = gameState.players.find((p: any) => p.id === loserPlayerId);
    if (loserPlayer) {
      loserPlayer.cardCount = gameState.hands[loserPlayerId].length;
    }
    
    // Winner of the bluff resolution starts the next round
    const winnerPlayerId = wasBluffing ? callerId : liarId;
    
    // Reset for new round
    gameState.pile = [];
    gameState.pileCount = 0;
    gameState.activeRank = null;
    gameState.lastPlay = null;
    gameState.passCount = 0;
    gameState.currentTurn = winnerPlayerId;
    gameState.roundStartedBy = winnerPlayerId;
    gameState.gamePhase = 'playing';
    gameState.bluffCallerId = null;
    gameState.bluffResult = null;
    gameState.stateVersion++;
    
    await kv.set(`room:${roomCode}`, gameState);
    await broadcastGameUpdate(roomCode, gameState);
    
    const publicGameState = toPublicGameState(gameState);
    return c.json({ success: true, gameState: publicGameState });
  } catch (error: any) {
    console.error('Error resolving bluff:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Pass turn
app.post("/make-server-2c8fcbf3/rooms/:roomCode/pass", async (c) => {
  try {
    const authUid = c.get('authUid') as string;
    const roomCode = c.req.param('roomCode');
    const { expectedVersion } = await c.req.json();
    
    const gameState = await kv.get(`room:${roomCode}`);
    if (!gameState) {
      return c.json({ error: 'Room not found' }, 404);
    }
    
    // Validate stateVersion
    if (expectedVersion !== undefined && expectedVersion !== gameState.stateVersion) {
      const publicGameState = toPublicGameState(gameState);
      return c.json({ 
        error: 'State version mismatch', 
        gameState: publicGameState 
      }, 409);
    }
    
    // Validate it's this player's turn
    if (gameState.currentTurn !== authUid) {
      return c.json({ error: 'Not your turn' }, 400);
    }
    
    gameState.passCount++;
    
    // If all players except round starter passed, round starter wins
    const activePlayers = gameState.players.filter((p: any) => p.isActive);
    if (gameState.passCount >= activePlayers.length - 1) {
      // Round starter wins, start new round
      gameState.pile = [];
      gameState.pileCount = 0;
      gameState.activeRank = null;
      gameState.lastPlay = null;
      gameState.passCount = 0;
      gameState.currentTurn = gameState.roundStartedBy;
      gameState.gamePhase = 'round_end';
      gameState.stateVersion++;
      
      await kv.set(`room:${roomCode}`, gameState);
      await broadcastGameUpdate(roomCode, gameState);
      
      const publicGameState = toPublicGameState(gameState);
      return c.json({ success: true, gameState: publicGameState });
    }
    
    // Move to next player
    gameState.currentTurn = gameLogic.getNextPlayer(authUid, gameState.players);
    gameState.stateVersion++;
    
    await kv.set(`room:${roomCode}`, gameState);
    await broadcastGameUpdate(roomCode, gameState);
    
    const publicGameState = toPublicGameState(gameState);
    return c.json({ success: true, gameState: publicGameState });
  } catch (error: any) {
    console.error('Error passing turn:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Bot turn
app.post("/make-server-2c8fcbf3/rooms/:roomCode/bot-turn", async (c) => {
  try {
    const roomCode = c.req.param('roomCode');
    const { botId } = await c.req.json();
    
    const gameState = await kv.get(`room:${roomCode}`);
    if (!gameState) {
      return c.json({ error: 'Room not found' }, 404);
    }
    
    // Decide if bot should call bluff
    if (gameState.lastPlay && gameState.lastPlay.playerId !== botId) {
      const shouldCall = gameLogic.shouldCallBluff(gameState, botId);
      if (shouldCall) {
        // Bot calls bluff
        const { actualCards, declaredRank, playerId: liarId } = gameState.lastPlay;
        const wasBluffing = !actualCards.every((card: any) => card.rank === declaredRank);
        const loserPlayerId = wasBluffing ? liarId : botId;
        
        gameState.bluffCallerId = botId;
        gameState.bluffResult = {
          wasBluffing,
          loserPlayerId,
          cards: actualCards,
        };
        gameState.gamePhase = 'bluff_reveal';
        gameState.stateVersion++;
        
        await kv.set(`room:${roomCode}`, gameState);
        await broadcastGameUpdate(roomCode, gameState);
        
        const publicGameState = toPublicGameState(gameState);
        return c.json({ success: true, gameState: publicGameState, action: 'bluff' });
      }
    }
    
    // Bot decides to play or pass
    const botHand = gameState.hands[botId] || [];
    const shouldPass = botHand.length <= 2 && gameState.activeRank && Math.random() > 0.6;
    
    if (shouldPass && gameState.roundStartedBy !== botId) {
      // Bot passes
      gameState.passCount++;
      const activePlayers = gameState.players.filter((p: any) => p.isActive);
      
      if (gameState.passCount >= activePlayers.length - 1) {
        gameState.pile = [];
        gameState.pileCount = 0;
        gameState.activeRank = null;
        gameState.lastPlay = null;
        gameState.passCount = 0;
        gameState.currentTurn = gameState.roundStartedBy;
        gameState.gamePhase = 'round_end';
      } else {
        gameState.currentTurn = gameLogic.getNextPlayer(botId, gameState.players);
      }
      
      gameState.stateVersion++;
      await kv.set(`room:${roomCode}`, gameState);
      await broadcastGameUpdate(roomCode, gameState);
      
      const publicGameState = toPublicGameState(gameState);
      return c.json({ success: true, gameState: publicGameState, action: 'pass' });
    }
    
    // Bot plays cards
    const { cardIds, declaredRank } = gameLogic.chooseBotPlay(gameState, botId);
    
    if (cardIds.length === 0) {
      // Bot has no cards or can't play, pass
      gameState.passCount++;
      gameState.currentTurn = gameLogic.getNextPlayer(botId, gameState.players);
      gameState.stateVersion++;
      await kv.set(`room:${roomCode}`, gameState);
      await broadcastGameUpdate(roomCode, gameState);
      
      const publicGameState = toPublicGameState(gameState);
      return c.json({ success: true, gameState: publicGameState, action: 'pass' });
    }
    
    const hand = gameState.hands[botId] || [];
    const playedCards = hand.filter((card: any) => cardIds.includes(card.id));
    
    gameState.hands[botId] = hand.filter((card: any) => !cardIds.includes(card.id));
    gameState.pile.push(...playedCards);
    gameState.pileCount = gameState.pile.length;
    
    if (!gameState.activeRank) {
      gameState.activeRank = declaredRank;
      gameState.roundStartedBy = botId;
    }
    
    const bot = gameState.players.find((p: any) => p.id === botId);
    gameState.lastPlay = {
      playerId: botId,
      playerName: bot?.name || 'Bot',
      cardCount: playedCards.length,
      declaredRank,
      actualCards: playedCards,
    };
    
    gameState.passCount = 0;
    
    if (bot) {
      bot.cardCount = gameState.hands[botId].length;
      
      if (bot.cardCount === 0) {
        gameState.gamePhase = 'game_over';
        gameState.winnerId = botId;
        gameState.stateVersion++;
        await kv.set(`room:${roomCode}`, gameState);
        await broadcastGameUpdate(roomCode, gameState);
        
        const publicGameState = toPublicGameState(gameState);
        return c.json({ success: true, gameState: publicGameState, action: 'play' });
      }
    }
    
    gameState.currentTurn = gameLogic.getNextPlayer(botId, gameState.players);
    gameState.stateVersion++;
    
    await kv.set(`room:${roomCode}`, gameState);
    await broadcastGameUpdate(roomCode, gameState);
    
    const publicGameState = toPublicGameState(gameState);
    return c.json({ success: true, gameState: publicGameState, action: 'play' });
  } catch (error: any) {
    console.error('Error in bot turn:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Update player activity
app.post("/make-server-2c8fcbf3/rooms/:roomCode/heartbeat", async (c) => {
  try {
    const authUid = c.get('authUid') as string;
    const roomCode = c.req.param('roomCode');
    
    const gameState = await kv.get(`room:${roomCode}`);
    if (!gameState) {
      return c.json({ error: 'Room not found' }, 404);
    }
    
    const player = gameState.players.find((p: any) => p.authUid === authUid);
    if (player) {
      player.lastSeen = Date.now();
    }
    
    // Auto-transition round_end back to playing
    if (gameState.gamePhase === 'round_end') {
      gameState.gamePhase = 'playing';
    }
    
    await kv.set(`room:${roomCode}`, gameState);
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error updating heartbeat:', error);
    return c.json({ error: error.message }, 500);
  }
});

Deno.serve(app.fetch);